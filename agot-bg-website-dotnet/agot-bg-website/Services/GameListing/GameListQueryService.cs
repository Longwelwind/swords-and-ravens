using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Services.GameListing;

/// <summary>
/// Builds the rows for every "games list" on the Games/MyGames pages, mirroring Django's
/// agotboardgame_main.views.games()/my_games() + views_helpers.enrich_games() (MIGRATION_PLAN.md
/// §10 references the legacy templates directly). Every query here selects into
/// <see cref="GameProjection"/> instead of the <see cref="Game"/> entity, which — like Django's
/// `.defer('serialized_game')` — means the (potentially multi-MB) SerializedGame jsonb column is
/// never fetched from Postgres for these list views; only ViewOfGame (small) is loaded.
/// </summary>
public sealed class GameListQueryService(ApplicationDbContext db)
{
    private static readonly TimeSpan TenMinutes = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan TwoDays = TimeSpan.FromDays(2);
    private static readonly TimeSpan FiveDays = TimeSpan.FromDays(5);
    private static readonly TimeSpan EightDays = TimeSpan.FromDays(8);
    private static readonly TimeSpan TwoWeeks = TimeSpan.FromDays(14);

    private sealed record GameProjection(
        Guid Id,
        string Name,
        GameState State,
        Guid OwnerUserId,
        string? OwnerDisplayName,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastActiveAt,
        JsonDocument? ViewOfGame,
        List<PlayerProjection> Players
    );

    private sealed record PlayerProjection(
        Guid UserId,
        JsonDocument? Data,
        DateTimeOffset UserLastActivity,
        string? UserDisplayName
    );

    private IQueryable<GameProjection> Project(IQueryable<Game> source) =>
        source
            .Where(g => g.ViewOfGame != null)
            .Select(g => new GameProjection(
                g.Id,
                g.Name,
                g.State,
                g.OwnerUserId,
                g.OwnerUser == null
                    ? null
                    : (
                        g.OwnerUser.IsDeleted
                            ? ApplicationUser.DeletedAccountDisplayName
                            : g.OwnerUser.UserName
                    ),
                g.CreatedAt,
                g.LastActiveAt,
                g.ViewOfGame,
                g.Players.Select(p => new PlayerProjection(
                        p.UserId,
                        p.Data,
                        p.User!.LastActivity,
                        p.User.IsDeleted
                            ? ApplicationUser.DeletedAccountDisplayName
                            : p.User.UserName
                    ))
                    .ToList()
            ));

