using System.Text.Json;

namespace agot_bg_website.Domain;

public enum GameState
{
    InLobby,
    Ongoing,
    Finished,
    Cancelled,
}

/// <summary>
/// A hosted game. SerializedGame/ViewOfGame remain opaque JSON blobs owned by the TS game
/// server — see MIGRATION_PLAN.md §4.2/§4.4. Two small exceptions read a couple of top-level
/// fields directly: <c>GamesApi.cs</c>'s PATCH handler reads <c>view_of_game.turn</c>/
/// <c>publicChatRoomId</c> to delete games cancelled before ever leaving the lobby, and both
/// <c>GamesApi.cs</c> and <c>Snr.Migration</c> read <c>view_of_game.oldPlayerIds</c>/
/// <c>timeoutPlayerIds</c> (via <see cref="PreviousPlayerReasonResolver"/>) to resolve/backfill
/// <see cref="PreviousPlayerInGame"/> rows (see MIGRATION_PLAN.md §10.1). Neither reconstructs the
/// full game state. <c>SerializedGame</c> itself is never parsed by Snr.Migration at all - it's
/// written through as raw text (see Importer.cs's ImportGamesAsync) since it can be multi-MB and
/// its structure is never actually needed there.
/// </summary>
public class Game
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public Guid OwnerUserId { get; set; }

    public ApplicationUser? OwnerUser { get; set; }

    public JsonDocument? SerializedGame { get; set; }

    public JsonDocument? ViewOfGame { get; set; }

    public string? Version { get; set; }

    /// <summary>
    /// Monotonically increasing counter assigned by the game server to every save attempt for
    /// this game (see <c>GlobalServer.saveGame</c>/<c>gameSaveSequences</c> in the TS game
    /// server). The game server's saves are fire-and-forget HTTP PATCHes, so two saves can reach
    /// this API out of order (network/thread-pool jitter); <c>GamesApi</c>'s PATCH handler uses
    /// this column to reject a PATCH whose sequence isn't strictly greater than what's already
    /// stored, so an older save can never silently clobber a newer one. Defaults to 0 so
    /// pre-existing rows (and any patch that omits the field, e.g. a mismatched game-server
    /// version during a rolling deploy) are always accepted.
    /// </summary>
    public long SaveSequence { get; set; }

    public GameState State { get; set; } = GameState.InLobby;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset LastActiveAt { get; set; } = DateTimeOffset.UtcNow;

    public List<PlayerInGame> Players { get; set; } = [];

    public List<PreviousPlayerInGame> PreviousPlayers { get; set; } = [];
}

/// <summary>Current players in a game. Fully replaced on every save, mirroring Django's behavior.</summary>
public class PlayerInGame
{
    public Guid Id { get; set; }

    public Guid GameId { get; set; }

    public Game? Game { get; set; }

    public Guid UserId { get; set; }

    public ApplicationUser? User { get; set; }

    public JsonDocument? Data { get; set; }
}

/// <summary>Reason a player stopped holding a house partway through a game. See MIGRATION_PLAN.md §4.4.</summary>
public enum PlayerReplacementReason
{
    Vote,
    ClockTimeout,
}

/// <summary>
/// A player who was removed from a game before it ended (replaced by a vassal via vote, or timed
/// out). Does not exist in Django today — see MIGRATION_PLAN.md §4.4. Computed entirely by this
/// app itself (never sent by the game server, which only ever sends the current `Players` list on
/// every save) - see GamesApi.cs's PATCH handler: whenever a previously-present user is missing
/// from a save's player list, a row is added here; if a user with an existing row reappears in a
/// later save (voted back in), the row is removed again. At most one row per (GameId, UserId) can
/// exist at a time.
///
/// <see cref="Reason"/> is nullable: both the live save-game endpoint and the historical import
/// backfill (Snr.Migration) resolve it from the game's `ViewOfGame` JSON's flat top-level
/// `oldPlayerIds`/`timeoutPlayerIds` arrays via <see cref="PreviousPlayerReasonResolver"/>, but it
/// stays null if the removed user appears in neither (see MIGRATION_PLAN.md §10.2 - every row
/// counts as a loss regardless of Reason, except a <see cref="PlayerReplacementReason.ClockTimeout"/>
/// row for a game that was later Cancelled, and a row for a game the user had joined as a replacer
/// - see UserStatsService.RecalculateAsync). On the
/// current game server every mid-game removal path (vote/timeout vassalization as well as a
/// player-for-player replace vote) pushes the removed user's id into one of those arrays, so a
/// null Reason on a row created by the live endpoint (<see cref="ReplacedAt"/> set) only ever
/// happens for the now-fixed lobby-seat-change bug. The historical backfill can also leave Reason
/// null for legacy pre-feature games, but always leaves <see cref="ReplacedAt"/> null instead,
/// which is how the two cases are told apart.
/// </summary>
public class PreviousPlayerInGame
{
    public Guid Id { get; set; }

    public Guid GameId { get; set; }

    public Game? Game { get; set; }

    public Guid UserId { get; set; }

    public ApplicationUser? User { get; set; }

    public PlayerReplacementReason? Reason { get; set; }

    public DateTimeOffset? ReplacedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class PbemResponseTime
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public ApplicationUser? User { get; set; }

    public int ResponseTime { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Room
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public bool Public { get; set; }

    public int? MaxRetrieveCount { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<Message> Messages { get; set; } = [];

    public List<UserInRoom> UsersInRoom { get; set; } = [];
}

public class Message
{
    public long Id { get; set; }

    public Guid RoomId { get; set; }

    public Room? Room { get; set; }

    public Guid UserId { get; set; }

    public ApplicationUser? User { get; set; }

    public required string Text { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class UserInRoom
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public ApplicationUser? User { get; set; }

    public Guid RoomId { get; set; }

    public Room? Room { get; set; }

    public long? LastViewedMessageId { get; set; }
}
