using agot_bg_website.Services.Statistics;
using Xunit;

namespace agot_bg_website.Tests.Services.Statistics;

public class GameStatisticsShaperTests
{
    private static readonly ScenarioCatalog Catalog = ScenarioCatalog.Instance;

    private static StatisticsHouseRow Row(string house, int seats, int wins) =>
        new()
        {
            House = house,
            Seats = seats,
            Wins = wins,
        };

    [Fact]
    public void Scenario_ShowsEveryCatalogHouseInOrder_WithWinRateEvenSplitAndTop()
    {
        var overview = GameStatisticsShaper.ShapeOverview(
            GameStatisticsFilter.Default,
            new StatisticsSummaryRow
            {
                FinishedGames = 110,
                AverageRound = 8.2,
                UnknownWinnerGames = 10,
            },
            [
                Row("stark", 100, 40),
                Row("lannister", 100, 20),
                Row("baratheon", 100, 10),
                Row("greyjoy", 100, 10),
                Row("tyrell", 100, 10),
                Row("martell", 100, 10),
            ],
            Catalog
        );

        Assert.Equal(
            Catalog.GetPlayerSetup("base-game", 6)!.Houses,
            overview.Houses.Select(h => h.HouseId)
        );
        Assert.Equal(100, overview.DecidedGames);
        Assert.Equal(600, overview.TotalSeats);
        Assert.Equal(100d / 600, overview.EvenSplitRate);
        var stark = overview.Houses.Single(h => h.HouseId == "stark");
        Assert.Equal(0.4, stark.WinRate);
        Assert.Equal([stark], overview.Houses.Where(h => h.IsTop));
        Assert.Equal(stark, overview.MostWins);
        Assert.Equal(0.4, overview.ChartMaxRate);
    }

    [Fact]
    public void UnplayedHouse_HasNoWinRate_AndUnknownCatalogHousesAreIgnored()
    {
        var overview = GameStatisticsShaper.ShapeOverview(
            GameStatisticsFilter.Default,
            new StatisticsSummaryRow { FinishedGames = 5 },
            [Row("stark", 5, 5), Row("not-a-house", 5, 0)],
            Catalog
        );

        Assert.Equal(6, overview.Houses.Count);
        var martell = overview.Houses.Single(h => h.HouseId == "martell");
        Assert.Equal(0, martell.Seats);
        Assert.Null(martell.WinRate);
        Assert.Equal(1.0, overview.Houses.Single(h => h.HouseId == "stark").WinRate);
        Assert.Equal(5, overview.TotalSeats);
        Assert.Equal(1.0, overview.ChartMaxRate);
    }

    [Fact]
    public void AllScenarios_ShowsOnlyHousesWithSeats_InCatalogOrder()
    {
        var overview = GameStatisticsShaper.ShapeOverview(
            GameStatisticsFilter.Default with
            {
                SetupId = null,
                PlayerCount = null,
            },
            new StatisticsSummaryRow { FinishedGames = 12, UnknownWinnerGames = 2 },
            [Row("targaryen", 10, 4), Row("stark", 20, 6)],
            Catalog
        );

        Assert.Equal(["stark", "targaryen"], overview.Houses.Select(h => h.HouseId));
        Assert.Equal(10, overview.DecidedGames);
        Assert.Equal(2, overview.UnknownWinnerGames);
        Assert.Equal(10d / 30, overview.EvenSplitRate);
        Assert.Equal("targaryen", overview.Houses.Single(h => h.IsTop).HouseId);
        Assert.Equal("stark", overview.MostWins!.HouseId);
    }

    [Fact]
    public void NoGames_YieldsEmptyOverview()
    {
        var overview = GameStatisticsShaper.ShapeOverview(
            GameStatisticsFilter.Default,
            new StatisticsSummaryRow(),
            [],
            Catalog
        );

        Assert.Equal(0, overview.TotalSeats);
        Assert.Null(overview.EvenSplitRate);
        Assert.Null(overview.MostWins);
        Assert.All(overview.Houses, h => Assert.False(h.IsTop));
    }

    [Fact]
    public void Latest_LabelsScenario_AndMasksDeletedUsers()
    {
        var gameId = Guid.NewGuid();
        var rows = new[]
        {
            new StatisticsLatestRow
            {
                Id = gameId,
                Name = "A game",
                SetupId = "base-game",
                PlayerCount = "6",
                Round = 7,
                WinnerHouse = "stark",
                WinnerUserId = Guid.NewGuid(),
                WinnerUserName = "tombstone-name",
                WinnerUserDeleted = true,
            },
            new StatisticsLatestRow { PlayerCount = "6", WinnerHouse = "martell" },
        };

        var latest = GameStatisticsShaper.ShapeLatest(rows, Catalog);

        Assert.Equal(Catalog.GetScenarioLabel("base-game", 6), latest[0].ScenarioLabel);
        Assert.Equal("Stark", latest[0].WinnerHouseName);
        Assert.Equal("Took the Black", latest[0].WinnerUserName);
        Assert.Null(latest[0].WinnerUserId);
        Assert.Equal("Unknown scenario", latest[1].ScenarioLabel);
        Assert.Null(latest[1].WinnerUserName);
    }
}