    /// <summary>Open (IN_LOBBY) games, newest first.</summary>
    public async Task<List<GameListItem>> GetOpenGamesAsync(int take = 200)
    {
        var rows = await Project(
                db.Games.Where(g => g.State == GameState.InLobby)
                    .OrderByDescending(g => g.CreatedAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Select(r => Build(r, currentUserId: null)).ToList();
    }

    /// <summary>
    /// Ongoing games, most recently active first. <paramref name="viewerId"/> (if given) is used
    /// only to populate each row's own MyHouse/MyTurn (so the UI can show a "Playing"/"Your turn"
    /// badge) - this is free, since <see cref="Project"/> already loads every game's Players.
    /// </summary>
    public async Task<List<GameListItem>> GetOngoingGamesAsync(
        Guid? viewerId = null,
        int take = 200
    )
    {
        var rows = await Project(
                db.Games.Where(g => g.State == GameState.Ongoing)
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Select(r => Build(r, viewerId)).ToList();
    }

    /// <summary>
    /// Live (non-PBEM) games worth drawing attention to right now: open lobbies that already
    /// have at least one player waiting, plus ongoing games active within the last 10 minutes.
    /// Mirrors Django's `open_live_games` + `running_live_games` (agotboardgame_main.views.games/
    /// my_games), merged into a single list here since the caller doesn't need to distinguish
    /// lobby vs. ongoing rows - both cases are already covered by the separate Open/Ongoing
    /// games lists elsewhere on the page, so a game legitimately shows up twice.
    /// </summary>
    public async Task<List<GameListItem>> GetCurrentLiveGamesAsync(int take = 200)
    {
        var tenMinutesAgo = DateTimeOffset.UtcNow - TenMinutes;

        var rows = await Project(
                db.Games.Where(g =>
                        (g.State == GameState.InLobby && g.Players.Any())
                        || (g.State == GameState.Ongoing && g.LastActiveAt > tenMinutesAgo)
                    )
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Select(r => Build(r, currentUserId: null)).Where(item => !item.IsPbem).ToList();
    }

    /// <summary>Every open/ongoing game the given user is currently a player in.</summary>
    public async Task<List<GameListItem>> GetMyGamesAsync(Guid userId)
    {
        var rows = await Project(
                db.Games.Where(g =>
                        (g.State == GameState.InLobby || g.State == GameState.Ongoing)
                        && g.Players.Any(p => p.UserId == userId)
                    )
                    .OrderByDescending(g => g.LastActiveAt)
            )
            .ToListAsync();

        var items = rows.Select(r => Build(r, userId)).ToList();
        await EnrichUnreadMessagesAsync(items, rows, userId);
        return items;
    }

    /// <summary>
    /// Ongoing, public games with no move for 5+ days that are NOT already covered by
    /// <see cref="GetReplacementNeededGamesAsync"/> (that one takes priority - a game only needs
    /// showing once). Mirrors Django's `inactive_games`. <paramref name="viewerId"/> (if given) is
    /// used only to populate the row's own MyHouse/MyTurn so the UI can hide the "Join as ..."
    /// action when the viewer is already a player in that particular game.
    /// </summary>
    public async Task<List<GameListItem>> GetInactiveGamesAsync(
        Guid? viewerId = null,
        int take = 200
    )
    {
        var fiveDaysAgo = DateTimeOffset.UtcNow - FiveDays;

        var rows = await Project(
                db.Games.Where(g => g.State == GameState.Ongoing && g.LastActiveAt < fiveDaysAgo)
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Select(r =>
                Build(
                    r,
                    currentUserId: viewerId,
                    computeReplacementNeeded: true,
                    computeJoinAsWaiting: true
                )
            )
            .Where(item => !item.IsPrivate && item.ReplacementNeededFor is null)
            .ToList();
    }

    /// <summary>
    /// Ongoing, public games where the last move was 2+ days ago and at least one currently
    /// waited-for player hasn't logged in for 8+ days, and no replace-player vote is already
    /// running. Mirrors Django's `replacement_needed_games`. <paramref name="viewerId"/> (if given)
    /// is used only to populate the row's own MyHouse/MyTurn so the UI can hide the
    /// "Join as ..." action when the viewer is already a player in that particular game.
    /// </summary>
    public async Task<List<GameListItem>> GetReplacementNeededGamesAsync(
        Guid? viewerId = null,
        int take = 200
    )
    {
        var twoDaysAgo = DateTimeOffset.UtcNow - TwoDays;

        var rows = await Project(
                db.Games.Where(g => g.State == GameState.Ongoing && g.LastActiveAt < twoDaysAgo)
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Select(r => Build(r, currentUserId: viewerId, computeReplacementNeeded: true))
            .Where(item => !item.IsPrivate && item.ReplacementNeededFor is not null)
            .ToList();
    }

    /// <summary>Ongoing tournament-mode games with no move for 2+ days. Admin/High Member only in the UI.</summary>
    public async Task<List<GameListItem>> GetInactiveTournamentGamesAsync(
        Guid? viewerId = null,
        int take = 200
    )
    {
        var twoDaysAgo = DateTimeOffset.UtcNow - TwoDays;

        var rows = await Project(
                db.Games.Where(g => g.State == GameState.Ongoing && g.LastActiveAt < twoDaysAgo)
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Where(r => ViewOfGameInfo.Parse(r.ViewOfGame).IsTournamentMode)
            .Select(r => Build(r, currentUserId: viewerId, computeJoinAsWaiting: true))
            .ToList();
    }

    /// <summary>
    /// The most recently finished game (by LastActiveAt - mirroring the original Django model's
    /// <c>Meta.get_latest_by = "last_active_at"</c>/<c>Game.objects.filter(state=FINISHED).latest()</c>).
    /// LastActiveAt is only bumped when the game server's save explicitly flags
    /// <c>updateLastActive</c> (see GamesApi.cs's PATCH handler) - i.e. for a real player action,
    /// never for a save triggered by e.g. a personal chat/notification setting change (see
    /// EntireGame.onClientMessage's "change-settings"/"change-game-settings" handling in the game
    /// server, which leaves updateLastActive false). Once a game reaches Finished, no further
    /// player action can occur, so LastActiveAt naturally freezes at the moment it truly finished
    /// - unlike CreatedAt (reflects only when the game was created/started, not finished) or
    /// UpdatedAt (bumped unconditionally on every single save, including harmless post-finish
    /// ones, so it would make an old finished game reappear as "last finished" for no real
    /// reason). Shown as a "Last finished game" link above the online-users list on
    /// Games/MyGames. Returns null if no game has finished yet.
    /// </summary>
    public async Task<LastFinishedGame?> GetLastFinishedGameAsync()
    {
        var row = await Project(
                db.Games.Where(g => g.State == GameState.Finished)
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(1)
            )
            .FirstOrDefaultAsync();

        if (row is null)
        {
            return null;
        }

        var view = ViewOfGameInfo.Parse(row.ViewOfGame);
        return new LastFinishedGame(row.Id, row.Name, row.Players.Count, view.MaxPlayerCount);
    }

    /// <summary>Ongoing private games with no move for 14+ days. Admin only in the UI.</summary>
    public async Task<List<GameListItem>> GetInactivePrivateGamesAsync(int take = 200)
    {
        var twoWeeksAgo = DateTimeOffset.UtcNow - TwoWeeks;

        var rows = await Project(
                db.Games.Where(g => g.State == GameState.Ongoing && g.LastActiveAt < twoWeeksAgo)
                    .OrderByDescending(g => g.LastActiveAt)
                    .Take(take)
            )
            .ToListAsync();

        return rows.Select(r => Build(r, currentUserId: null))
            .Where(item => item.IsPrivate)
            .ToList();
    }

    private GameListItem Build(
        GameProjection row,
        Guid? currentUserId,
        bool computeReplacementNeeded = false,
        bool computeJoinAsWaiting = false
    )
    {
        var view = ViewOfGameInfo.Parse(row.ViewOfGame);

        PlayerInGameInfo myPlayer = PlayerInGameInfo.Empty;
        if (currentUserId is not null)
        {
            var myRow = row.Players.FirstOrDefault(p => p.UserId == currentUserId);
            if (myRow is not null)
            {
                myPlayer = PlayerInGameInfo.Parse(myRow.Data);
            }
        }

        string? replacementNeededFor = null;
        Guid? joinAsUserId = null;
        if (row.State == GameState.Ongoing && view.WaitingForIds.Count > 0)
        {
            if (computeReplacementNeeded && !view.ReplacePlayerVoteOngoing)
            {
                var eightDaysAgo = DateTimeOffset.UtcNow - EightDays;
                var inactiveWaitedPlayers = row
                    .Players.Where(p =>
                        view.WaitingForIds.Contains(p.UserId) && p.UserLastActivity < eightDaysAgo
                    )
                    .ToList();

                if (inactiveWaitedPlayers.Count > 0)
                {
                    var parts = inactiveWaitedPlayers.Select(p =>
                    {
                        var info = PlayerInGameInfo.Parse(p.Data);
                        var house = info.House is not null
                            ? Capitalize(info.House)
                            : "Unknown House";
                        return view.IsFaceless ? house : $"{house} ({p.UserDisplayName})";
                    });
                    replacementNeededFor = string.Join(", ", parts);
                    joinAsUserId = inactiveWaitedPlayers[0].UserId;
                }
            }

            // High Members/Admins may impersonate the currently waited-for player on a stalled
            // game to keep it moving, even if that player isn't (yet) inactive long enough to
            // trigger the stricter "replacement needed" badge above - see GetInactiveGamesAsync.
            if (computeJoinAsWaiting && joinAsUserId is null)
            {
                joinAsUserId = row
                    .Players.FirstOrDefault(p => view.WaitingForIds.Contains(p.UserId))
                    ?.UserId;
            }
        }

        return new GameListItem(
            row.Id,
            row.Name,
            row.State,
            row.OwnerUserId,
            row.OwnerDisplayName,
            row.Players.Count,
            view.MaxPlayerCount,
            view.IsPbem,
            view.IsPasswordProtected,
            view.IsPrivate,
            view.IsFaceless,
            row.CreatedAt,
            row.LastActiveAt,
            view.Turn,
            view.WaitingFor,
            myPlayer.House is not null ? Capitalize(myPlayer.House) : null,
            myPlayer.WaitedFor,
            myPlayer.NeededForVote,
            UnreadPublicMessages: false,
            UnreadPrivateMessages: false,
            replacementNeededFor,
            joinAsUserId,
            GameSettingsDisplay.GetSetupName(view.SetupId),
            GameSettingsDisplay.GetEnabledSettingLabels(row.ViewOfGame, row.State)
        );
    }

    /// <summary>
    /// Batch-computes unread public/private message badges for "my games" - a game only ever
    /// shows these for the signed-in player's own row, mirroring Django's enrich_important_messages.
    /// Runs as 2 queries total (not one query per room like Django's enrich_games loop).
    /// </summary>
    private async Task EnrichUnreadMessagesAsync(
        List<GameListItem> items,
        List<GameProjection> rows,
        Guid userId
    )
    {
        var roomIds = new HashSet<Guid>();
        var perGamePublicRoom = new Dictionary<Guid, Guid>();
        var perGamePrivateRooms = new Dictionary<Guid, List<Guid>>();

        foreach (var row in rows)
        {
            var myRow = row.Players.FirstOrDefault(p => p.UserId == userId);
            if (myRow is null)
            {
                continue;
            }

            var view = ViewOfGameInfo.Parse(row.ViewOfGame);
            if (view.PublicChatRoomId is { } publicRoomId)
            {
                perGamePublicRoom[row.Id] = publicRoomId;
                roomIds.Add(publicRoomId);
            }

            var myPlayer = PlayerInGameInfo.Parse(myRow.Data);
            if (myPlayer.ImportantChatRoomIds.Count > 0)
            {
                perGamePrivateRooms[row.Id] = myPlayer.ImportantChatRoomIds.ToList();
                foreach (var roomId in myPlayer.ImportantChatRoomIds)
                {
                    roomIds.Add(roomId);
                }
            }
        }

        if (roomIds.Count == 0)
        {
            return;
        }

        var idsList = roomIds.ToList();

        var roomMaxMessageCreatedAt = await db
            .Messages.Where(m => idsList.Contains(m.RoomId))
            .GroupBy(m => m.RoomId)
            .Select(g => new { RoomId = g.Key, MaxCreatedAt = g.Max(m => m.CreatedAt) })
            .ToDictionaryAsync(x => x.RoomId, x => x.MaxCreatedAt);

        var userLastViewedCreatedAt = await db
            .UsersInRoom.Where(uir => uir.UserId == userId && idsList.Contains(uir.RoomId))
            .Select(uir => new
            {
                uir.RoomId,
                LastViewedCreatedAt = uir.LastViewedMessageId == null
                    ? (DateTimeOffset?)null
                    : db
                        .Messages.Where(m => m.Id == uir.LastViewedMessageId)
                        .Select(m => m.CreatedAt)
                        .FirstOrDefault(),
            })
            .ToDictionaryAsync(x => x.RoomId, x => x.LastViewedCreatedAt);

        bool HasUnread(Guid roomId)
        {
            if (!roomMaxMessageCreatedAt.TryGetValue(roomId, out var maxCreatedAt))
            {
                return false; // room has no messages at all
            }

            return !userLastViewedCreatedAt.TryGetValue(roomId, out var lastViewed)
                || lastViewed is null
                || lastViewed < maxCreatedAt;
        }

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var unreadPublic =
                perGamePublicRoom.TryGetValue(item.Id, out var publicRoomId)
                && HasUnread(publicRoomId);
            var unreadPrivate =
                perGamePrivateRooms.TryGetValue(item.Id, out var privateRoomIds)
                && privateRoomIds.Any(HasUnread);

            if (
                unreadPublic != item.UnreadPublicMessages
                || unreadPrivate != item.UnreadPrivateMessages
            )
            {
                items[i] = item with
                {
                    UnreadPublicMessages = unreadPublic,
                    UnreadPrivateMessages = unreadPrivate,
                };
            }
        }
    }

    private static string Capitalize(string value) =>
        value.Length == 0 ? value : char.ToUpperInvariant(value[0]) + value[1..];
}
