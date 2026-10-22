using System.Globalization;
using System.Text;

namespace agot_bg_website.Services.Statistics;

/// <summary>A SQL statement using <c>{0}</c>-style placeholders plus the matching values, ready for <c>Database.SqlQueryRaw</c>.</summary>
public sealed record StatisticsSqlQuery(string Sql, object[] Parameters);

/// <summary>
/// Builds the raw SQL for the global statistics page. The ViewOfGame/Data columns are JSON
/// documents EF cannot translate paths on, hence raw SQL. Safety rule: every value that depends on
/// the request (setup id, house id, setting key, round bounds, paging) is a <c>{n}</c> placeholder
/// that EF turns into a database parameter - SQL text only ever contains fixed fragments from
/// this class. Setting keys additionally come from <see cref="StatisticsSettingGroups"/> only.
/// Never touches "SerializedGame".
/// </summary>
public static class GameStatisticsSql
{
    private const string Settings = "g.\"ViewOfGame\"->'settings'";

    private const string RoundExpression =
        "CASE WHEN jsonb_typeof(g.\"ViewOfGame\"->'turn') = 'number' "
        + "THEN (g.\"ViewOfGame\"->>'turn')::numeric END";

    private const string WinnerRowCondition = "p.\"Data\"->>'is_winner' = 'true'";

    public static StatisticsSqlQuery Summary(GameStatisticsFilter filter)
    {
        var parameters = new List<object>();
        var cte = FilteredGames(filter, parameters);
        var sql =
            cte
            + """
                SELECT count(*)::int AS "FinishedGames",
                       avg(round)::float8 AS "AverageRound",
                       (count(*) FILTER (WHERE NOT has_winner))::int AS "UnknownWinnerGames"
                FROM filtered
                """;
        return new(sql, [.. parameters]);
    }

    /// <summary>Seats (human PlayersInGame rows) and wins per house, only over games with a known winner.</summary>
    public static StatisticsSqlQuery Houses(GameStatisticsFilter filter)
    {
        var parameters = new List<object>();
        var cte = FilteredGames(filter, parameters);
        var sql =
            cte
            + $"""
                SELECT p."Data"->>'house' AS "House",
                       count(*)::int AS "Seats",
                       (count(*) FILTER (WHERE {WinnerRowCondition}))::int AS "Wins"
                FROM filtered f
                JOIN "PlayersInGame" p ON p."GameId" = f."Id"
                WHERE f.has_winner AND p."Data"->>'house' IS NOT NULL
                GROUP BY p."Data"->>'house'
                """;
        return new(sql, [.. parameters]);
    }

    /// <summary>
    /// One page of the newest matching games. Faceless games lose their winner's user inside SQL,
    /// so it never reaches the page model.
    /// </summary>
    public static StatisticsSqlQuery Latest(GameStatisticsFilter filter, int offset, int limit)
    {
        var parameters = new List<object>();
        var cte = FilteredGames(filter, parameters, includeWinnerFlag: false);
        var offsetPlaceholder = AddParameter(parameters, offset);
        var limitPlaceholder = AddParameter(parameters, limit);
        var sql =
            cte
            + $"""
                SELECT f."Id" AS "Id",
                       f."Name" AS "Name",
                       f.setup_id AS "SetupId",
                       f.player_count AS "PlayerCount",
                       f.is_pbem AS "IsPbem",
                       f.round::int AS "Round",
                       f."LastActiveAt" AS "FinishedAt",
                       w.house AS "WinnerHouse",
                       CASE WHEN f.faceless THEN NULL ELSE w."UserId" END AS "WinnerUserId",
                       CASE WHEN f.faceless THEN NULL ELSE u."UserName" END AS "WinnerUserName",
                       CASE WHEN f.faceless THEN false ELSE COALESCE(u."IsDeleted", false) END AS "WinnerUserDeleted"
                FROM filtered f
                LEFT JOIN LATERAL (
                    SELECT p."UserId", p."Data"->>'house' AS house
                    FROM "PlayersInGame" p
                    WHERE p."GameId" = f."Id" AND {WinnerRowCondition}
                    LIMIT 1
                ) w ON true
                LEFT JOIN "AspNetUsers" u ON u."Id" = w."UserId"
                ORDER BY f."LastActiveAt" DESC, f."Id"
                OFFSET {offsetPlaceholder} LIMIT {limitPlaceholder}
                """;
        return new(sql, [.. parameters]);
    }

