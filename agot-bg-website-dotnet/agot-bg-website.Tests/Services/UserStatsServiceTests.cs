using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace agot_bg_website.Tests.Services;

/// <summary>
/// Pins the exact stats rules requested for the profile page (see Pages.UserModel and
/// MIGRATION_PLAN.md §10.2): cancelled games never count for still-seated players, "finished
/// games" only counts games actually played to the end (never games left early), and games left
/// early only fold into the win-rate percentage's denominator, always as a loss (even if the game
/// was later cancelled - except a clock-timeout removal from a cancelled game).
/// </summary>
public class UserStatsServiceTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly UserStatsService _sut;

    public UserStatsServiceTests()
    {
        var services = new ServiceCollection();
        services.AddDbContext<ApplicationDbContext>(o =>
            o.UseInMemoryDatabase(Guid.NewGuid().ToString())
        );
        services.AddLogging();
        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        _provider = services.BuildServiceProvider();
        _db = _provider.GetRequiredService<ApplicationDbContext>();
        _userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();
        _sut = new UserStatsService(_db);
    }

    private static JsonDocument Json(string json) => JsonDocument.Parse(json);

    [Fact]
    public async Task CancelledGames_DontCountForCurrentPlayers_ButLeavingEarlyStillCountsAsLoss()
    {
        var user = new ApplicationUser { UserName = "cancelled_guy", Email = "c@example.com" };
        await _userManager.CreateAsync(user);

        // Still-current participation in a cancelled game - must not count as finished, won, or
        // lost, and must not appear in the win-rate denominator either.
        var cancelledGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Cancelled mid-game",
            OwnerUserId = user.Id,
            State = GameState.Cancelled,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        // E.g. a player rage-quit, got vassalized by vote, and the game was then cancelled - the
        // removal must still count as a loss.
        var leftEarlyThenCancelledGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Left early, later cancelled",
            OwnerUserId = user.Id,
            State = GameState.Cancelled,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        _db.Games.AddRange(cancelledGame, leftEarlyThenCancelledGame);
        _db.PlayersInGame.Add(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = cancelledGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": false}"""),
            }
        );
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = leftEarlyThenCancelledGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.Vote,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(0, result.WonGamesCount);
        Assert.Equal(0, result.FinishedGamesCount);
        Assert.Equal(1, result.RemovedFromGameCount);
        Assert.Equal(0.0, result.WinRate);
    }

    [Fact]
    public async Task ClockTimeoutFromLaterCancelledGame_DoesNotCountAsLoss()
    {
        var user = new ApplicationUser { UserName = "timeout_guy", Email = "t@example.com" };
        await _userManager.CreateAsync(user);

        var cancelledGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Timed out, later cancelled",
            OwnerUserId = user.Id,
            State = GameState.Cancelled,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        _db.Games.Add(cancelledGame);
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = cancelledGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.ClockTimeout,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(0, result.RemovedFromGameCount);
        Assert.Null(result.WinRate);
    }

    [Fact]
    public async Task FinishedGamesCount_ExcludesGamesLeftEarly_ButWinRateDenominatorIncludesThem()
    {
        var user = new ApplicationUser { UserName = "mixed_guy", Email = "m@example.com" };
        await _userManager.CreateAsync(user);

        var wonGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Won",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        var leftEarlyGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Left early but finished",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        _db.Games.AddRange(wonGame, leftEarlyGame);

        _db.PlayersInGame.Add(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = wonGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": true}"""),
            }
        );
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = leftEarlyGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.ClockTimeout,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(1, result.WonGamesCount);
        // "Finished games" is only the 1 game actually played to the end - the left-early game is
        // NOT included here even though it's factored into the win rate below.
        Assert.Equal(1, result.FinishedGamesCount);
        Assert.Equal(1, result.RemovedFromGameCount);
        // Win rate's denominator is 2 (1 win + 1 unconditional loss from the left-early game).
        Assert.Equal(0.5, result.WinRate);
    }

    [Fact]
    public async Task RemovedFromGameCount_CountsRemovalsFromStillOngoingGamesToo()
    {
        var user = new ApplicationUser
        {
            UserName = "ongoing_removal_guy",
            Email = "o@example.com",
        };
        await _userManager.CreateAsync(user);

        // Voted out/timed out of a game that hasn't finished yet - still an unconditional loss,
        // it shouldn't need to wait for the game to reach Finished before it counts.
        var stillOngoingGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Still ongoing",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        _db.Games.Add(stillOngoingGame);
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = stillOngoingGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.Vote,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(1, result.RemovedFromGameCount);
        // The removal counts towards the win-rate denominator as an unconditional loss even
        // though the game the player was removed from hasn't finished yet.
        Assert.Equal(0.0, result.WinRate);
    }

    [Fact]
    public async Task FinishedGamesCount_ExcludesFacelessGames_ButIncludesTutorialGames()
    {
        var user = new ApplicationUser { UserName = "faceless_guy", Email = "f@example.com" };
        await _userManager.CreateAsync(user);

        // Faceless games hide who's playing which house entirely - Pages.UserModel's games list
        // drops them outright, so "Finished games" must match that and drop them too, keeping the
        // "Games badge == Ongoing + Finished" invariant intact.
        var facelessGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Faceless",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game", "faceless": true}}"""),
        };
        // The tutorial variant is excluded from the win-rate percentage but must still count as a
        // plain Finished game for the "Finished games" badge - only the games list's own faceless
        // exclusion is mirrored here, not the win-rate percentage's narrower exclusions.
        var tutorialGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Tutorial",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "learn-the-game"}}"""),
        };
        _db.Games.AddRange(facelessGame, tutorialGame);

        _db.PlayersInGame.AddRange(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = facelessGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark"}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = tutorialGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": true}"""),
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        // Only the tutorial game counts - the faceless one is dropped entirely.
        Assert.Equal(1, result.FinishedGamesCount);
        // The tutorial game is excluded from the win-rate percentage though, so there's nothing
        // left to compute a percentage from.
        Assert.Null(result.WinRate);
    }

    [Fact]
    public async Task RemovedFromTutorialGame_NeitherCountsAsLossNorAffectsWinRate()
    {
        var user = new ApplicationUser
        {
            UserName = "tutorial_removal_guy",
            Email = "t@example.com",
        };
        await _userManager.CreateAsync(user);

        // Voted out/timed out of a "learn the game" tutorial game - the tutorial variant is
        // excluded from win-rate entirely on the win side (see
        // FinishedGamesCount_ExcludesFacelessGames_ButIncludesTutorialGames above), so a removal
        // from one must not sneak in as an unconditional loss either.
        var tutorialGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Tutorial removal",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "learn-the-game"}}"""),
        };
        _db.Games.Add(tutorialGame);
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = tutorialGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.Vote,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal(0, result.RemovedFromGameCount);
        Assert.Null(result.WinRate);
    }

    [Fact]
    public async Task ReplacerLoss_DoesNotCountAgainstWinRate_ButReplacerWinStillCounts()
    {
        var user = new ApplicationUser { UserName = "replacer_guy", Email = "rep@example.com" };
        await _userManager.CreateAsync(user);

        var replacerId = user.Id.ToString();

        // Joined as a replacer and lost - must not count against the win rate at all (neither
        // numerator nor denominator).
        var replacerLossGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Replacer loss",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                $$"""{"settings": {"setupId": "base-game"}, "replacerIds": ["{{replacerId}}"]}"""
            ),
        };
        // Joined as a replacer and won - still counts as a win normally.
        var replacerWinGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Replacer win",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                $$"""{"settings": {"setupId": "base-game"}, "replacerIds": ["{{replacerId}}"]}"""
            ),
        };
        // A normal (non-replacer) loss, to confirm it's still counted as a loss.
        var normalLossGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Normal loss",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        _db.Games.AddRange(replacerLossGame, replacerWinGame, normalLossGame);

        _db.PlayersInGame.AddRange(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = replacerLossGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": false}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = replacerWinGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": true}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = normalLossGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": false}"""),
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        // 1 win (replacerWinGame) + 1 loss (normalLossGame) - replacerLossGame's loss is excluded
        // entirely, so it's neither a win nor a loss.
        Assert.Equal(1, result.WonGamesCount);
        Assert.Equal(0.5, result.WinRate);
        // 2 non-faceless games (won and lost) had this user's id in replacerIds.
        Assert.Equal(2, result.ReplacerGamesCount);
        // Of those 2, exactly 1 was a win and 1 was an (excluded) loss.
        Assert.Equal(1, result.ReplacerWinsCount);
        Assert.Equal(1, result.ReplacerLossesExcludedCount);
    }

    [Fact]
    public async Task RemovalFromGameJoinedAsReplacer_DoesNotCountAsRemovedOrLoss()
    {
        // A player who jumped into a stalling game as a replacer, and was later voted/timed out
        // of it in turn (removerIds keeps naming them, so this is a PreviousPlayerInGame row for
        // a game that also lists them in replacerIds). This removal must not count towards
        // RemovedFromGameCount or the win-rate loss either - same "no downside risk" rule as a
        // still-seated replacer's loss.
        var user = new ApplicationUser { UserName = "replacer_removed", Email = "rre@example.com" };
        await _userManager.CreateAsync(user);

        var replacerId = user.Id.ToString();

        // A normal win, to have a non-zero, non-trivial win rate to check against.
        var wonGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Won",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json("""{"settings": {"setupId": "base-game"}}"""),
        };
        // The game the user joined as a replacer for and was later removed from again, before it
        // finished.
        var replacerRemovalGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Replacer then removed",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                $$"""{"settings": {"setupId": "base-game"}, "replacerIds": ["{{replacerId}}"]}"""
            ),
        };
        _db.Games.AddRange(wonGame, replacerRemovalGame);

        _db.PlayersInGame.Add(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = wonGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": true}"""),
            }
        );
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = replacerRemovalGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.ClockTimeout,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        // The replacer-game removal is excluded entirely: RemovedFromGameCount stays 0 and the
        // win rate is a clean 100% (1 win, 0 losses), instead of 50% if the removal had counted
        // as an unconditional loss.
        Assert.Equal(0, result.RemovedFromGameCount);
        Assert.Equal(1, result.WonGamesCount);
        Assert.Equal(1.0, result.WinRate);
    }

    [Fact]
    public async Task OriginalPlayerWhoAlsoReplacedIntoAnotherHouse_IsNotTreatedAsPureReplacer()
    {
        // The real scenario reported: a user started the game (initialPlayerIds), was replaced,
        // later jumped back in as a replacer for a *different* house (replacerIds), and was then
        // removed again. Because they were an original player of this specific game, none of the
        // "pure replacer" exemptions should apply to them here - the removal is a real loss.
        var user = new ApplicationUser
        {
            UserName = "started_then_replaced",
            Email = "s@example.com",
        };
        await _userManager.CreateAsync(user);

        var userId = user.Id.ToString();

        var finishedLossGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Started and lost, also replaced in elsewhere",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                $$"""
                {
                    "settings": {"setupId": "base-game"},
                    "replacerIds": ["{{userId}}"],
                    "initialPlayerIds": ["{{userId}}"]
                }
                """
            ),
        };
        var removalGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Started, replaced elsewhere, removed again",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                $$"""
                {
                    "settings": {"setupId": "base-game"},
                    "replacerIds": ["{{userId}}"],
                    "initialPlayerIds": ["{{userId}}"]
                }
                """
            ),
        };
        _db.Games.AddRange(finishedLossGame, removalGame);

        _db.PlayersInGame.Add(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = finishedLossGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": false}"""),
            }
        );
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = removalGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.ClockTimeout,
            }
        );

        await _db.SaveChangesAsync();

        var result = await _sut.RecalculateAsync(user.Id);

        Assert.NotNull(result);
        // Both games still count as "replacer games" (the user did replace at some point in
        // each), but since initialPlayerIds also names them, neither gets the pure-replacer
        // exemption: the Finished game's loss counts normally, and the removal counts too.
        // ReplacerGamesCount only scans PlayersInGame rows (current participations), so it's 1
        // here - the removal game has no PlayerInGame row, just the PreviousPlayerInGame one.
        Assert.Equal(1, result.ReplacerGamesCount);
        Assert.Equal(0, result.ReplacerWinsCount);
        Assert.Equal(0, result.ReplacerLossesExcludedCount);
        Assert.Equal(1, result.RemovedFromGameCount);
        Assert.Equal(0.0, result.WinRate);
    }

    public void Dispose()
    {
        _db.Dispose();
        _provider.Dispose();
    }
}
