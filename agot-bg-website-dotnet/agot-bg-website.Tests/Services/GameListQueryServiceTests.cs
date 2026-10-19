using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Services.GameListing;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace agot_bg_website.Tests.Services;

/// <summary>
/// Pins <see cref="GameListQueryService.GetLastFinishedGameAsync"/>'s ordering rule: it must pick
/// the Finished game with the most recent LastActiveAt - mirroring the original Django model's
/// <c>Meta.get_latest_by = "last_active_at"</c> - never CreatedAt (only reflects when the game
/// was created/started) nor UpdatedAt (bumped unconditionally on every save, including ones that
/// happen long after a game finished, e.g. a player toggling a personal chat/notification setting
/// - see EntireGame.onClientMessage's "change-settings"/"change-game-settings" handling in the
/// game server, which leaves updateLastActive false and therefore never touches LastActiveAt).
/// </summary>
public class GameListQueryServiceTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly GameListQueryService _sut;

    public GameListQueryServiceTests()
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
        _sut = new GameListQueryService(_db);
    }

    private static JsonDocument ViewOfGame(int maxPlayerCount) =>
        JsonDocument.Parse($$"""{"maxPlayerCount": {{maxPlayerCount}}}""");

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task GetInactiveTournamentGamesAsync_PopulatesJoinAsTargetAndViewerMembership(
        bool viewerIsPlayer,
        bool hasWaitedForPlayer
    )
    {
        var waitedForPlayer = new ApplicationUser
        {
            UserName = "waited-player",
            Email = "waited-player@example.com",
            LastActivity = DateTimeOffset.UtcNow,
        };
        var viewer = new ApplicationUser { UserName = "viewer", Email = "viewer@example.com" };
        Assert.True((await _userManager.CreateAsync(waitedForPlayer)).Succeeded);
        Assert.True((await _userManager.CreateAsync(viewer)).Succeeded);

        var waitingForIds = hasWaitedForPlayer ? new[] { waitedForPlayer.Id } : [];
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Stalled tournament",
            OwnerUserId = waitedForPlayer.Id,
            State = GameState.Ongoing,
            LastActiveAt = DateTimeOffset.UtcNow.AddDays(-3),
            ViewOfGame = JsonSerializer.SerializeToDocument(
                new { settings = new { tournamentMode = true }, waitingForIds }
            ),
            Players =
            [
                new PlayerInGame
                {
                    Id = Guid.NewGuid(),
                    UserId = waitedForPlayer.Id,
                    Data = JsonDocument.Parse("""{"house":"stark","waited_for":true}"""),
                },
            ],
        };
        if (viewerIsPlayer)
        {
            game.Players.Add(
                new PlayerInGame
                {
                    Id = Guid.NewGuid(),
                    UserId = viewer.Id,
                    Data = JsonDocument.Parse("""{"house":"lannister","waited_for":false}"""),
                }
            );
        }
        _db.Games.Add(game);
        await _db.SaveChangesAsync();

        var result = Assert.Single(await _sut.GetInactiveTournamentGamesAsync(viewer.Id));

        Assert.Equal(hasWaitedForPlayer ? waitedForPlayer.Id : (Guid?)null, result.JoinAsUserId);
        Assert.Equal(viewerIsPlayer ? "Lannister" : null, result.MyHouse);
        Assert.False(result.MyTurn);
    }

    [Fact]
    public async Task GetLastFinishedGameAsync_PicksMostRecentlyActive_NotMostRecentlyCreated()
    {
        var owner = new ApplicationUser { UserName = "owner", Email = "owner@example.com" };
        await _userManager.CreateAsync(owner);

        // Created first but finished (and thus last active) most recently.
        var recentlyFinished = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Old game, finished recently",
            OwnerUserId = owner.Id,
            State = GameState.Finished,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-30),
            LastActiveAt = DateTimeOffset.UtcNow,
            ViewOfGame = ViewOfGame(6),
        };

        // Created after the game above, but finished long before it.
        var createdLaterButFinishedEarlier = new Game
        {
            Id = Guid.NewGuid(),
            Name = "New game, finished long ago",
            OwnerUserId = owner.Id,
            State = GameState.Finished,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-10),
            LastActiveAt = DateTimeOffset.UtcNow.AddDays(-9),
            ViewOfGame = ViewOfGame(6),
        };

        _db.Games.AddRange(recentlyFinished, createdLaterButFinishedEarlier);
        await _db.SaveChangesAsync();

        var result = await _sut.GetLastFinishedGameAsync();

        Assert.NotNull(result);
        Assert.Equal(recentlyFinished.Id, result!.Id);
    }

    [Fact]
    public async Task GetLastFinishedGameAsync_IgnoresPostFinishSaves_ThatDontBumpLastActiveAt()
    {
        var owner = new ApplicationUser { UserName = "owner3", Email = "owner3@example.com" };
        await _userManager.CreateAsync(owner);

        // Finished long ago, but received a later, non-activity save since then (e.g. a player
        // toggling a personal chat setting) that bumped UpdatedAt without updateLastActive being
        // set, so LastActiveAt is untouched. This must NOT outrank a game that actually finished
        // (i.e. was last active) more recently.
        var finishedLongAgoButSavedRecently = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Finished long ago, resaved recently",
            OwnerUserId = owner.Id,
            State = GameState.Finished,
            LastActiveAt = DateTimeOffset.UtcNow.AddDays(-30),
            UpdatedAt = DateTimeOffset.UtcNow,
            ViewOfGame = ViewOfGame(6),
        };

        var actuallyFinishedRecently = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Actually finished recently",
            OwnerUserId = owner.Id,
            State = GameState.Finished,
            LastActiveAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ViewOfGame = ViewOfGame(6),
        };

        _db.Games.AddRange(finishedLongAgoButSavedRecently, actuallyFinishedRecently);
        await _db.SaveChangesAsync();

        var result = await _sut.GetLastFinishedGameAsync();

        Assert.NotNull(result);
        Assert.Equal(actuallyFinishedRecently.Id, result!.Id);
    }

    [Fact]
    public async Task GetLastFinishedGameAsync_ReturnsNull_WhenNoGameHasFinished()
    {
        var owner = new ApplicationUser { UserName = "owner2", Email = "owner2@example.com" };
        await _userManager.CreateAsync(owner);

        _db.Games.Add(
            new Game
            {
                Id = Guid.NewGuid(),
                Name = "Still ongoing",
                OwnerUserId = owner.Id,
                State = GameState.Ongoing,
                ViewOfGame = ViewOfGame(6),
            }
        );
        await _db.SaveChangesAsync();

        var result = await _sut.GetLastFinishedGameAsync();

        Assert.Null(result);
    }

    public void Dispose()
    {
        _db.Dispose();
        _provider.Dispose();
    }
}
