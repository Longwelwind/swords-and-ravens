using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Services;
using agot_bg_website.Services.Statistics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace agot_bg_website.Tests.Services;

public class PlayerHouseStatsServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());
    private readonly PlayerHouseStatsService _sut;
    private readonly ApplicationUser _user = new()
    {
        UserName = "stats_guy",
        Email = "s@example.com",
    };

    public PlayerHouseStatsServiceTests()
    {
        _db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options
        );
        _db.Users.Add(_user);
        _db.SaveChanges();
        _sut = new PlayerHouseStatsService(_db, _cache);
    }

    public void Dispose()
    {
        _cache.Dispose();
        _db.Dispose();
    }

    private static JsonDocument Json(string json) => JsonDocument.Parse(json);

    private static string View(string setupId, int playerCount, Guid? replacerId = null) =>
        $$"""
            {"settings": {"setupId": "{{setupId}}", "playerCount": {{playerCount}}}, "replacerIds": [{{(
                replacerId is null ? "" : $"\"{replacerId}\""
            )}}]}
            """;

    private Game AddGame(GameState state, string viewOfGame)
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Name = "g",
            OwnerUserId = _user.Id,
            State = state,
            ViewOfGame = Json(viewOfGame),
        };
        _db.Games.Add(game);
        _db.SaveChanges();
        return game;
    }

    private void AddPlayed(GameState state, string viewOfGame, string house, bool? isWinner = false)
    {
        var game = AddGame(state, viewOfGame);
        _db.PlayersInGame.Add(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                UserId = _user.Id,
                Data = Json(
                    isWinner is null
                        ? $$"""{"house": "{{house}}"}"""
                        : $$"""{"house": "{{house}}", "is_winner": {{isWinner.ToString()!.ToLowerInvariant()}}}"""
                ),
            }
        );
        _db.SaveChanges();
    }

    private void AddRemoval(GameState state, string viewOfGame, Guid? userId = null)
    {
        var game = AddGame(state, viewOfGame);
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                UserId = userId ?? _user.Id,
                Reason = PlayerReplacementReason.Vote,
            }
        );
        _db.SaveChanges();
    }

    private static HouseRecord? Record(ScenarioHouseStats scenario, string house) =>
        scenario.Houses.GetValueOrDefault(house);

    [Fact]
    public async Task SameHouseInDifferentScenarios_IsKeptSeparate()
    {
        AddPlayed(GameState.Finished, View("base-game", 4), "baratheon", true);
        AddPlayed(GameState.Finished, View("base-game", 4), "baratheon", false);
        AddPlayed(GameState.Finished, View("rumble-in-the-south", 4), "baratheon", true);
        AddPlayed(GameState.Finished, View("base-game", 6), "stark", false);

        var stats = await _sut.GetAsync(_user.Id);

        Assert.Equal(3, stats.Scenarios.Count);
        var base4 = stats.Scenarios.Single(s => s is { SetupId: "base-game", PlayerCount: 4 });
        var rumble4 = stats.Scenarios.Single(s =>
            s is { SetupId: "rumble-in-the-south", PlayerCount: 4 }
        );
        Assert.Equal(new HouseRecord(2, 1), Record(base4, "baratheon"));
        Assert.Equal(new HouseRecord(1, 1), Record(rumble4, "baratheon"));

        var selections = PlayerHouseStatsView.BuildSelections(stats, ScenarioCatalog.Instance);
        Assert.Equal(
            ["", "base-game:4", "base-game:6", "rumble-in-the-south:4"],
            selections.Select(s => s.Key)
        );
        var all = selections[0];
        Assert.Equal(4, all.Games);
        Assert.Equal(3, all.Cards.Single(c => c.Id == "baratheon").Games);

        // Rumble in the South has Tyrell/Martell but not Stark/Greyjoy; base-game 4p the reverse.
        var rumbleCards = selections[3].Cards.ToDictionary(c => c.Id);
        Assert.Equal(HouseCardState.Played, rumbleCards["baratheon"].State);
        Assert.Equal(HouseCardState.NotPlayed, rumbleCards["tyrell"].State);
        Assert.Equal(HouseCardState.NotInScenario, rumbleCards["stark"].State);
        Assert.Equal(HouseCardState.NotInScenario, rumbleCards["arryn"].State);
        Assert.Equal(HouseCardState.NotPlayed, all.Cards.Single(c => c.Id == "tyrell").State);
    }

    [Fact]
    public async Task OnlyFinishedNonTutorialGamesWithOutcome_AreCounted()
    {
        AddPlayed(GameState.Finished, View("base-game", 4), "stark", true);
        AddPlayed(GameState.Finished, View("learn-the-game", 2), "stark", true);
        AddPlayed(GameState.Finished, View("base-game", 4), "stark", isWinner: null);
        AddPlayed(GameState.Ongoing, View("base-game", 4), "stark", false);
        AddPlayed(GameState.Cancelled, View("base-game", 4), "stark", false);

        var stats = await _sut.GetAsync(_user.Id);

        var scenario = Assert.Single(stats.Scenarios);
        Assert.Equal(new HouseRecord(1, 1), Record(scenario, "stark"));
    }

    [Fact]
    public async Task PureReplacerLoss_IsExcluded_ButPureReplacerWinCounts()
    {
        AddPlayed(
            GameState.Finished,
            View("base-game", 4, replacerId: _user.Id),
            "lannister",
            false
        );
        AddPlayed(
            GameState.Finished,
            View("base-game", 4, replacerId: _user.Id),
            "lannister",
            true
        );

        var stats = await _sut.GetAsync(_user.Id);

        Assert.Equal(new HouseRecord(1, 1), Record(Assert.Single(stats.Scenarios), "lannister"));
    }

    [Fact]
    public async Task Removals_AreCountedPerScenario_NotAttributedToAHouse()
    {
        AddPlayed(GameState.Finished, View("base-game", 4), "stark", true);
        AddRemoval(GameState.Finished, View("base-game", 4));
        AddRemoval(GameState.Ongoing, View("rumble-in-the-south", 4));
        AddRemoval(GameState.Finished, View("learn-the-game", 2));
        AddRemoval(GameState.Cancelled, View("base-game", 4));
        AddRemoval(GameState.Finished, View("base-game", 4, replacerId: _user.Id));
        AddRemoval(GameState.Finished, View("base-game", 4), userId: Guid.NewGuid());

        var stats = await _sut.GetAsync(_user.Id);

        var base4 = stats.Scenarios.Single(s => s is { SetupId: "base-game", PlayerCount: 4 });
        Assert.Equal(1, base4.RemovedGames);
        Assert.Equal(new HouseRecord(1, 1), Record(base4, "stark"));
        Assert.Single(base4.Houses);

        var selections = PlayerHouseStatsView.BuildSelections(stats, ScenarioCatalog.Instance);
        Assert.Equal(2, selections[0].RemovedGames);
        // A scenario with only removals has no counted games, so it isn't offered as an option.
        Assert.DoesNotContain(selections, s => s.Key == "rumble-in-the-south:4");
    }

    [Fact]
    public async Task HouseStatsAndRemovals_ReconcileWithWinRateCalculator()
    {
        AddPlayed(GameState.Finished, View("base-game", 6), "stark", true);
        AddPlayed(GameState.Finished, View("base-game", 6), "stark", false);
        AddPlayed(GameState.Finished, View("mother-of-dragons", 8), "targaryen", false);
        AddPlayed(
            GameState.Finished,
            View("base-game", 3, replacerId: _user.Id),
            "lannister",
            false
        );
        AddPlayed(
            GameState.Finished,
            View("base-game", 3, replacerId: _user.Id),
            "lannister",
            true
        );
        AddPlayed(GameState.Finished, View("learn-the-game", 2), "stark", true);
        AddPlayed(GameState.Ongoing, View("base-game", 6), "stark", false);
        AddRemoval(GameState.Finished, View("base-game", 6));
        AddRemoval(GameState.Ongoing, View("mother-of-dragons", 8));

        var stats = await _sut.GetAsync(_user.Id);
        var userStats = await new UserStatsService(_db).RecalculateAsync(_user.Id);

        var records = stats.Scenarios.SelectMany(s => s.Houses.Values).ToList();
        var wins = records.Sum(r => r.Wins);
        var losses = records.Sum(r => r.Games - r.Wins) + stats.Scenarios.Sum(s => s.RemovedGames);
        Assert.NotNull(userStats);
        Assert.Equal(userStats.WonGamesCount, wins);
        Assert.Equal(userStats.WinRate, (double)wins / (wins + losses));
        Assert.Equal(userStats.RemovedFromGameCount, stats.Scenarios.Sum(s => s.RemovedGames));
    }

    [Fact]
    public async Task BestHouse_NeedsThreeGamesAndAWin_AndHighestWinRateWins()
    {
        // 2/2 (too few games), 2/4 (50%), 3/4 (75%), 0/3 (no wins).
        foreach (
            var (house, wins, games) in new[]
            {
                ("baratheon", 2, 2),
                ("lannister", 2, 4),
                ("stark", 3, 4),
                ("greyjoy", 0, 3),
            }
        )
        {
            for (var i = 0; i < games; i++)
            {
                AddPlayed(GameState.Finished, View("base-game", 4), house, i < wins);
            }
        }

        var stats = await _sut.GetAsync(_user.Id);

        var cards = PlayerHouseStatsView.BuildSelections(stats, ScenarioCatalog.Instance)[0].Cards;
        Assert.Equal(["stark"], cards.Where(c => c.IsBest).Select(c => c.Id));
        Assert.Equal("75%", cards.Single(c => c.Id == "stark").WinRateDisplay);
        Assert.Equal("–", cards.Single(c => c.Id == "martell").WinRateDisplay);
    }

    [Fact]
    public async Task Result_IsCachedPerUser()
    {
        AddPlayed(GameState.Finished, View("base-game", 4), "stark", true);
        var first = await _sut.GetAsync(_user.Id);

        AddPlayed(GameState.Finished, View("base-game", 4), "stark", true);

        Assert.Same(first, await _sut.GetAsync(_user.Id));
    }
}
