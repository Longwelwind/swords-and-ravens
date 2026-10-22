using System.Net;
using System.Net.WebSockets;
using System.Text.Json;
using System.Text.RegularExpressions;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Chat;
using agot_bg_website.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace agot_bg_website.Api;

/// <summary>
/// GET /ws/chat/room/{roomId} — the raw WebSocket endpoint replacing Django Channels'
/// <c>ChatConsumer</c> (chat/consumers.py). Talks the exact same JSON wire protocol as
/// <c>ChatClient.ts</c> and the preact chat widgets, so none of that client code needs to change.
/// See MIGRATION_PLAN.md §7.
/// </summary>
public static class ChatWebSocketApi
{
    // Tongueless members may only reply with a single digit, '+' or '-' — chat/consumers.py.
    // Internal (not private) so ChatWebSocketApiTests can assert its behavior directly.
    internal static readonly Regex TonguelessMessageRegex = new("^[0-9+-]$", RegexOptions.Compiled);

    /// <summary>
    /// Applies the same "cap at room's max_retrieve_count" + "count must be positive" rules the
    /// chat_retrieve handler uses before querying the DB — split out as a pure function so it's
    /// unit-testable without a real WebSocket/DbContext.
    /// </summary>
    internal static int ResolveRetrieveCount(int requestedCount, int? maxRetrieveCount) =>
        maxRetrieveCount.HasValue
            ? Math.Min(requestedCount, maxRetrieveCount.Value)
            : requestedCount;

    internal static string GetChatDisplayName(ApplicationUser user, bool faceless) =>
        faceless ? "" : user.DisplayName;

    public static IEndpointRouteBuilder MapChatWebSocket(this IEndpointRouteBuilder app)
    {
        app.Map(
            "/ws/chat/room/{roomId:guid}",
            async (
                HttpContext context,
                Guid roomId,
                ApplicationDbContext db,
                UserManager<ApplicationUser> userManager,
                ChatConnectionManager connections,
                ChatBroadcaster broadcaster,
                ChatPresenceService presence,
                IMemoryCache memoryCache,
                IEmailSender emailSender,
                IConfiguration configuration,
                ILogger<ChatBroadcaster> logger
            ) =>
            {
                if (!context.WebSockets.IsWebSocketRequest)
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    return;
                }

                if (context.User.Identity?.IsAuthenticated != true)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return;
                }

                var user = await userManager.GetUserAsync(context.User);
                if (user is null)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return;
                }

