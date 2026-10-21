using Microsoft.AspNetCore.Identity;

namespace agot_bg_website.Domain;

/// <summary>
/// Extended Identity user. Mirrors the fields Django's agotboardgame_main.User carries today,
/// see MIGRATION_PLAN.md §4.2. Uses a Guid key so imported legacy user ids can be preserved
/// exactly (they are embedded inside game-server serialized_game/view_of_game JSON).
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    /// <summary>
    /// We never use phone-number verification and the columns were dropped by the
    /// RemovePhoneNumberFields migration (see ApplicationDbContext's Ignore() calls). Reflection-based
    /// tooling (CoreAdmin's grid generator, Identity's scaffolded "Download personal data" page) reads
    /// CLR properties directly instead of respecting EF's Ignore() mapping or attribute inheritance, so
    /// simply ignoring/overriding the inherited IdentityUser members is not enough to hide them there.
    /// Shadowing with an internal "new" property removes them entirely from public reflection
    /// (GetProperties()) while leaving the still-virtual base members untouched for anything that
    /// references IdentityUser&lt;Guid&gt; directly (e.g. EF Core's UserStore). Internal (rather than
    /// private) so ApplicationDbContext's Ignore() calls below can still reference them by name.
    /// </summary>
    internal new string? PhoneNumber { get; set; }
    internal new bool PhoneNumberConfirmed { get; set; }

    /// <summary>Bearer token the game server uses to authenticate as this user (~ Django game_token).</summary>
    public string GameToken { get; set; } = Guid.NewGuid().ToString("N");

    [PersonalData]
    public string? ProfileText { get; set; }

    public string? LastWonTournament { get; set; }

    [PersonalData]
    public string? CustomUserBadge { get; set; }

    public bool EmailNotificationActive { get; set; } = true;

    public bool EmailGameNotificationsActive { get; set; } = true;

    public bool EmailCombatNotificationsActive { get; set; } = true;

    public bool EmailVoteGameEndNotificationsActive { get; set; } = true;

    public bool EmailPrivateMessageNotificationsActive { get; set; } = true;

    public bool MuteGames { get; set; }

    public bool UseHouseNamesForChat { get; set; }

    public bool UseMapScrollbar { get; set; } = true;

    /// <summary>
    /// Renders the in-game state column on the right instead of the left. Named
    /// UseResponsiveLayoutOnMobile in the legacy Django schema/column (never migrated there - see
    /// MIGRATION_PLAN.md §4.2) but that name no longer matches what the setting actually controls; the
    /// game server's ClientMessage/API contract still needs the old `use_responsive_layout_on_mobile`
    /// JSON key though (see UserDto in agot-bg-website/Api/Dtos.cs), so only the DB column/CLR property
    /// were renamed here, not the wire format.
    /// </summary>
    public bool GameStateColumnRight { get; set; }

    [PersonalData]
    public DateTimeOffset? LastUsernameUpdateTime { get; set; }

    [PersonalData]
    public DateTimeOffset LastActivity { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>True for rows created by the Snr.Migration importer from the legacy Django database.</summary>
    public bool ImportedFromLegacy { get; set; }

    /// <summary>False only for ImportedFromLegacy rows that have not yet been claimed via a real login.</summary>
    public bool Claimed { get; set; } = true;

    [PersonalData]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Cached win-rate stats, recomputed by <see cref="Services.UserStatsService"/> in the
    /// background whenever one of this user's games transitions to Finished (see
    /// Api.GamesApi's PATCH handler and Infrastructure.Stats.UserStatsRecalculationQueue) instead of
    /// being recalculated from PlayerInGame/PreviousPlayerInGame on every profile page view -
    /// User.cshtml.cs's LoadGamesAsync used to do exactly that, loading every one of a user's
    /// games (including the multi-megabyte SerializedGame blob) on every request. <see
    /// cref="StatsCachedAt"/> null means "never computed yet" (e.g. every pre-existing user right
    /// after this feature ships, or before the game server's next PATCH after this feature
    /// ships): User.cshtml.cs shows "n/a"/0 and enqueues a recalculation for that case rather than
    /// computing synchronously (see Services.UserStatsService's doc comment). Cancelled games
    /// never affect any of these fields. <see cref="CachedFinishedGamesCount"/> only counts games
    /// actually played to the end (state Finished) - <see
    /// cref="CachedRemovedFromGameCount"/> (games left early) is folded into <see
    /// cref="CachedWinRate"/>'s denominator separately, always as a loss, but is intentionally
    /// excluded from this count.
    /// </summary>
    public int? CachedWonGamesCount { get; set; }

    public int? CachedFinishedGamesCount { get; set; }

    public int? CachedRemovedFromGameCount { get; set; }

    /// <summary>
    /// Number of games where this user joined as a replacer - i.e. their user id appears in that
    /// game's <c>ViewOfGame.replacerIds</c> (populated by the game server whenever a
    /// player-replacement vote seats a new player into an existing house - see
    /// <c>VoteType.ts</c>'s <c>PlayerReplacement</c> handling and <c>EntireGame.getViewOfGame()</c>).
    /// Excludes only a game that is currently Ongoing and still faceless - a Finished/Cancelled
    /// game is never actually faceless by the time it's counted, since the game server
    /// permanently reveals real usernames once a game ends (see
    /// <c>Services.UserStatsService.RecalculateAsync</c>'s doc comment). Per product decision,
    /// jumping in to help finish someone else's game should never be
    /// penalized: a loss in such a game is excluded from <see cref="CachedWinRate"/>'s numerator
    /// and denominator entirely, while a win still counts normally - see <see
    /// cref="Services.WinRateCalculator"/>.
    /// </summary>
    public int? CachedReplacerGamesCount { get; set; }

    /// <summary>
    /// Subset of <see cref="CachedReplacerGamesCount"/> that counted as a win towards <see
    /// cref="CachedWinRate"/> - i.e. already included in <see cref="CachedWonGamesCount"/>.
    /// Scoped identically to <see cref="CachedWinRate"/> itself (Finished, non-tutorial, recorded
    /// outcome), shown on the profile page purely so the displayed win rate is auditable from the
    /// other numbers - see <see cref="Services.UserStatsResult"/>.
    /// </summary>
    public int? CachedReplacerWinsCount { get; set; }

    /// <summary>
    /// Replacer games that were lost and, per product decision, dropped entirely from <see
    /// cref="CachedWinRate"/>'s numerator and denominator - the flip side of <see
    /// cref="CachedReplacerWinsCount"/>. Also scoped identically to <see cref="CachedWinRate"/>.
    /// </summary>
    public int? CachedReplacerLossesExcludedCount { get; set; }

    public double? CachedWinRate { get; set; }

    public DateTimeOffset? StatsCachedAt { get; set; }

    /// <summary>
    /// Soft-delete flag ("Took the Black"). We deliberately keep the AspNetUsers row instead of
    /// hard-deleting or moving it to a separate table: PlayerInGame/PreviousPlayerInGame/Message
    /// all reference UserId with ON DELETE RESTRICT, so a real delete would either be blocked or
    /// require rewriting every historical game/chat row. Instead AccountDeletionService strips all
    /// PII from this row in place (UserName becomes the user's own Id - Identity's UserValidator
    /// rejects null/duplicate usernames, and the Id is already unique and not PII) and flips this
    /// flag. DisplayName below is what actually shows "Took the Black" to users. See MIGRATION_PLAN.md §13.
    /// </summary>
    public bool IsDeleted { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    /// <summary>Name to show anywhere a username would normally be displayed (games, chat, admin).</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string DisplayName => IsDeleted ? DeletedAccountDisplayName : (UserName ?? "Unknown");

    /// <summary>
    /// The fixed label shown in place of a real username for every soft-deleted account (see
    /// <see cref="DisplayName"/>/<see cref="IsDeleted"/>) - also used by
    /// <c>ReservedUsernames</c> to forbid anyone from actually registering/renaming to this exact
    /// name, which would otherwise be indistinguishable from a deleted account.
    /// </summary>
    public const string DeletedAccountDisplayName = "Took the Black";
}
