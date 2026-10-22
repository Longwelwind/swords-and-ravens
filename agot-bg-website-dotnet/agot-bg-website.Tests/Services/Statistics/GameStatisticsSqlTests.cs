using agot_bg_website.Services.Statistics;
using Xunit;

namespace agot_bg_website.Tests.Services.Statistics;

public class GameStatisticsSqlTests
{
    private static readonly GameStatisticsFilter Default = GameStatisticsFilter.Default;

    [Fact]
    public void Queries_NeverTouchSerializedGame_AndAreFullyParameterized()
    {
        var queries = new[]
        {
            GameStatisticsSql.Summary(Default),
            GameStatisticsSql.Houses(Default),
            GameStatisticsSql.Latest(Default, 50, 25),
        };

        foreach (var query in queries)
        {
            Assert.DoesNotContain("SerializedGame", query.Sql);
            Assert.DoesNotContain("base-game", query.Sql);
            Assert.Contains("{0}", query.Sql);
        }

        Assert.Equal(["base-game", "6"], GameStatisticsSql.Summary(Default).Parameters);
        Assert.Equal(["base-game", "6", 50, 25], queries[2].Parameters);
    }

    [Fact]
    public void RequestDerivedValues_AreParametersNeverSqlText()
    {
        // Built by hand (bypassing Parse) to prove that even a hostile value can't reach the SQL text.
        var hostile = "x'; DROP TABLE \"Games\"; --";
        var filter = new GameStatisticsFilter(
            hostile,
            6,
            GameTypeFilter.Pbem,
            3,
            9,
            [KeyValuePair.Create("vassals", true)],
            null
        );

        var query = GameStatisticsSql.Houses(filter);

        Assert.DoesNotContain("DROP", query.Sql);
        Assert.DoesNotContain("vassals", query.Sql);
        Assert.Contains(hostile, query.Parameters);
        Assert.Contains("vassals", query.Parameters);
        Assert.Contains(3, query.Parameters);
        Assert.Contains(9, query.Parameters);
    }

    [Fact]
    public void LegacyWinningHouseParameterDoesNotFilterTheChart()
    {
        var filter = GameStatisticsFilter.Parse(key => key == "house" ? "stark" : null);

        var query = GameStatisticsSql.Houses(filter);

        Assert.DoesNotContain("p.\"Data\"->>'house' =", query.Sql);
        Assert.DoesNotContain("stark", query.Parameters);
    }

    [Fact]
    public void SettingKeysOutsideTheAllowList_AreDropped()
    {
        var filter = Default with
        {
            Settings =
            [
                KeyValuePair.Create("setupId", true),
                KeyValuePair.Create("vassals", false),
            ],
        };

        var query = GameStatisticsSql.Summary(filter);

        Assert.DoesNotContain("setupId", query.Parameters);
        Assert.Contains("vassals", query.Parameters);
    }

    [Fact]
    public void SettingNo_MatchesMissingOrFalse_AndYesOnlyTrue()
    {
        var yes = GameStatisticsSql.Summary(
            Default with
            {
                Settings = [KeyValuePair.Create("vassals", true)],
            }
        );
        var no = GameStatisticsSql.Summary(
            Default with
            {
                Settings = [KeyValuePair.Create("vassals", false)],
            }
        );

        Assert.Contains(
            "AND COALESCE(g.\"ViewOfGame\"->'settings'->>{2}, 'false') = 'true'",
            yes.Sql
        );
        Assert.Contains(
            "AND NOT COALESCE(g.\"ViewOfGame\"->'settings'->>{2}, 'false') = 'true'",
            no.Sql
        );
    }

    [Fact]
    public void HumanSeats_FiltersByCurrentPlayerRowsWithAHouse()
    {
        var filter = Default with { HumanSeats = 8 };

        var query = GameStatisticsSql.Summary(filter);

        Assert.Contains(
            "(SELECT count(*) FROM \"PlayersInGame\" hp WHERE hp.\"GameId\" = g.\"Id\" AND hp.\"Data\"->>'house' IS NOT NULL) = {2}",
            query.Sql
        );
        Assert.Equal(["base-game", "6", 8], query.Parameters);
    }

    [Fact]
    public void AllScenarios_ExcludesTheTutorialInSql()
    {
        var query = GameStatisticsSql.Summary(Default with { SetupId = null, PlayerCount = null });

        Assert.Contains("IS DISTINCT FROM {0}", query.Sql);
        Assert.Equal([ScenarioCatalog.TutorialSetupId], query.Parameters);
    }
}
