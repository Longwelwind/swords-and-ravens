using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Api;

/// <summary>
/// GET/PATCH /api/game/{id} and GET /api/game/{id}/isCancelled. The PATCH handler implements the
/// "delete all + recreate" idempotent replace pattern for Players, same as Django's
/// GameSerializer.update — see MIGRATION_PLAN.md §6. New Players rows are explicitly added via
/// <c>AddRange</c> rather than just assigned to the navigation collection: since their <c>Id</c>
/// is a client-set (non-default) Guid, EF Core's automatic graph fixup otherwise assumes the row
/// already exists and generates an UPDATE instead of an INSERT, which affects 0 rows and throws
/// <see cref="DbUpdateConcurrencyException"/> on every save that adds a player — see
/// GamesApiPlayerReplacementTests for a pinned repro.
///
/// <c>PreviousPlayerInGame</c> is never sent by the game server (it only ever sends the current
/// <c>Players</c> list) — it's entirely computed here by diffing the old and new player lists on
/// every save: a user present before but missing now is recorded as removed, with <c>Reason</c>
/// resolved from the just-saved <c>ViewOfGame</c>'s <c>oldPlayerIds</c>/<c>timeoutPlayerIds</c> via
/// <see cref="Domain.PreviousPlayerReasonResolver"/> (null only if neither array names the user -
/// see that type's doc comment); a user with an existing row who reappears (voted back in) has
/// that row removed again — except while the game is still <see cref="GameState.InLobby"/>, where
/// no row is ever recorded at all: players routinely take and leave seats before a game starts,
/// and none of that is a real "removal" — see <see cref="DiffPreviousPlayers"/> and
/// GamesApiPreviousPlayerDiffTests.
///
/// PATCH also acquires a per-game <see cref="GameSaveLock"/> first, as defense-in-depth against the
/// game server's saves for the same game genuinely overlapping — see that type's doc comment.
///
/// PATCH additionally rejects a save whose <see cref="GamePatchDto.SaveSequence"/> isn't strictly
/// greater than the game's stored <see cref="Game.SaveSequence"/>: <see cref="GameSaveLock"/> only
/// guarantees saves for the same game run one at a time, not that they run in the order the game
/// server generated them, so without this check an older save that happens to arrive second could
/// silently overwrite a newer one (no exception, no visible symptom other than a game's state
/// regressing). See <see cref="Game.SaveSequence"/>'s doc comment for the full reasoning.
///
/// The Players/PreviousPlayers delete+recreate above is skipped entirely when the incoming player
/// list is identical to what's stored (see <see cref="PlayersUnchanged"/>) — most saves during a
/// live game (e.g. one per order placed) only change SerializedGame/ViewOfGame, so this avoids
/// pointless churn on two extra tables on every single one of them.
/// </summary>
public static class GamesApi
{
    public static RouteGroupBuilder MapGamesApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/game")
            .RequireAuthorization(Infrastructure.Auth.MasterApiAuthenticationHandler.SchemeName);

