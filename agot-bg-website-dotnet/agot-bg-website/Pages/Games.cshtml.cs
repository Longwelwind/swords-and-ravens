using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Services.GameListing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Pages;

/// <summary>
/// "All games" — a public list of every in-progress/joinable game, mirroring Django's
/// agotboardgame_main.views.games() (MIGRATION_PLAN.md notes it lived at /games). Every list here
/// is built from <see cref="GameListQueryService"/>, which never loads Game.SerializedGame - see
/// its doc comment.
/// </summary>
public class GamesModel(
    ApplicationDbContext db,
    GameListQueryService gameLists,
    UserManager<ApplicationUser> userManager,
    IAuthorizationService authorizationService,
    Infrastructure.Stats.UserStatsRecalculationQueue userStatsQueue,
    ILogger<GamesModel> logger
) : PageModel
{
    public List<GameListItem> MyGames { get; set; } = [];

    public List<GameListItem> CurrentLiveGames { get; set; } = [];

    public List<GameListItem> OpenGames { get; set; } = [];

    public List<GameListItem> OngoingGames { get; set; } = [];

    public List<GameListItem> InactiveGames { get; set; } = [];

    public List<GameListItem> ReplacementNeededGames { get; set; } = [];

    public List<GameListItem> InactiveTournamentGames { get; set; } = [];

    public List<GameListItem> InactivePrivateGames { get; set; } = [];

    public bool CanCreateGame { get; set; }

    public bool CanPlayAsAnotherPlayer { get; set; }

    public bool CanCancelGame { get; set; }

    public LastFinishedGame? LastFinishedGame { get; set; }

    [TempData]
    public string? ErrorMessage { get; set; }

    public async Task OnGetAsync()
    {
        CanCreateGame = (
            await authorizationService.AuthorizeAsync(User, GamePermissions.CreateGame)
        ).Succeeded;
        CanPlayAsAnotherPlayer = (
            await authorizationService.AuthorizeAsync(User, GamePermissions.ImpersonateOtherPlayers)
        ).Succeeded;
        CanCancelGame = (
            await authorizationService.AuthorizeAsync(User, GamePermissions.CancelGame)
        ).Succeeded;

        var userId = userManager.GetUserId(User);
        var viewerId = userId is not null ? Guid.Parse(userId) : (Guid?)null;

        OpenGames = await gameLists.GetOpenGamesAsync();
        OngoingGames = await gameLists.GetOngoingGamesAsync(viewerId);
        CurrentLiveGames = await gameLists.GetCurrentLiveGamesAsync();
        ReplacementNeededGames = await gameLists.GetReplacementNeededGamesAsync(viewerId);
        LastFinishedGame = await gameLists.GetLastFinishedGameAsync();

        if (viewerId is not null)
        {
            MyGames = await gameLists.GetMyGamesAsync(viewerId.Value);
        }

        if (CanPlayAsAnotherPlayer)
        {
            InactiveGames = await gameLists.GetInactiveGamesAsync(viewerId);
            InactiveTournamentGames = await gameLists.GetInactiveTournamentGamesAsync(viewerId);
        }

        if (CanCancelGame)
        {
            InactivePrivateGames = await gameLists.GetInactivePrivateGamesAsync();
        }
    }

    public async Task<IActionResult> OnPostCreateGameAsync([FromForm] string name)
    {
        if (
            !(await authorizationService.AuthorizeAsync(User, GamePermissions.CreateGame)).Succeeded
        )
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(name) || name.Length > 200)
        {
            ErrorMessage = "Game name must be between 1 and 200 characters.";
            return RedirectToPage();
        }

        var user = await userManager.GetUserAsync(User);
        if (user is null)
        {
            return Challenge();
        }

        var game = new Game
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            OwnerUserId = user.Id,
            State = GameState.InLobby,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            LastActiveAt = DateTimeOffset.UtcNow,
        };

        db.Games.Add(game);
        await db.SaveChangesAsync();

        return Redirect($"/play/{game.Id}");
    }

    /// <summary>
    /// Directly writes <c>Game.State = Cancelled</c>, bypassing the game server entirely —
    /// mirrors Django's <c>agotboardgame_main.views.cancel_game</c> (gated on the
    /// <c>cancel_game</c> permission there, <see cref="GamePermissions.CancelGame"/> here). If the
    /// game server still has this game loaded in memory, a subsequent save from it can overwrite
    /// this — same caveat Django always had; "Join as host" is the more reliable way to actually
    /// resolve a stuck/dead lobby rather than merely marking it cancelled.
    /// </summary>
    public async Task<IActionResult> OnPostCancelGameAsync([FromForm] Guid gameId)
    {
        if (
            !(await authorizationService.AuthorizeAsync(User, GamePermissions.CancelGame)).Succeeded
        )
        {
            return Forbid();
        }

        var game = await db.Games.FindAsync(gameId);
        if (game is not null)
        {
            game.State = GameState.Cancelled;
            game.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();

            // A cancelled game must never count towards anyone's win-rate stats (see
            // UserStatsService's doc comment / MIGRATION_PLAN.md §10.2), but those stats are a
            // cache on ApplicationUser that's only refreshed when enqueued - it wouldn't
            // otherwise happen until each affected player's next unrelated game finishes. Enqueue
            // every current and former (voted out/timed out) participant now, exactly like
            // GamesApi's PATCH handler already does for the Finished transition.
            var affectedUserIds = await db
                .PlayersInGame.Where(p => p.GameId == gameId)
                .Select(p => p.UserId)
                .Concat(
                    db.PreviousPlayersInGame.Where(p => p.GameId == gameId).Select(p => p.UserId)
                )
                .Distinct()
                .ToListAsync();
            userStatsQueue.EnqueueAll(affectedUserIds);

            logger.LogInformation(
                "{Username} ({UserId}) cancelled game {GameName} ({GameId})",
                User.Identity?.Name,
                userManager.GetUserId(User),
                game.Name,
                game.Id
            );
        }

        return RedirectToPage();
    }
}