                var room = await db
                    .Rooms.AsNoTracking()
                    .Where(r => r.Id == roomId)
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.Public,
                        r.MaxRetrieveCount,
                    })
                    .FirstOrDefaultAsync();
                if (room is null)
                {
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }

                var userInRoom = await db.UsersInRoom.FirstOrDefaultAsync(u =>
                    u.UserId == user.Id && u.RoomId == roomId
                );
                if (!room.Public && userInRoom is null)
                {
                    // Private (per-game) rooms require an existing UserInRoom row, created server-side
                    // when the game/room is set up (RoomsApi) — unlike the public/issues rooms, anyone
                    // authenticated may join those on first connect.
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return;
                }

                if (userInRoom is null)
                {
                    userInRoom = new UserInRoom
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        RoomId = roomId,
                    };
                    db.UsersInRoom.Add(userInRoom);
                    await db.SaveChangesAsync();
                }

                // Presence ("connected_users") tracking only applies to the "public" room, not
                // "issues" — matches Django's ChatConsumer.connect (room_name == 'public').
                var isPresenceTrackedRoom = room.Public && room.Name == RoomSeeder.PublicRoomName;

                var socket = await context.WebSockets.AcceptWebSocketAsync();
                var connectionId = connections.Add(roomId, socket, user.Id);

                try
                {
                    if (isPresenceTrackedRoom)
                    {
                        var userData = await GetUserDataAsync(memoryCache, userManager, user);
                        await presence.AddConnectedUserAsync(
                            roomId,
                            connectionId,
                            user.Id,
                            userData
                        );
                        // Also hand the just-computed snapshot straight to this brand-new socket
                        // (see BroadcastConnectedUsersAsync) instead of relying solely on the
                        // pub/sub round trip to relay it back to itself.
                        await BroadcastConnectedUsersAsync(broadcaster, presence, roomId, socket);
                    }

                    await ReceiveLoopAsync(
                        context,
                        roomId,
                        room.Name,
                        room.Public,
                        isPresenceTrackedRoom,
                        connectionId,
                        room.MaxRetrieveCount,
                        user,
                        userInRoom,
                        socket,
                        db,
                        userManager,
                        broadcaster,
                        presence,
                        memoryCache,
                        emailSender,
                        configuration,
                        logger
                    );
                }
                catch (WebSocketException ex)
                {
                    // Expected whenever a client disconnects abruptly (browser tab/app closed,
                    // network drop, phone locked/backgrounded) instead of completing the normal
                    // close handshake - socket.ReceiveAsync throws this from the read loop. Not a
                    // bug, so log it at a low level instead of letting it bubble up to the
                    // exception-handling middleware and get reported to Sentry as an error.
                    logger.LogDebug(
                        ex,
                        "WebSocket for room {RoomId} closed abruptly without a close handshake",
                        roomId
                    );
                }
                catch (OperationCanceledException ex)
                {
                    // Thrown out of the pending ReceiveAsync when the server itself force-closes
                    // this socket via WebSocket.Abort() - e.g. Logout.cshtml.cs aborting a user's
                    // connections on sign-out, so they don't linger in the presence list below
                    // after their auth cookie is already gone. Same "not a bug" treatment as the
                    // WebSocketException case above.
                    logger.LogDebug(
                        ex,
                        "WebSocket for room {RoomId} was force-closed by the server",
                        roomId
                    );
                }
                finally
                {
                    connections.Remove(roomId, connectionId);

                    if (isPresenceTrackedRoom)
                    {
                        await presence.RemoveConnectedUserAsync(roomId, connectionId);
                        await BroadcastConnectedUsersAsync(broadcaster, presence, roomId);
                    }

                    if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
                    {
                        try
                        {
                            await socket.CloseAsync(
                                WebSocketCloseStatus.NormalClosure,
                                null,
                                CancellationToken.None
                            );
                        }
                        catch (WebSocketException)
                        {
                            // Best-effort — the client may have already dropped the connection.
                        }
                    }

                    socket.Dispose();
                }
            }
        );

        return app;
    }

    private static async Task ReceiveLoopAsync(
        HttpContext context,
        Guid roomId,
        string roomName,
        bool roomPublic,
        bool isPresenceTrackedRoom,
        Guid connectionId,
        int? maxRetrieveCount,
        ApplicationUser user,
        UserInRoom userInRoom,
        WebSocket socket,
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        ChatBroadcaster broadcaster,
        ChatPresenceService presence,
        IMemoryCache memoryCache,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger logger
    )
    {
        var buffer = new byte[8192];

        while (socket.State == WebSocketState.Open)
        {
            using var ms = new MemoryStream();
            WebSocketReceiveResult result;
            do
            {
                result = await socket.ReceiveAsync(buffer, CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    return;
                }

                ms.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            ms.Seek(0, SeekOrigin.Begin);

            JsonDocument doc;
            try
            {
                doc = await JsonDocument.ParseAsync(ms);
            }
            catch (JsonException)
            {
                continue;
            }

            using (doc)
            {
                if (!doc.RootElement.TryGetProperty("type", out var typeElement))
                {
                    continue;
                }

                switch (typeElement.GetString())
                {
                    case "chat_message":
                        await HandleChatMessageAsync(
                            doc.RootElement,
                            context,
                            roomId,
                            roomName,
                            roomPublic,
                            user,
                            db,
                            userManager,
                            broadcaster,
                            memoryCache,
                            emailSender,
                            configuration,
                            logger
                        );
                        break;
                    case "presence_heartbeat":
                        if (isPresenceTrackedRoom)
                        {
                            var refreshed = await presence.RefreshConnectionAsync(
                                roomId,
                                connectionId
                            );
                            if (!refreshed)
                            {
                                var userData = await GetUserDataAsync(
                                    memoryCache,
                                    userManager,
                                    user
                                );
                                await presence.AddConnectedUserAsync(
                                    roomId,
                                    connectionId,
                                    user.Id,
                                    userData
                                );
                                await BroadcastConnectedUsersAsync(broadcaster, presence, roomId);
                            }
                        }
                        break;
                    case "chat_view_message":
                        await HandleChatViewMessageAsync(doc.RootElement, userInRoom.Id, db);
                        break;
                    case "chat_retrieve":
                        await HandleChatRetrieveAsync(
                            doc.RootElement,
                            roomId,
                            maxRetrieveCount,
                            userInRoom.Id,
                            socket,
                            db
                        );
                        break;
                }
            }
        }
    }

    private static async Task HandleChatMessageAsync(
        JsonElement data,
        HttpContext context,
        Guid roomId,
        string roomName,
        bool roomPublic,
        ApplicationUser user,
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        ChatBroadcaster broadcaster,
        IMemoryCache memoryCache,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger logger
    )
    {
        var text = data.TryGetProperty("text", out var textElement)
            ? textElement.GetString()
            : null;
        if (string.IsNullOrEmpty(text) || text.Length > 200)
        {
            return;
        }

        var faceless =
            data.TryGetProperty("faceless", out var facelessElement)
            && facelessElement.GetBoolean();

        if (await userManager.IsInRoleAsync(user, RoleNames.Tongueless))
        {
            if (!TonguelessMessageRegex.IsMatch(text))
            {
                return;
            }

            var rateLimitKey = $"chat:tongueless-rate-limit:{user.Id}";
            if (memoryCache.TryGetValue(rateLimitKey, out _))
            {
                // Rate-limited to one message per 60s, mirrors Django's cache.add(..., 60).
                return;
            }

            memoryCache.Set(rateLimitKey, true, TimeSpan.FromSeconds(60));
        }

        var message = new Message
        {
            RoomId = roomId,
            UserId = user.Id,
            Text = text,
        };
        db.Messages.Add(message);
        await db.SaveChangesAsync();

        var evt = new ChatMessageEvent
        {
            Id = message.Id,
            Text = message.Text,
            UserId = user.Id,
            UserUsername = GetChatDisplayName(user, faceless),
            CreatedAt = message.CreatedAt,
        };
        await broadcaster.PublishAsync(roomId, evt);

        if (roomPublic)
        {
            return;
        }

        if (
            data.TryGetProperty("gameId", out var gameIdElement)
            && Guid.TryParse(gameIdElement.GetString(), out var gameId)
        )
        {
            var fromHouse = data.TryGetProperty("fromHouse", out var fromHouseElement)
                ? fromHouseElement.GetString() ?? "Unknown"
                : "Unknown";
            await NotifyChatPartnerAsync(
                context,
                db,
                memoryCache,
                emailSender,
                configuration,
                roomId,
                user,
                message,
                gameId,
                fromHouse
            );
        }
    }

    // Internal (not private) so ChatWebSocketApiTests can exercise the private-message email
    // notification path directly against an in-memory DbContext/cache/fake IEmailSender, without
    // needing a live WebSocket/Redis connection.
    internal static async Task NotifyChatPartnerAsync(
        HttpContext context,
        ApplicationDbContext db,
        IMemoryCache memoryCache,
        IEmailSender emailSender,
        IConfiguration configuration,
        Guid roomId,
        ApplicationUser sender,
        Message message,
        Guid gameId,
        string fromHouse
    )
    {
        var game = await db.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Id == gameId);
        if (game?.ViewOfGame is null)
        {
            return;
        }

        var pbemActive =
            game.ViewOfGame.RootElement.TryGetProperty("settings", out var settings)
            && settings.ValueKind == JsonValueKind.Object
            && settings.TryGetProperty("pbem", out var pbem)
            && pbem.ValueKind == JsonValueKind.True;
        if (!pbemActive)
        {
            return;
        }

        var otherUserInRoom = await db
            .UsersInRoom.AsNoTracking()
            .Include(u => u.User)
            .Where(u => u.RoomId == roomId && u.UserId != sender.Id)
            .FirstOrDefaultAsync();
        var recipient = otherUserInRoom?.User;
        if (
            recipient is null
            || !recipient.EmailNotificationActive
            || !recipient.EmailPrivateMessageNotificationsActive
            || string.IsNullOrEmpty(recipient.Email)
        )
        {
            return;
        }

        // 7-minute de-dupe window per (room, recipient) so a burst of messages only sends one
        // email — mirrors Django's cache.has_key/cache.set(..., 7 * 60).
        var dedupeKey = $"chat:private-notify:{roomId}:{recipient.Id}";
        if (memoryCache.TryGetValue(dedupeKey, out _))
        {
            return;
        }
        memoryCache.Set(dedupeKey, true, TimeSpan.FromMinutes(7));

        // Same reasoning as NotificationsApi's NotifyEndpoint: behind the production reverse
        // proxy, context.Request.Scheme/Host reflect the proxy's connection to Kestrel (plain
        // http on the container network), not the public https://<site> URL a human actually
        // browsed to — so building links from the request alone silently produces broken/
        // insecure URLs in emails. Use the configured public site URL instead, falling back to
        // the request's own host only if it's not configured (e.g. plain local dev).
        var request = context.Request;
        var publicSiteUrl = (
            configuration["PublicSiteUrl"] ?? $"{request.Scheme}://{request.Host}"
        ).TrimEnd('/');
        var gameUrl = $"{publicSiteUrl}/play/{gameId}";
        var encodedGameName = WebUtility.HtmlEncode(game.Name);
        var encodedHouse = WebUtility.HtmlEncode(fromHouse);
        var encodedGameUrl = WebUtility.HtmlEncode(gameUrl);
        // Preserve line breaks the sender typed in the raven message itself, same as the
        // notification templates' <br /> handling — HTML-encode first so real "\r\n"/"\n"
        // sequences don't collide with any encoded entity text.
        var encodedMessage = WebUtility
            .HtmlEncode(message.Text)
            .Replace("\r\n", "<br />")
            .Replace("\n", "<br />");
        var body = EmailTemplates.Build(
            recipient.UserName,
            recipient.Email,
            $"""
            <p>House {encodedHouse} has sent you a raven in the game &quot;{encodedGameName}&quot;:</p>
            <blockquote>{encodedMessage}</blockquote>
            <p><a href="{encodedGameUrl}">{encodedGameUrl}</a></p>
            """
        );

        await emailSender.SendEmailAsync(
            recipient.Email,
            $"You received a new private message in game: '{game.Name}'",
            body
        );
    }

    private static async Task HandleChatViewMessageAsync(
        JsonElement data,
        Guid userInRoomId,
        ApplicationDbContext db
    )
    {
        if (
            !data.TryGetProperty("message_id", out var messageIdElement)
            || messageIdElement.ValueKind != JsonValueKind.Number
            || !messageIdElement.TryGetInt64(out var messageId)
        )
        {
            return;
        }

        await db
            .UsersInRoom.Where(u => u.Id == userInRoomId)
            .ExecuteUpdateAsync(setters =>
                setters.SetProperty(u => u.LastViewedMessageId, messageId)
            );
    }

    private static async Task HandleChatRetrieveAsync(
        JsonElement data,
        Guid roomId,
        int? maxRetrieveCount,
        Guid userInRoomId,
        WebSocket socket,
        ApplicationDbContext db
    )
    {
        var count = data.TryGetProperty("count", out var countElement)
            ? countElement.GetInt32()
            : 0;
        count = ResolveRetrieveCount(count, maxRetrieveCount);
        if (count <= 0)
        {
            return;
        }

        var faceless =
            data.TryGetProperty("faceless", out var facelessElement)
            && facelessElement.GetBoolean();

        long? firstMessageId = null;
        if (
            data.TryGetProperty("first_message_id", out var firstMessageIdElement)
            && firstMessageIdElement.ValueKind == JsonValueKind.Number
            && firstMessageIdElement.TryGetInt64(out var parsedFirstMessageId)
        )
        {
            firstMessageId = parsedFirstMessageId;
        }

        var query = db.Messages.AsNoTracking().Where(m => m.RoomId == roomId);
        if (firstMessageId is { } fid)
        {
            var firstMessageCreatedAt = await db
                .Messages.Where(m => m.Id == fid)
                .Select(m => (DateTimeOffset?)m.CreatedAt)
                .FirstOrDefaultAsync();
            if (firstMessageCreatedAt is { } createdAt)
            {
                query = query.Where(m => m.CreatedAt < createdAt);
            }
        }

        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(count)
            .Include(m => m.User)
            .ToListAsync();
        if (firstMessageId is null)
        {
            // Initial retrieve: reverse to oldest-first, mirroring Django's [0:count:-1] slice-and-reverse trick.
            // "Load more" retrieves intentionally stay newest-first here — the game-server chat client
            // reverses that chunk itself before prepending it (ChatClient.ts loadMoreMessages/addMultipleMessages),
            // matching the old Django behavior where only the initial-retrieve branch reversed.
            messages.Reverse();
        }

        long? lastViewedMessage = null;
        if (firstMessageId is null)
        {
            lastViewedMessage = await db
                .UsersInRoom.Where(u => u.Id == userInRoomId)
                .Select(u => u.LastViewedMessageId)
                .FirstOrDefaultAsync();
        }

        var evt = new MessagesRetrievedEvent
        {
            Type = firstMessageId is null
                ? "chat_messages_retrieved"
                : "more_chat_messages_retrieved",
            Messages = messages
                .Select(m => new MessageData
                {
                    Id = m.Id,
                    Text = m.Text,
                    UserId = m.UserId,
                    UserUsername = m.User is null ? "" : GetChatDisplayName(m.User, faceless),
                    CreatedAt = m.CreatedAt,
                })
                .ToList(),
            LastViewedMessage = lastViewedMessage,
        };

        var bytes = JsonSerializer.SerializeToUtf8Bytes(evt);
        if (socket.State == WebSocketState.Open)
        {
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    /// <param name="alsoSendDirectlyTo">
    /// When set (only on a fresh connect), the freshly-computed snapshot is written straight to
    /// this socket in addition to the normal pub/sub broadcast below. Redis pub/sub has no
    /// delivery guarantee or redelivery: if this instance's own subscription callback for the
    /// message we're about to publish is delayed or dropped, a just-connected client would
    /// otherwise be stuck showing "0 online users" (its own connect is the only thing that would
    /// have refreshed it) until some other user's connect/disconnect happens to broadcast again -
    /// which can be a long time on a quiet room. The direct send makes the very first paint
    /// reliable, independent of that round trip; chat-presence.js's presenceVersion gating makes
    /// receiving the same snapshot twice (direct + relayed) harmless.
    /// </param>
    private static async Task BroadcastConnectedUsersAsync(
        ChatBroadcaster broadcaster,
        ChatPresenceService presence,
        Guid roomId,
        WebSocket? alsoSendDirectlyTo = null
    )
    {
        var (users, prunedConnectionIds, version) = await presence.GetConnectedUsersAsync(roomId);

        if (prunedConnectionIds.Count > 0)
        {
            await broadcaster.PublishAsync(
                roomId,
                new PruneCheckEvent { ConnectionIds = prunedConnectionIds }
            );
        }

        var evt = new ConnectedUsersEvent
        {
            Version = version,
            Users = users.ToDictionary(
                kv => kv.Key.ToString(),
                kv => new ConnectedUserWireData
                {
                    Username = kv.Value.Username,
                    IsAdmin = kv.Value.IsAdmin,
                    IsHighMember = kv.Value.IsHighMember,
                    LastWonTournament = kv.Value.LastWonTournament,
                }
            ),
        };
        await broadcaster.PublishAsync(roomId, evt);

        if (alsoSendDirectlyTo is { State: WebSocketState.Open } socket)
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(evt);
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    // Mirrors Django's get_user_data — cached for 5 minutes to avoid a role/DB lookup on every
    // connect/prune-check cycle.
    private static async Task<ConnectedUserData> GetUserDataAsync(
        IMemoryCache memoryCache,
        UserManager<ApplicationUser> userManager,
        ApplicationUser user
    )
    {
        var cacheKey = ChatUserDataCache.GetKey(user.Id);
        if (memoryCache.TryGetValue(cacheKey, out ConnectedUserData? cached) && cached is not null)
        {
            return cached;
        }

        var roles = await userManager.GetRolesAsync(user);
        var isAdmin = roles.Contains(RoleNames.Admin);
        var isHighMember = !isAdmin && roles.Contains(RoleNames.HighMember);

        var data = new ConnectedUserData(
            user.DisplayName,
            isAdmin,
            isHighMember,
            user.LastWonTournament
        );
        memoryCache.Set(cacheKey, data, TimeSpan.FromMinutes(5));
        return data;
    }
}
