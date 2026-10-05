using System.Security.Claims;
using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Stats;
using agot_bg_website.Pages;
using agot_bg_website.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace agot_bg_website.Tests.Pages;

/// <summary>
/// Covers the public user-profile page (MIGRATION_PLAN.md §13/§14): 404 for a soft-deleted
/// ("Took the Black") user, and the win-rate/games-list computation over PlayerInGame's opaque
/// JSON payload for an anonymous viewer.
/// </summary>
public class UserModelTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IAuthorizationService _authorizationService;
    private readonly UserStatsService _userStatsService;
    private readonly UserStatsRecalculationQueue _userStatsQueue;

    public UserModelTests()
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
        services.AddAuthorizationBuilder().AddGamePermissionPolicies();
        services.AddScoped<UserStatsService>();
        services.AddSingleton<UserStatsRecalculationQueue>();

        _provider = services.BuildServiceProvider();
        _db = _provider.GetRequiredService<ApplicationDbContext>();
        _userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();
        _authorizationService = _provider.GetRequiredService<IAuthorizationService>();
        _userStatsService = _provider.GetRequiredService<UserStatsService>();
        _userStatsQueue = _provider.GetRequiredService<UserStatsRecalculationQueue>();
    }

    private UserModel CreatePageModel(ClaimsPrincipal? viewer = null)
    {
        var model = new UserModel(_db, _userManager, _authorizationService, _userStatsQueue)
        {
            PageContext = new PageContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = viewer ?? new ClaimsPrincipal(new ClaimsIdentity()),
                },
            },
        };
        return model;
    }

    private static JsonDocument Json(string json) => JsonDocument.Parse(json);

    private static ClaimsPrincipal AuthenticatedPrincipal(ApplicationUser user) =>
        new(
            new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.UserName ?? user.Email ?? user.Id.ToString()),
                ],
                authenticationType: "Test"
            )
        );

    [Fact]
    public async Task DeletedUser_Returns404()
    {
        var user = new ApplicationUser
        {
            UserName = "deleted-guy",
            Email = "deleted@example.com",
            IsDeleted = true,
        };
        await _userManager.CreateAsync(user);

        var result = await CreatePageModel().OnGetAsync(user.Id);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task NonexistentUser_Returns404()
    {
        var result = await CreatePageModel().OnGetAsync(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ComputesWinRateAndGameListFromPlayerInGameData()
    {
        var user = new ApplicationUser { UserName = "robb_stark", Email = "robb@example.com" };
        await _userManager.CreateAsync(user);

        var wonGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "A finished game (won)",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                """{"turn": 10, "maxPlayerCount": 6, "winner": "stark", "settings": {"setupId": "base-game"}}"""
            ),
        };
        var lostGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "A finished game (lost)",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                """{"turn": 10, "maxPlayerCount": 6, "winner": "lannister", "settings": {"setupId": "base-game"}}"""
            ),
        };
        var learnTheGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Tutorial game",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                """{"turn": 10, "maxPlayerCount": 6, "winner": "stark", "settings": {"setupId": "learn-the-game"}}"""
            ),
        };
        var facelessGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Faceless game",
            OwnerUserId = user.Id,
            State = GameState.Finished,
            ViewOfGame = Json(
                """{"turn": 10, "maxPlayerCount": 6, "settings": {"setupId": "base-game", "faceless": true}}"""
            ),
        };
        var ongoingGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Ongoing game",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                """{"turn": 3, "maxPlayerCount": 6, "waitingFor": "Stark", "settings": {"setupId": "base-game"}}"""
            ),
        };
        var cancelledGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Cancelled game",
            OwnerUserId = user.Id,
            State = GameState.Cancelled,
            ViewOfGame = Json(
                """{"turn": 1, "maxPlayerCount": 6, "settings": {"setupId": "base-game"}}"""
            ),
        };
        _db.Games.AddRange(
            wonGame,
            lostGame,
            learnTheGame,
            facelessGame,
            ongoingGame,
            cancelledGame
        );

        _db.PlayersInGame.AddRange(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = wonGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": true}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = lostGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": false}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = learnTheGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark", "is_winner": true}"""),
            },
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
                GameId = ongoingGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark"}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = cancelledGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark"}"""),
            }
        );

        // A previous stint that ended in a finished game - always a loss (MIGRATION_PLAN.md §10.2).
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = wonGame.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.Vote,
            }
        );

        await _db.SaveChangesAsync();

        // Stats are only ever read from the cache the profile page itself never populates
        // synchronously anymore (see StatsNotYetCached_ShowsNAAndEnqueuesRecalculation below) -
        // warm it via UserStatsService directly first, exactly as
        // UserStatsRecalculationBackgroundService would after picking this user up off the queue.
        await _userStatsService.RecalculateAsync(user.Id);

        var model = CreatePageModel();
        var result = await model.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(result);
        // FinishedCount considers every non-faceless game actually in state Finished - wonGame,
        // lostGame, AND learnTheGame (3 total); it only excludes facelessGame (hidden identity,
        // dropped from the games list entirely) and cancelledGame (never affects any stat), and
        // does NOT exclude removed/left-early rows since those never had a PlayerInGame row to
        // begin with. The win-rate percentage is stricter: it further excludes learnTheGame (the
        // tutorial) from its own numerator/denominator, but folds the 1 unconditional loss from
        // the PreviousPlayerInGame row into ITS denominator (wonGame + lostGame + removed = 3).
        Assert.Equal(1, model.WonCount);
        Assert.Equal(3, model.FinishedCount);
        Assert.Equal(1, model.RemovedFromGameCount);
        Assert.Equal("33.3 %", model.WinRateDisplay);
        Assert.Equal(1, model.OngoingCount);

        // Faceless games are hidden from the games list entirely; the rest (won/lost/tutorial/
        // ongoing) show up, cancelled games are listed separately.
        Assert.Equal(4, model.GamesOfUser.Count);
        Assert.DoesNotContain(model.GamesOfUser, g => g.GameId == facelessGame.Id);
        Assert.Single(model.CancelledGames);
        Assert.Equal(cancelledGame.Id, model.CancelledGames[0].GameId);
    }

    [Fact]
    public async Task FacelessGames_AreHiddenOnForeignProfile_ButVisibleOnOwnProfile()
    {
        var user = new ApplicationUser
        {
            UserName = "faceless_profile_user",
            Email = "faceless-profile@example.com",
        };
        await _userManager.CreateAsync(user);

        var facelessOngoingGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Faceless ongoing game",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                """{"turn": 2, "maxPlayerCount": 6, "waitingFor": "Stark", "settings": {"setupId": "base-game", "faceless": true}}"""
            ),
        };
        var visibleOngoingGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Visible ongoing game",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                """{"turn": 2, "maxPlayerCount": 6, "waitingFor": "Stark", "settings": {"setupId": "base-game"}}"""
            ),
        };

        _db.Games.AddRange(facelessOngoingGame, visibleOngoingGame);
        _db.PlayersInGame.AddRange(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = facelessOngoingGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark"}"""),
            },
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = visibleOngoingGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark"}"""),
            }
        );
        await _db.SaveChangesAsync();

        var foreignViewModel = CreatePageModel();
        var foreignResult = await foreignViewModel.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(foreignResult);
        Assert.DoesNotContain(
            foreignViewModel.GamesOfUser,
            g => g.GameId == facelessOngoingGame.Id
        );
        Assert.Equal(1, foreignViewModel.OngoingCount);

        var ownViewModel = CreatePageModel(AuthenticatedPrincipal(user));
        var ownResult = await ownViewModel.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(ownResult);
        Assert.True(ownViewModel.IsOwnProfile);
        Assert.Contains(ownViewModel.GamesOfUser, g => g.GameId == facelessOngoingGame.Id);
        Assert.Equal(2, ownViewModel.OngoingCount);
    }

    [Fact]
    public async Task ReplacerGame_IsFlaggedOnGameRowAndCountedOnProfile()
    {
        var user = new ApplicationUser { UserName = "replacer_jon", Email = "jon@example.com" };
        await _userManager.CreateAsync(user);

        var replacerGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Joined as replacer",
            OwnerUserId = user.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                $$"""
                {"turn": 5, "maxPlayerCount": 6, "waitingFor": "Stark", "settings": {"setupId": "base-game"}, "replacerIds": ["{{user.Id}}"]}
                """
            ),
        };
        _db.Games.Add(replacerGame);
        _db.PlayersInGame.Add(
            new PlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = replacerGame.Id,
                UserId = user.Id,
                Data = Json("""{"house": "stark"}"""),
            }
        );
        await _db.SaveChangesAsync();

        await _userStatsService.RecalculateAsync(user.Id);

        var model = CreatePageModel();
        var result = await model.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(result);
        var row = Assert.Single(model.GamesOfUser);
        Assert.True(row.IsReplacer);
        Assert.Equal(1, model.ReplacerGamesCount);
    }

    [Fact]
    public async Task RemovalFromLaterCancelledGame_ShowsInPreviouslyParticipatedButNotInStats()
    {
        // A player voted/timed out of a still-Ongoing game (creating a PreviousPlayerInGame row),
        // and the remaining players later vote to cancel the whole game. That removal must still
        // be visible on the removed player's profile (it genuinely happened - see
        // UserModel.LoadPreviouslyParticipatedGamesAsync's doc comment) but must never count
        // towards RemovedFromGameCount/WinRate, since cancelled games never affect stats at all
        // (MIGRATION_PLAN.md §10.2).
        var user = new ApplicationUser
        {
            UserName = "removed_then_cancelled",
            Email = "r@example.com",
        };
        await _userManager.CreateAsync(user);
        var owner = new ApplicationUser { UserName = "game_owner", Email = "owner@example.com" };
        await _userManager.CreateAsync(owner);

        var cancelledGame = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Removed then cancelled",
            OwnerUserId = owner.Id,
            State = GameState.Cancelled,
            ViewOfGame = Json(
                """{"turn": 4, "maxPlayerCount": 6, "settings": {"setupId": "base-game"}}"""
            ),
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

        await _userStatsService.RecalculateAsync(user.Id);

        var model = CreatePageModel();
        var result = await model.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(result);
        // Never counted towards any cached stat.
        Assert.Equal(0, model.RemovedFromGameCount);
        Assert.Equal("n/a", model.WinRateDisplay);
        // But still visible, badge-able as Cancelled via its own State.
        var row = Assert.Single(model.PreviouslyParticipatedGames);
        Assert.Equal(cancelledGame.Id, row.GameId);
        Assert.Equal(GameState.Cancelled, row.State);
    }

    [Fact]
    public async Task RemovalFromGameJoinedAsReplacer_ShowsInPreviouslyParticipatedButNotInStats()
    {
        // A player who jumped into a stalling game as a replacer (their id ends up in
        // ViewOfGame.replacerIds), and was later voted/timed out of it in turn. The removal must
        // still be visible on their profile (badge-able as "Replacer" via IsReplacer), but must
        // not count towards RemovedFromGameCount/WinRate - same "no downside risk" rule as a
        // still-seated replacer's loss (see UserStatsService.RecalculateAsync's doc comment).
        var user = new ApplicationUser
        {
            UserName = "replacer_removed_again",
            Email = "rr@example.com",
        };
        await _userManager.CreateAsync(user);
        var owner = new ApplicationUser { UserName = "game_owner2", Email = "owner2@example.com" };
        await _userManager.CreateAsync(owner);

        var replacerId = user.Id.ToString();
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Replacer removed again",
            OwnerUserId = owner.Id,
            State = GameState.Ongoing,
            ViewOfGame = Json(
                $$"""{"turn": 4, "maxPlayerCount": 6, "settings": {"setupId": "base-game"}, "replacerIds": ["{{replacerId}}"]}"""
            ),
        };
        _db.Games.Add(game);
        _db.PreviousPlayersInGame.Add(
            new PreviousPlayerInGame
            {
                Id = Guid.NewGuid(),
                GameId = game.Id,
                UserId = user.Id,
                Reason = PlayerReplacementReason.Vote,
            }
        );
        await _db.SaveChangesAsync();

        await _userStatsService.RecalculateAsync(user.Id);

        var model = CreatePageModel();
        var result = await model.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(result);
        // Never counted towards any cached stat.
        Assert.Equal(0, model.RemovedFromGameCount);
        Assert.Equal("n/a", model.WinRateDisplay);
        // But still visible, flagged as a replacer removal.
        var row = Assert.Single(model.PreviouslyParticipatedGames);
        Assert.Equal(game.Id, row.GameId);
        Assert.True(row.IsReplacer);
    }

    [Fact]
    public async Task StatsNotYetCached_ShowsNAAndEnqueuesRecalculation()
    {
        // A brand-new user (or any pre-existing user before this feature's background service has
        // ever picked them up) has StatsCachedAt == null. The profile page must never fall back to
        // computing stats synchronously here - that would reintroduce exactly the "load everything
        // on every profile view" cost LoadGamesAsync's rewrite was meant to eliminate. Instead it
        // shows "n/a"/0 for this one request and enqueues the user for the background service.
        var user = new ApplicationUser
        {
            UserName = "uncached_stats_guy",
            Email = "uncached@example.com",
        };
        await _userManager.CreateAsync(user);

        var model = CreatePageModel();
        var result = await model.OnGetAsync(user.Id);

        Assert.IsType<PageResult>(result);
        Assert.Equal(0, model.WonCount);
        Assert.Equal(0, model.FinishedCount);
        Assert.Equal(0, model.RemovedFromGameCount);
        Assert.Equal("n/a", model.WinRateDisplay);

        await using var enumerator = _userStatsQueue
            .ReadAllAsync(CancellationToken.None)
            .GetAsyncEnumerator();
        Assert.True(await enumerator.MoveNextAsync());
        Assert.Equal(user.Id, enumerator.Current);
    }

    public void Dispose()
    {
        _db.Dispose();
        _provider.Dispose();
    }
}
