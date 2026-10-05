using System.Globalization;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Stats;
using agot_bg_website.Services;
using agot_bg_website.Services.GameListing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Pages;

/// <summary>
/// Public user profile, mirroring Django's agotboardgame_main.views.user_profile (route
/// "/user/&lt;uuid:user_id&gt;", template user_profile.html) — see MIGRATION_PLAN.md §10.2/§13/§14.
/// </summary>
public class UserModel(
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    IAuthorizationService authorizationService,
    UserStatsRecalculationQueue userStatsQueue
) : PageModel
{
    /// <summary>Badge color per role - see <see cref="RoleBadges"/>.</summary>
    private static readonly IReadOnlyDictionary<string, string> GroupBadgeClasses =
        RoleBadges.Classes;

    public record GameRow(
        Guid GameId,
        string Name,
        GameState State,
        string? House,
        int PlayersCount,
        int? MaxPlayerCount,
        bool? IsWinner,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastActiveAt,
        int? Turn,
        string? WaitingFor,
        string? Winner,
        string SetupName,
        IReadOnlyList<string> EnabledSettingLabels,
        bool IsPbem,
        string? OwnerDisplayName,
        /// <summary><see cref="ViewOfGameInfo.IsPureReplacer"/> for this row's game, not the raw
        /// <see cref="ViewOfGameInfo.ReplacerIds"/> membership - a user who was an initial player
        /// of this game and also replaced into a different house later must not show the
        /// "Replacer" badge here, since <see cref="UserStatsService"/> doesn't grant that game's
        /// loss/removal exemption either; otherwise the badge and the profile's counts drift
        /// apart for that one game.</summary>
        bool IsReplacer
    );

    /// <summary>A game the viewed user was removed from (voted out/timed out) before it ended,
    /// per <c>PreviousPlayerInGame</c> - never shown anywhere else in the UI, see
    /// MIGRATION_PLAN.md §10.2's "games where you were removed" follow-up. <paramref
    /// name="IsReplacer"/> is <see cref="ViewOfGameInfo.IsPureReplacer"/> (same caveat as <see
    /// cref="GameRow.IsReplacer"/>) - such a removal is still shown here for transparency, but is
    /// excluded from <see cref="RemovedFromGameCount"/>/the win rate, same as a still-seated
    /// replacer's loss - see <see cref="UserStatsService.RecalculateAsync"/>.</summary>
    public record PreviouslyParticipatedGameRow(
        Guid GameId,
        string Name,
        GameState State,
        int PlayersCount,
        int? MaxPlayerCount,
        int? Turn,
        string? WaitingFor,
        string? Winner,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastActiveAt,
        DateTimeOffset? ReplacedAt,
        PlayerReplacementReason? Reason,
        string SetupName,
        IReadOnlyList<string> EnabledSettingLabels,
        bool IsPbem,
        string? OwnerDisplayName,
        bool IsFaceless,
        bool IsReplacer
    );

    public ApplicationUser ViewedUser { get; set; } = null!;

    public List<(string Name, string BadgeClass)> UserGroups { get; set; } = [];

    public bool IsOwnProfile { get; set; }

    public bool OnProbation { get; set; }

    public bool CanPlayAsAnotherPlayer { get; set; }

    public List<GameRow> GamesOfUser { get; set; } = [];

    public List<GameRow> CancelledGames { get; set; } = [];

    public List<PreviouslyParticipatedGameRow> PreviouslyParticipatedGames { get; set; } = [];

    public int OngoingCount { get; set; }

    public int FinishedCount { get; set; }

    public int WonCount { get; set; }

    public int RemovedFromGameCount { get; set; }

    /// <summary>Number of non-faceless games (any state) this user has joined as a replacer - see
    /// <see cref="ApplicationUser.CachedReplacerGamesCount"/>.</summary>
    public int ReplacerGamesCount { get; set; }

    /// <summary>Subset of <see cref="WonCount"/> that came from a replacer game - see <see
    /// cref="ApplicationUser.CachedReplacerWinsCount"/>.</summary>
    public int ReplacerWinsCount { get; set; }

    /// <summary>Replacer games lost, excluded entirely from <see cref="WinRateDisplay"/> - see
    /// <see cref="ApplicationUser.CachedReplacerLossesExcludedCount"/>.</summary>
    public int ReplacerLossesExcludedCount { get; set; }

    public string WinRateDisplay { get; set; } = "n/a";

    public string AveragePbemResponseTimeDisplay { get; set; } = "n/a";

    public string RelativeLastActivity => RelativeTimeFormatter.Format(ViewedUser.LastActivity);

    public async Task<IActionResult> OnGetAsync(Guid id)
    {
        var viewedUser = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (viewedUser is null || viewedUser.IsDeleted)
        {
            // Deleted ("Took the Black") accounts 404 - see MIGRATION_PLAN.md §13/§14.
            return NotFound();
        }

        ViewedUser = viewedUser;

        var currentUserId = userManager.GetUserId(User);
        IsOwnProfile =
            currentUserId is not null
            && Guid.TryParse(currentUserId, out var currentUserGuid)
            && currentUserGuid == id;
        OnProbation = User.IsInRole(RoleNames.OnProbation);
        CanPlayAsAnotherPlayer = (
            await authorizationService.AuthorizeAsync(User, GamePermissions.ImpersonateOtherPlayers)
        ).Succeeded;

        var viewedUserRoles = await userManager.GetRolesAsync(viewedUser);
        UserGroups = GroupBadgeClasses
            .Where(kv => viewedUserRoles.Contains(kv.Key))
            .Select(kv => (kv.Key, kv.Value))
            .ToList();

        await LoadGamesAsync(id);
        await LoadPreviouslyParticipatedGamesAsync(id);
        await LoadStatsAsync(id);

        return Page();
    }

    /// <summary>
    /// Loads every game the viewed user has ever played for the games/cancelled-games tables.
    /// Deliberately projects only the handful of scalar/ViewOfGame columns the page actually
    /// needs instead of `.Include(p => p.Game)`-ing the full <c>Game</c> entity: an `Include`
    /// pulls every column, including `SerializedGame` (a potentially multi-megabyte JSON blob per
    /// game), for every game a user has ever played - hundreds for a long-time user - which was
    /// the entire reason this page loaded dramatically slower than Django's equivalent (which
    /// used `.defer('serialized_game')`). See GameListQueryService.Project() for the same
    /// established pattern elsewhere in this codebase.
    /// </summary>
    private async Task LoadGamesAsync(Guid userId)
    {
        var playerRows = await db
            .PlayersInGame.Where(p =>
                p.UserId == userId && p.Game != null && p.Game.ViewOfGame != null
            )
            .OrderByDescending(p => p.Game!.CreatedAt)
            .Select(p => new
            {
                p.Data,
                p.Game!.Id,
                p.Game.Name,
                p.Game.State,
                p.Game.ViewOfGame,
                p.Game.CreatedAt,
                p.Game.LastActiveAt,
                PlayersCount = p.Game.Players.Count,
                OwnerDisplayName = p.Game.OwnerUser == null
                    ? null
                    : (
                        p.Game.OwnerUser.IsDeleted
                            ? ApplicationUser.DeletedAccountDisplayName
                            : p.Game.OwnerUser.UserName
                    ),
            })
            .ToListAsync();

        foreach (var row in playerRows)
        {
            var view = ViewOfGameInfo.Parse(row.ViewOfGame);

            // A faceless game hides who's playing which house entirely. Keep those hidden on
            // foreign profiles, but let users still see their own faceless games.
            if (view.IsFaceless && !IsOwnProfile)
            {
                continue;
            }

            var winner = GetStringProperty(row.ViewOfGame, "winner");
            var player = PlayerInGameInfo.Parse(row.Data);

            var gameRow = new GameRow(
                row.Id,
                row.Name,
                row.State,
                player.House is not null ? Capitalize(player.House) : null,
                row.PlayersCount,
                view.MaxPlayerCount,
                player.IsWinner,
                row.CreatedAt,
                row.LastActiveAt,
                view.Turn,
                view.WaitingFor,
                winner,
                GameSettingsDisplay.GetSetupName(view.SetupId),
                GameSettingsDisplay.GetEnabledSettingLabels(row.ViewOfGame, row.State),
                view.IsPbem,
                row.OwnerDisplayName,
                view.IsPureReplacer(userId)
            );

            if (row.State == GameState.Cancelled)
            {
                CancelledGames.Add(gameRow);
                continue;
            }

            if (row.State is not (GameState.InLobby or GameState.Ongoing or GameState.Finished))
            {
                continue;
            }

            GamesOfUser.Add(gameRow);

            if (row.State == GameState.Ongoing)
            {
                OngoingCount++;
            }
        }
    }

    /// <summary>
    /// Loads games the viewed user was removed from (voted out/timed out) before they ended - see
    /// <see cref="PreviouslyParticipatedGameRow"/>'s doc comment. Same no-SerializedGame
    /// projection discipline as <see cref="LoadGamesAsync"/>.
    /// </summary>
    private async Task LoadPreviouslyParticipatedGamesAsync(Guid userId)
    {
        // Deliberately NOT filtered the same way UserStatsService's RemovedFromGameCount/win-rate
        // query is (Finished-or-Ongoing only, excluding Cancelled): those two concerns are
        // intentionally decoupled. A removal must never count towards any stat once its game is
        // cancelled (MIGRATION_PLAN.md §10.2) - UserStatsService's own query already enforces that
        // on the stats side and doesn't need to change here. But a player who was voted out/timed
        // out of a game that *later* got cancelled (e.g. the remaining players voted to cancel it
        // afterwards) still genuinely got removed from something real - hiding that from their
        // profile entirely (as excluding Cancelled here used to do) makes it look like it never
        // happened, with nothing in "Games"/"Cancelled games" either, since they're no longer a
        // current PlayerInGame by that point. Every row's Game.State is exposed on
        // PreviouslyParticipatedGameRow.State so the page can badge cancelled entries distinctly.
        // Only excludes InLobby, since a removal can't happen before a game actually starts.
        var rows = await db
            .PreviousPlayersInGame.Where(p => p.UserId == userId && p.Game != null)
            .OrderByDescending(p => p.ReplacedAt)
            .Select(p => new
            {
                p.ReplacedAt,
                p.Reason,
                p.Game!.Id,
                p.Game.Name,
                p.Game.State,
                p.Game.ViewOfGame,
                p.Game.CreatedAt,
                p.Game.LastActiveAt,
                PlayersCount = p.Game.Players.Count,
                OwnerDisplayName = p.Game.OwnerUser == null
                    ? null
                    : (
                        p.Game.OwnerUser.IsDeleted
                            ? ApplicationUser.DeletedAccountDisplayName
                            : p.Game.OwnerUser.UserName
                    ),
            })
            .ToListAsync();

        PreviouslyParticipatedGames = rows.Where(row => row.State != GameState.InLobby)
            .Select(row =>
            {
                var view = ViewOfGameInfo.Parse(row.ViewOfGame);
                var winner = GetStringProperty(row.ViewOfGame, "winner");
                return new PreviouslyParticipatedGameRow(
                    row.Id,
                    row.Name,
                    row.State,
                    row.PlayersCount,
                    view.MaxPlayerCount,
                    view.Turn,
                    view.WaitingFor,
                    winner,
                    row.CreatedAt,
                    row.LastActiveAt,
                    row.ReplacedAt,
                    row.Reason,
                    GameSettingsDisplay.GetSetupName(view.SetupId),
                    GameSettingsDisplay.GetEnabledSettingLabels(row.ViewOfGame, row.State),
                    view.IsPbem,
                    row.OwnerDisplayName,
                    view.IsFaceless,
                    view.IsPureReplacer(userId)
                );
            })
            .ToList();
    }

    private async Task LoadStatsAsync(Guid userId)
    {
        // Prefer the cached stats UserStatsService keeps up to date in the background whenever a
        // game finishes (see Api.GamesApi's PATCH handler) over recomputing from every
        // PlayerInGame/PreviousPlayerInGame row on every single profile view. StatsCachedAt is
        // only ever null for a user whose stats have genuinely never been computed yet (i.e.
        // every pre-existing user right after this feature ships, before their next game
        // finishes) - rather than computing synchronously here (which would reintroduce the same
        // "load everything on every profile view" cost this page was just fixed to avoid), just
        // enqueue it for the background service to pick up and show "n/a"/0 for this one request;
        // the next profile view (this user's own, or anyone else's) will see the cached numbers.
        if (ViewedUser.StatsCachedAt is not null)
        {
            WonCount = ViewedUser.CachedWonGamesCount ?? 0;
            FinishedCount = ViewedUser.CachedFinishedGamesCount ?? 0;
            RemovedFromGameCount = ViewedUser.CachedRemovedFromGameCount ?? 0;
            ReplacerGamesCount = ViewedUser.CachedReplacerGamesCount ?? 0;
            ReplacerWinsCount = ViewedUser.CachedReplacerWinsCount ?? 0;
            ReplacerLossesExcludedCount = ViewedUser.CachedReplacerLossesExcludedCount ?? 0;
            WinRateDisplay = ViewedUser.CachedWinRate.HasValue
                ? $"{(ViewedUser.CachedWinRate.Value * 100).ToString("F1", CultureInfo.InvariantCulture)} %"
                : "n/a";
        }
        else
        {
            userStatsQueue.Enqueue(userId);
        }

        var responseTimes = await db
            .PbemResponseTimes.Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(100)
            .Select(p => p.ResponseTime)
            .ToListAsync();
        var average = PbemResponseTimeCalculator.CalculateAverage(responseTimes);
        AveragePbemResponseTimeDisplay = average.HasValue ? FormatTimeSpan(average.Value) : "n/a";
    }

    private static string? GetStringProperty(System.Text.Json.JsonDocument? doc, string name)
    {
        if (doc is null)
        {
            return null;
        }

        var root = doc.RootElement;
        return
            root.TryGetProperty(name, out var element)
            && element.ValueKind == System.Text.Json.JsonValueKind.String
            ? element.GetString()
            : null;
    }

    private static string Capitalize(string value) =>
        value.Length == 0 ? value : char.ToUpperInvariant(value[0]) + value[1..];

    private static string FormatTimeSpan(TimeSpan span)
    {
        return span.Days > 0
            ? $"{span.Days}d {span.Hours}h {span.Minutes}m"
            : $"{(int)span.TotalHours}h {span.Minutes}m {span.Seconds}s";
    }
}
