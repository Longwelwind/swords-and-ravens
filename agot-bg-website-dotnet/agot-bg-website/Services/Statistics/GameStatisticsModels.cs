namespace agot_bg_website.Services.Statistics;

// Raw SQL result rows (property names match the quoted column aliases in GameStatisticsSql).

public sealed class StatisticsSummaryRow
{
    public int FinishedGames { get; set; }
    public double? AverageRound { get; set; }
    public int UnknownWinnerGames { get; set; }
}

public sealed class StatisticsHouseRow
{
    public string House { get; set; } = "";
    public int Seats { get; set; }
    public int Wins { get; set; }
}

public sealed class StatisticsLatestRow
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? SetupId { get; set; }
    public string? PlayerCount { get; set; }
    public bool IsPbem { get; set; }
    public int? Round { get; set; }
    public DateTimeOffset FinishedAt { get; set; }
    public string? WinnerHouse { get; set; }
    public Guid? WinnerUserId { get; set; }
    public string? WinnerUserName { get; set; }
    public bool WinnerUserDeleted { get; set; }
}

// Shaped results shown on the page.

/// <param name="WinRate">wins / seats (0..1), null when the house had no human seat.</param>
public sealed record HouseStatistic(
    string HouseId,
    string Name,
    string Color,
    int Seats,
    int Wins,
    double? WinRate,
    bool IsTop
);

/// <param name="DecidedGames">Games with a recorded winner - the basis of every win rate.</param>
/// <param name="EvenSplitRate">The win rate every house would have if wins were spread evenly:
/// decided games / human seats in decided games.</param>
/// <param name="ChartMaxRate">Win rate the tallest possible bar stands for (bars scale to it).</param>
public sealed record GameStatisticsOverview(
    int FinishedGames,
    double? AverageRound,
    int UnknownWinnerGames,
    int DecidedGames,
    int TotalSeats,
    double? EvenSplitRate,
    double ChartMaxRate,
    IReadOnlyList<HouseStatistic> Houses,
    HouseStatistic? MostWins
);

public sealed record LatestGame(
    Guid Id,
    string? Name,
    string ScenarioLabel,
    bool IsPbem,
    int? Round,
    DateTimeOffset FinishedAt,
    string? WinnerHouseId,
    string? WinnerHouseName,
    Guid? WinnerUserId,
    string? WinnerUserName
);

public static class GameStatisticsShaper
{
    private const double ChartStep = 0.05;
    private const double MinChartMax = 0.1;

    public static GameStatisticsOverview ShapeOverview(
        GameStatisticsFilter filter,
        StatisticsSummaryRow summary,
        IReadOnlyCollection<StatisticsHouseRow> houseRows,
        ScenarioCatalog catalog
    )
    {
        var rowsByHouse = houseRows
            .Where(r => catalog.GetHouse(r.House) is not null)
            .GroupBy(r => r.House)
            .ToDictionary(g => g.Key, g => (Seats: g.Sum(r => r.Seats), Wins: g.Sum(r => r.Wins)));

        // A chosen scenario always shows all of its houses (unplayed ones greyed out); "all
        // scenarios" only the houses that actually have seats.
        var houses = (
            filter.AllScenarios
                ? catalog.Houses.Where(h => rowsByHouse.ContainsKey(h.Id))
                : filter.AvailableHouses(catalog)
        ).ToList();

        var totalSeats = houses.Sum(h => rowsByHouse.GetValueOrDefault(h.Id).Seats);
        var decided = Math.Max(0, summary.FinishedGames - summary.UnknownWinnerGames);
        double? evenSplit = totalSeats > 0 ? (double)decided / totalSeats : null;

        var stats = houses
            .Select(h =>
            {
                var (seats, wins) = rowsByHouse.GetValueOrDefault(h.Id);
                return new HouseStatistic(
                    h.Id,
                    h.Name,
                    h.Color,
                    seats,
                    wins,
                    seats > 0 ? (double)wins / seats : null,
                    false
                );
            })
            .ToList();

        var topId = stats
            .Where(s => s.WinRate is not null)
            .OrderByDescending(s => s.WinRate)
            .ThenByDescending(s => s.Wins)
            .FirstOrDefault()
            ?.HouseId;
        var mostWins = stats
            .Where(s => s.Wins > 0)
            .OrderByDescending(s => s.Wins)
            .ThenByDescending(s => s.WinRate)
            .FirstOrDefault();
        var shaped = stats.Select(s => s with { IsTop = s.HouseId == topId }).ToList();

        var tallest = Math.Max(stats.Max(s => s.WinRate) ?? 0, evenSplit ?? 0);
        var chartMax = Math.Clamp(
            Math.Round(Math.Ceiling(tallest / ChartStep - 1e-9) * ChartStep, 2),
            MinChartMax,
            1.0
        );

        return new GameStatisticsOverview(
            summary.FinishedGames,
            summary.AverageRound,
            summary.UnknownWinnerGames,
            decided,
            totalSeats,
            evenSplit,
            chartMax,
            shaped,
            mostWins is null ? null : shaped.First(s => s.HouseId == mostWins.HouseId)
        );
    }

    public static IReadOnlyList<LatestGame> ShapeLatest(
        IEnumerable<StatisticsLatestRow> rows,
        ScenarioCatalog catalog
    ) =>
        [
            .. rows.Select(r =>
            {
                var house = catalog.GetHouse(r.WinnerHouse);
                return new LatestGame(
                    r.Id,
                    r.Name,
                    ScenarioLabel(r, catalog),
                    r.IsPbem,
                    r.Round,
                    r.FinishedAt,
                    r.WinnerHouse,
                    house?.Name ?? r.WinnerHouse,
                    r.WinnerUserDeleted ? null : r.WinnerUserId,
                    r.WinnerUserDeleted
                        ? Domain.ApplicationUser.DeletedAccountDisplayName
                        : r.WinnerUserName
                );
            }),
        ];

    private static string ScenarioLabel(StatisticsLatestRow row, ScenarioCatalog catalog) =>
        row.SetupId is not null && int.TryParse(row.PlayerCount, out var playerCount)
            ? catalog.GetScenarioLabel(row.SetupId, playerCount)
            : "Unknown scenario";
}