    /// <summary>The shared "WITH filtered AS (...)" prefix: finished, non-tutorial games matching the filter.</summary>
    internal static string FilteredGames(
        GameStatisticsFilter filter,
        List<object> parameters,
        bool includeWinnerFlag = true
    )
    {
        var where = new List<string> { "g.\"State\" = 'Finished'" };

        if (filter.SetupId is null)
        {
            where.Add(
                $"{Settings}->>'setupId' IS DISTINCT FROM {AddParameter(parameters, ScenarioCatalog.TutorialSetupId)}"
            );
        }
        else
        {
            where.Add($"{Settings}->>'setupId' = {AddParameter(parameters, filter.SetupId)}");
            where.Add(
                $"{Settings}->>'playerCount' = {AddParameter(parameters, filter.PlayerCount!.Value.ToString(CultureInfo.InvariantCulture))}"
            );
        }

        switch (filter.GameType)
        {
            case GameTypeFilter.Pbem:
                where.Add(BooleanSettingIsTrue(AddParameter(parameters, "pbem")));
                break;
            case GameTypeFilter.Live:
                where.Add($"NOT {BooleanSettingIsTrue(AddParameter(parameters, "pbem"))}");
                break;
        }

        if (filter.MinRound is { } minRound)
        {
            where.Add($"{RoundExpression} >= {AddParameter(parameters, minRound)}");
        }

        if (filter.MaxRound is { } maxRound)
        {
            where.Add($"{RoundExpression} <= {AddParameter(parameters, maxRound)}");
        }

        if (filter.HumanSeats is { } humanSeats)
        {
            where.Add(
                "(SELECT count(*) FROM \"PlayersInGame\" hp "
                    + "WHERE hp.\"GameId\" = g.\"Id\" AND hp.\"Data\"->>'house' IS NOT NULL) "
                    + $"= {AddParameter(parameters, humanSeats)}"
            );
        }

        foreach (var (key, expected) in filter.Settings)
        {
            if (!StatisticsSettingGroups.IsAllowed(key))
            {
                continue;
            }

            var isTrue = BooleanSettingIsTrue(AddParameter(parameters, key));
            where.Add(expected ? isTrue : $"NOT {isTrue}");
        }

        var columns = new List<string>
        {
            "g.\"Id\"",
            "g.\"Name\"",
            "g.\"LastActiveAt\"",
            $"{Settings}->>'setupId' AS setup_id",
            $"{Settings}->>'playerCount' AS player_count",
            $"{RoundExpression} AS round",
            $"COALESCE({Settings}->>'pbem', 'false') = 'true' AS is_pbem",
            $"COALESCE({Settings}->>'faceless', 'false') = 'true' AS faceless",
        };
        if (includeWinnerFlag)
        {
            columns.Add(
                "EXISTS (SELECT 1 FROM \"PlayersInGame\" p WHERE p.\"GameId\" = g.\"Id\" "
                    + $"AND {WinnerRowCondition}) AS has_winner"
            );
        }

        var sql = new StringBuilder();
        sql.AppendLine("WITH filtered AS (");
        sql.AppendLine("  SELECT " + string.Join(",\n         ", columns));
        sql.AppendLine("  FROM \"Games\" g");
        sql.AppendLine("  WHERE " + string.Join("\n    AND ", where));
        sql.AppendLine(")");
        return sql.ToString();
    }

    /// <summary>A boolean setting counts as true only when stored as true; missing == false, like in the game server.</summary>
    private static string BooleanSettingIsTrue(string keyPlaceholder) =>
        $"COALESCE({Settings}->>{keyPlaceholder}, 'false') = 'true'";

    private static string AddParameter(List<object> parameters, object value)
    {
        parameters.Add(value);
        return "{" + (parameters.Count - 1).ToString(CultureInfo.InvariantCulture) + "}";
    }
}