        group.MapGet(
            "/{id:guid}",
            async (Guid id, ApplicationDbContext db) =>
            {
                var game = await db.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id);
                return game is null ? Results.NotFound() : Results.Ok(ToDto(game));
            }
        );

        group.MapGet(
            "/{id:guid}/isCancelled",
            async (Guid id, ApplicationDbContext db) =>
            {
                var state = await db
                    .Games.Where(g => g.Id == id)
                    .Select(g => (GameState?)g.State)
                    .FirstOrDefaultAsync();
                // LiveWebsiteClient.ts's isGameCancelled() reads `response.cancelled` specifically
                // (not `response.is_cancelled`/`isCancelled`), matching Django's exact response shape
                // for this one endpoint — keep the property named "cancelled" even though the
                // snake_case naming policy would otherwise turn "IsCancelled" into "is_cancelled".
                return state is null
                    ? Results.NotFound()
                    : Results.Ok(new { cancelled = state == GameState.Cancelled });
            }
        );

        group.MapPatch(
            "/{id:guid}",
            async (
                Guid id,
                GamePatchDto patch,
                ApplicationDbContext db,
                Infrastructure.Stats.UserStatsRecalculationQueue userStatsQueue
            ) =>
            {
                // See GameSaveLock's doc comment: the game server can (and does, in practice) fire
                // multiple overlapping saves for the same game in quick succession, which otherwise
                // races on the delete-then-recreate Players/PreviousPlayers replace below.
                using var _ = await GameSaveLock.AcquireAsync(id);

                var game = await db
                    .Games.Include(g => g.Players)
                    .Include(g => g.PreviousPlayers)
                    .FirstOrDefaultAsync(g => g.Id == id);

                if (game is null)
                {
                    return Results.NotFound();
                }

                // Reject a stale/out-of-order save outright, before touching anything: the game
                // server's saves are fire-and-forget HTTP PATCHes that can arrive out of order
                // (network/thread-pool jitter), and GameSaveLock only serializes execution, it
                // doesn't reorder by intent. Without this check, an older save that happens to
                // arrive after a newer one would silently overwrite it. See Game.SaveSequence's
                // doc comment.
                if (IsStaleSave(patch.SaveSequence, game.SaveSequence))
                {
                    return Results.Ok(ToDto(game));
                }

                if (patch.SaveSequence is { } incomingSaveSequence)
                {
                    game.SaveSequence = incomingSaveSequence;
                }

                var stateBeforePatch = game.State;

                if (patch.SerializedGame is { } serializedGame)
                {
                    game.SerializedGame = JsonDocument.Parse(serializedGame.GetRawText());
                }

                if (patch.ViewOfGame is { } viewOfGame)
                {
                    game.ViewOfGame = JsonDocument.Parse(viewOfGame.GetRawText());
                }

                if (patch.Version is not null)
                {
                    game.Version = patch.Version;
                }

                if (
                    patch.State is not null
                    && Enum.TryParse<GameState>(patch.State, ignoreCase: true, out var parsedState)
                )
                {
                    game.State = parsedState;
                }

                // A game cancelled before it ever left the lobby (view_of_game.turn still -1, i.e.
                // it never even finished drafting/setup) has nothing worth keeping: no players ever
                // really played, and its chat history is worthless. Delete it outright - game row,
                // public chat room, and all its messages - instead of leaving a dead row around
                // forever. Snr.Migration's ImportGamesAsync applies the exact same rule (and skips
                // importing such games from the legacy DB in the first place) - see its doc comment.
                if (game.State == GameState.Cancelled && IsTurnMinusOne(game.ViewOfGame))
                {
                    var publicChatRoomId =
                        TryGetPublicChatRoomId(game.ViewOfGame)
                        ?? TryGetPublicChatRoomId(game.SerializedGame);
                    if (publicChatRoomId is { } roomId)
                    {
                        var room = await db.Rooms.FirstOrDefaultAsync(r => r.Id == roomId);
                        if (room is not null)
                        {
                            db.Rooms.Remove(room); // cascades to Messages/UsersInRoom
                        }
                    }

                    db.Games.Remove(game); // cascades to PlayersInGame/PreviousPlayersInGame
                    await db.SaveChangesAsync();
                    return Results.NoContent();
                }

                if (patch.Players is not null && !PlayersUnchanged(game.Players, patch.Players))
                {
                    // Diff against the player list as it stood before this save, and the existing
                    // PreviousPlayerInGame rows, before RemoveRange below clears game.Players.
                    var (toAdd, toRemove) = DiffPreviousPlayers(
                        oldPlayerUserIds: game.Players.Select(p => p.UserId),
                        newPlayerUserIds: patch.Players.Select(p => p.User),
                        existingPreviousPlayerUserIds: game.PreviousPlayers.Select(p => p.UserId),
                        gameWasInLobby: stateBeforePatch == GameState.InLobby
                    );

                    db.PlayersInGame.RemoveRange(game.Players);
                    var newPlayers = patch
                        .Players.Select(p => new PlayerInGame
                        {
                            Id = Guid.NewGuid(),
                            GameId = game.Id,
                            UserId = p.User,
                            Data = JsonDocument.Parse(p.Data.GetRawText()),
                        })
                        .ToList();
                    // Explicitly Add these: assigning a brand-new object to a tracked navigation
                    // collection is NOT enough for EF Core to know it's an INSERT. Because Id is a
                    // client-set (non-default) Guid, EF's automatic graph fixup otherwise assumes the
                    // entity already exists and generates an UPDATE instead of an INSERT — which then
                    // affects 0 rows and throws DbUpdateConcurrencyException on every single save that
                    // adds a player, not just under concurrent requests.
                    db.PlayersInGame.AddRange(newPlayers);
                    game.Players = newPlayers;

                    if (toRemove.Count > 0)
                    {
                        db.PreviousPlayersInGame.RemoveRange(
                            game.PreviousPlayers.Where(p => toRemove.Contains(p.UserId))
                        );
                    }

                    if (toAdd.Count > 0)
                    {
                        // Reason is resolved from the just-saved ViewOfGame's flat top-level
                        // oldPlayerIds/timeoutPlayerIds arrays (same logic Snr.Migration's historical
                        // backfill uses, see PreviousPlayerReasonResolver) - null only if the removed
                        // user appears in neither, which given gameWasInLobby above should no longer
                        // happen for a real mid-game removal (see PreviousPlayerCleanup's doc comment).
                        // Not used for win-rate calculation except for one case: a ClockTimeout
                        // removal from a game that's later Cancelled doesn't count as a loss;
                        // every other PreviousPlayerInGame row counts as a loss regardless of
                        // Reason (see MIGRATION_PLAN.md §10.2 / UserStatsService.RecalculateAsync,
                        // which also excludes a game the user had joined as a replacer).
                        db.PreviousPlayersInGame.AddRange(
                            toAdd.Select(userId => new PreviousPlayerInGame
                            {
                                Id = Guid.NewGuid(),
                                GameId = game.Id,
                                UserId = userId,
                                Reason = PreviousPlayerReasonResolver.Resolve(
                                    game.ViewOfGame,
                                    userId
                                ),
                                ReplacedAt = DateTimeOffset.UtcNow,
                            })
                        );
                    }
                }

                game.UpdatedAt = DateTimeOffset.UtcNow;
                if (patch.UpdateLastActive == true)
                {
                    game.LastActiveAt = DateTimeOffset.UtcNow;
                }

                await db.SaveChangesAsync();

                // Every current and former participant's cached win-rate stats become stale the
                // moment a game they were part of finishes OR is cancelled - cancelling flips a
                // clock-timeout PreviousPlayerInGame row from "counts as a loss" (Ongoing) to
                // "doesn't count" (Cancelled), see UserStatsService's doc comment, so a
                // still-Ongoing game later being cancelled must trigger a refresh just as much as
                // finishing does - otherwise a timed-out player's cached stats would keep counting
                // that game as a loss forever, since nothing else would ever re-trigger their
                // recalculation. Recompute in the background rather than on each
                // participant's next profile page view (see UserStatsService's doc comment).
                if (JustFinishedOrCancelled(stateBeforePatch, game.State))
                {
                    foreach (
                        var userId in game
                            .Players.Select(p => p.UserId)
                            .Concat(game.PreviousPlayers.Select(p => p.UserId))
                            .Distinct()
                    )
                    {
                        userStatsQueue.Enqueue(userId);
                    }
                }

                return Results.Ok(ToDto(game));
            }
        );

        return group;
    }

    /// <summary>
    /// True when <paramref name="incomingSaveSequence"/> indicates this save is older than (or a
    /// duplicate of) one that already applied, so it must be rejected outright rather than
    /// overwrite newer data - see <see cref="Game.SaveSequence"/>'s doc comment. Null (a patch
    /// from a game-server build that predates this field, e.g. momentarily during a rolling
    /// deploy) is never considered stale: the guard quietly degrades to a no-op rather than reject
    /// every save from an older game-server version.
    /// </summary>
    internal static bool IsStaleSave(long? incomingSaveSequence, long storedSaveSequence) =>
        incomingSaveSequence is { } seq && seq <= storedSaveSequence;

    /// <summary>
    /// True when this save's state transition is the one time a game's cached win-rate stats need
    /// recomputing for everyone who ever played it: entering <see cref="GameState.Finished"/> (the
    /// obvious case) or entering <see cref="GameState.Cancelled"/> (a clock-timeout
    /// <c>PreviousPlayerInGame</c> row stops counting as a loss once its game is Cancelled - see
    /// <see cref="Services.UserStatsService"/>'s doc comment - so a still-Ongoing game later being
    /// cancelled must refresh stats too, or a timed-out player's cached numbers would keep counting
    /// it as a loss forever). False for every other transition, including the reverse ones (a game
    /// going back from Finished/Cancelled to something else can't currently happen, and no other
    /// transition changes anyone's win-rate facts) and staying in the same state.
    /// </summary>
    internal static bool JustFinishedOrCancelled(GameState before, GameState after) =>
        (before != GameState.Finished && after == GameState.Finished)
        || (before != GameState.Cancelled && after == GameState.Cancelled);

    /// <summary>
    /// True when the incoming player list is identical (same set of user IDs, each with
    /// semantically identical <c>Data</c> JSON) to what's already stored. During a live game the
    /// vast majority of saves change only <c>SerializedGame</c>/<c>ViewOfGame</c> (e.g. every
    /// order placed) — skipping the delete+recreate of every <c>PlayerInGame</c> row (and the
    /// <c>PreviousPlayerInGame</c> diff) on those saves avoids churning two extra tables on every
    /// single save of a busy game for no actual change. A save whose player list did change (join/
    /// leave/replace, or any player's Data actually differing) still goes through the full replace
    /// below. False if the counts differ, which implicitly requires the full path whenever a
    /// player was actually added or removed.
    ///
    /// Compares with <see cref="JsonElement.DeepEquals"/> rather than raw text/string equality:
    /// <c>PlayerInGame.Data</c> is stored in a <c>jsonb</c> column, and Postgres does not preserve
    /// the original text of jsonb values — it reorders object keys (by key length, then
    /// lexicographically) and reformats whitespace when it round-trips them back out. The game
    /// server's freshly-serialized <c>patch.Players[].Data</c> never went through that
    /// normalization, so its property order/formatting routinely differs from the stored value
    /// even when every field's value is identical, which made a raw <c>GetRawText()</c> string
    /// comparison return false on effectively every save (see MIGRATION_PLAN.md §15).
    /// </summary>
    internal static bool PlayersUnchanged(
        IReadOnlyCollection<PlayerInGame> existingPlayers,
        IReadOnlyCollection<PlayerInGamePatchDto> incomingPlayers
    )
    {
        if (existingPlayers.Count != incomingPlayers.Count)
        {
            return false;
        }

        var existingByUser = existingPlayers.ToDictionary(p => p.UserId, p => p.Data);

        return incomingPlayers.All(p =>
            existingByUser.TryGetValue(p.User, out var existingData)
            && existingData is not null
            && JsonElement.DeepEquals(existingData.RootElement, p.Data)
        );
    }

    /// <summary>
    /// Pure diff between the player list before and after a save, plus the set of users who
    /// already have a PreviousPlayerInGame row: returns who should gain a new row (present before,
    /// missing now, no existing row yet) and who should have their existing row removed (missing
    /// before but present again now - voted back in). <paramref name="gameWasInLobby"/> suppresses
    /// ToAdd entirely: players freely take and leave seats while a game is still in its lobby (no
    /// vote/timeout has happened, nothing has been decided or played), so none of that churn is a
    /// real "removal" - it must never create a PreviousPlayerInGame row, which would otherwise
    /// wrongly count as a loss forever (see MIGRATION_PLAN.md §10.2). Doesn't affect ToRemove: a
    /// leftover row from before the game somehow returned to the lobby should still be cleaned up
    /// if that user is seated again. Extracted as a pure, internal helper so
    /// GamesApiPreviousPlayerDiffTests can exercise every case directly without a database.
    /// </summary>
    internal static (List<Guid> ToAdd, List<Guid> ToRemove) DiffPreviousPlayers(
        IEnumerable<Guid> oldPlayerUserIds,
        IEnumerable<Guid> newPlayerUserIds,
        IEnumerable<Guid> existingPreviousPlayerUserIds,
        bool gameWasInLobby
    )
    {
        var oldSet = oldPlayerUserIds.ToHashSet();
        var newSet = newPlayerUserIds.ToHashSet();
        var existingSet = existingPreviousPlayerUserIds.ToHashSet();

        var toAdd = gameWasInLobby
            ? []
            : oldSet.Except(newSet).Where(id => !existingSet.Contains(id)).ToList();
        var toRemove = existingSet.Where(newSet.Contains).ToList();
        return (toAdd, toRemove);
    }

    // internal (not private) so GamesApiCancelledLobbyGameTests can exercise them directly.
    internal static bool IsTurnMinusOne(JsonDocument? viewOfGame) =>
        viewOfGame is not null
        && viewOfGame.RootElement.TryGetProperty("turn", out var turnEl)
        && turnEl.ValueKind == JsonValueKind.Number
        && turnEl.GetInt32() == -1;

    internal static Guid? TryGetPublicChatRoomId(JsonDocument? doc) =>
        doc is not null
        && doc.RootElement.TryGetProperty("publicChatRoomId", out var el)
        && el.ValueKind == JsonValueKind.String
        && Guid.TryParse(el.GetString(), out var id)
            ? id
            : null;

    private static GameDto ToDto(Game game) =>
        new(
            game.Id,
            game.Name,
            game.OwnerUserId,
            game.SerializedGame?.RootElement,
            game.Version,
            game.State.ToString(),
            game.ViewOfGame?.RootElement,
            game.SaveSequence
        );
}
