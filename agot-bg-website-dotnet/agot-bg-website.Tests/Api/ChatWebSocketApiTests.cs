using System.Text.Json;
using agot_bg_website.Api;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Chat;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace agot_bg_website.Tests.Api;

/// <summary>
/// Unit tests for the pure logic extracted from <see cref="ChatWebSocketApi"/> (MIGRATION_PLAN.md
/// §7) — the tongueless-message regex and the retrieve-count capping rule. The WebSocket handler
/// itself needs a live DbContext/socket/Redis, so it's exercised via LOCAL_DEV_VERIFICATION.md's
/// manual end-to-end steps instead of here.
/// </summary>
public class ChatWebSocketApiTests
{
    [Theory]
    [InlineData("0")]
    [InlineData("9")]
    [InlineData("+")]
    [InlineData("-")]
    public void TonguelessMessageRegex_AllowsSingleDigitOrPlusMinus(string text)
    {
        Assert.Matches(ChatWebSocketApi.TonguelessMessageRegex, text);
    }

    [Theory]
    [InlineData("")]
    [InlineData("10")]
    [InlineData("hello")]
    [InlineData("++")]
    [InlineData(" ")]
    public void TonguelessMessageRegex_RejectsAnythingElse(string text)
    {
        Assert.DoesNotMatch(ChatWebSocketApi.TonguelessMessageRegex, text);
    }

    [Fact]
    public void ResolveRetrieveCount_ReturnsRequestedCount_WhenNoRoomCap()
    {
        Assert.Equal(30, ChatWebSocketApi.ResolveRetrieveCount(30, maxRetrieveCount: null));
    }

    [Fact]
    public void ResolveRetrieveCount_CapsAtRoomMax_WhenRequestExceedsIt()
    {
        Assert.Equal(50, ChatWebSocketApi.ResolveRetrieveCount(200, maxRetrieveCount: 50));
    }

    [Fact]
    public void ResolveRetrieveCount_KeepsRequestedCount_WhenBelowRoomMax()
    {
        Assert.Equal(10, ChatWebSocketApi.ResolveRetrieveCount(10, maxRetrieveCount: 50));
    }

    [Fact]
    public void GetChatDisplayName_UsesDeletedAccountLabel()
    {
        var user = new ApplicationUser { UserName = Guid.NewGuid().ToString(), IsDeleted = true };

        Assert.Equal(
            ApplicationUser.DeletedAccountDisplayName,
            ChatWebSocketApi.GetChatDisplayName(user, faceless: false)
        );
    }

    [Fact]
    public void GetChatDisplayName_HidesFacelessSender()
    {
        var user = new ApplicationUser { UserName = "robb_stark" };

        Assert.Equal("", ChatWebSocketApi.GetChatDisplayName(user, faceless: true));
    }

    [Fact]
    public void ChatUserDataCache_Invalidate_RemovesCachedUserDetails()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var userId = Guid.NewGuid();
        var key = ChatUserDataCache.GetKey(userId);
        cache.Set(key, "cached");

        ChatUserDataCache.Invalidate(cache, userId);

        Assert.False(cache.TryGetValue(key, out _));
    }
}

/// <summary>
/// Covers <see cref="ChatWebSocketApi.NotifyChatPartnerAsync"/> — the private (per-game) chat
/// room's "notify the other player by email" path, ported from Django's
/// chat/consumers.py::notify_chat_partner. Previously only code-reviewed against Django, never
/// exercised (see LOCAL_DEV_VERIFICATION.md's Chat section) — these tests close that gap using an
/// in-memory DbContext/cache and a fake <see cref="IEmailSender"/>, so no live SMTP/Redis/socket is
/// needed.
/// </summary>
public class ChatWebSocketApiNotifyChatPartnerTests : IDisposable
{
    private sealed class FakeEmailSender : IEmailSender
    {
        public List<(string Email, string Subject, string HtmlMessage)> Sent { get; } = [];

        public Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            Sent.Add((email, subject, htmlMessage));
            return Task.CompletedTask;
        }
    }

    private readonly ApplicationDbContext _db;
    private readonly DbContextOptions<ApplicationDbContext> _dbOptions;
    private readonly IMemoryCache _memoryCache;
    private readonly FakeEmailSender _emailSender = new();
    private readonly HttpContext _httpContext;
    private readonly IConfiguration _configuration = new ConfigurationBuilder().Build();

    public ChatWebSocketApiNotifyChatPartnerTests()
    {
        _dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new ApplicationDbContext(_dbOptions);
        _memoryCache = new MemoryCache(new MemoryCacheOptions());
        _httpContext = new DefaultHttpContext();
        _httpContext.Request.Scheme = "https";
        _httpContext.Request.Host = new HostString("swordsandravens.net");
    }

    private static JsonDocument ViewOfGame(bool pbem) =>
        JsonDocument.Parse($"{{\"settings\":{{\"pbem\":{(pbem ? "true" : "false")}}}}}");

    private async Task<(
        Game Game,
        ApplicationUser Sender,
        ApplicationUser Recipient,
        Guid RoomId
    )> SeedGameWithTwoPlayersAsync(bool pbem, bool recipientWantsEmail = true)
    {
        var sender = new ApplicationUser { UserName = "sender", Email = "sender@example.com" };
        var recipient = new ApplicationUser
        {
            UserName = "recipient",
            Email = "recipient@example.com",
            EmailNotificationActive = recipientWantsEmail,
        };
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Name = "A Game of Thrones",
            ViewOfGame = ViewOfGame(pbem),
        };
        var roomId = Guid.NewGuid();

        _db.Users.AddRange(sender, recipient);
        _db.Games.Add(game);
        _db.UsersInRoom.AddRange(
            new UserInRoom
            {
                Id = Guid.NewGuid(),
                UserId = sender.Id,
                RoomId = roomId,
            },
            new UserInRoom
            {
                Id = Guid.NewGuid(),
                UserId = recipient.Id,
                RoomId = roomId,
            }
        );
        await _db.SaveChangesAsync();

        return (game, sender, recipient, roomId);
    }

    private Task InvokeAsync(
        Guid roomId,
        ApplicationUser sender,
        Game game,
        string text = "Would you support me?",
        string fromHouse = "Stark"
    ) =>
        ChatWebSocketApi.NotifyChatPartnerAsync(
            _httpContext,
            _db,
            _memoryCache,
            _emailSender,
            _configuration,
            roomId,
            sender,
            new Message
            {
                RoomId = roomId,
                UserId = sender.Id,
                Text = text,
            },
            game.Id,
            fromHouse
        );

    [Fact]
    public async Task SendsEmail_ForPbemGame_ToOtherPlayerInRoom()
    {
        var (game, sender, recipient, roomId) = await SeedGameWithTwoPlayersAsync(pbem: true);

        await InvokeAsync(roomId, sender, game, fromHouse: "Stark");

        var sent = Assert.Single(_emailSender.Sent);
        Assert.Equal(recipient.Email, sent.Email);
        Assert.Contains(game.Name, sent.Subject);
        Assert.Contains("House Stark", sent.HtmlMessage);
        Assert.Contains("https://swordsandravens.net/play/", sent.HtmlMessage);
    }

    [Fact]
    public async Task DoesNotSendEmail_ForLiveNonPbemGame()
    {
        var (game, sender, _, roomId) = await SeedGameWithTwoPlayersAsync(pbem: false);

        await InvokeAsync(roomId, sender, game);

        Assert.Empty(_emailSender.Sent);
    }

    [Fact]
    public async Task DoesNotSendEmail_WhenRecipientOptedOutOfEmailNotifications()
    {
        var (game, sender, _, roomId) = await SeedGameWithTwoPlayersAsync(
            pbem: true,
            recipientWantsEmail: false
        );

        await InvokeAsync(roomId, sender, game);

        Assert.Empty(_emailSender.Sent);
    }

    [Fact]
    public async Task DoesNotSendEmail_WhenRecipientOptedOutOfPrivateMessageNotifications()
    {
        var (game, sender, recipient, roomId) = await SeedGameWithTwoPlayersAsync(pbem: true);
        recipient.EmailPrivateMessageNotificationsActive = false;
        await _db.SaveChangesAsync();

        await InvokeAsync(roomId, sender, game);

        Assert.Empty(_emailSender.Sent);
    }

    [Fact]
    public async Task ReadsUpdatedPrivateMessagePreference_FromAnotherContextOnTheSameConnection()
    {
        var (game, sender, recipient, roomId) = await SeedGameWithTwoPlayersAsync(pbem: true);

        // The first notification materializes and tracks the recipient in the sender's long-lived
        // WebSocket DbContext.
        await InvokeAsync(roomId, sender, game);
        Assert.Single(_emailSender.Sent);

        await using (var preferencesDb = new ApplicationDbContext(_dbOptions))
        {
            var preferencesUser = await preferencesDb.Users.SingleAsync(u => u.Id == recipient.Id);
            preferencesUser.EmailPrivateMessageNotificationsActive = false;
            await preferencesDb.SaveChangesAsync();
        }

        // Simulate the seven-minute dedupe window expiring while the sender's socket stays open.
        _memoryCache.Remove($"chat:private-notify:{roomId}:{recipient.Id}");
        _emailSender.Sent.Clear();

        await InvokeAsync(roomId, sender, game);

        Assert.Empty(_emailSender.Sent);
    }

    [Fact]
    public async Task DoesNotSendEmail_WhenNoOtherUserInRoom()
    {
        var sender = new ApplicationUser
        {
            UserName = "lonely-sender",
            Email = "sender@example.com",
        };
        var game = new Game
        {
            Id = Guid.NewGuid(),
            Name = "Solo Room Game",
            ViewOfGame = ViewOfGame(pbem: true),
        };
        var roomId = Guid.NewGuid();
        _db.Users.Add(sender);
        _db.Games.Add(game);
        _db.UsersInRoom.Add(
            new UserInRoom
            {
                Id = Guid.NewGuid(),
                UserId = sender.Id,
                RoomId = roomId,
            }
        );
        await _db.SaveChangesAsync();

        await InvokeAsync(roomId, sender, game);

        Assert.Empty(_emailSender.Sent);
    }

    [Fact]
    public async Task DoesNotSendEmail_WhenGameDoesNotExist()
    {
        var sender = new ApplicationUser { UserName = "sender", Email = "sender@example.com" };
        _db.Users.Add(sender);
        await _db.SaveChangesAsync();

        await ChatWebSocketApi.NotifyChatPartnerAsync(
            _httpContext,
            _db,
            _memoryCache,
            _emailSender,
            _configuration,
            Guid.NewGuid(),
            sender,
            new Message
            {
                RoomId = Guid.NewGuid(),
                UserId = sender.Id,
                Text = "hi",
            },
            gameId: Guid.NewGuid(),
            fromHouse: "Stark"
        );

        Assert.Empty(_emailSender.Sent);
    }

    [Fact]
    public async Task DedupesWithinSevenMinuteWindow_OnlySendingOneEmailPerRoomAndRecipient()
    {
        var (game, sender, _, roomId) = await SeedGameWithTwoPlayersAsync(pbem: true);

        await InvokeAsync(roomId, sender, game, text: "First raven");
        await InvokeAsync(roomId, sender, game, text: "Second raven, sent moments later");

        Assert.Single(_emailSender.Sent);
    }

    public void Dispose() => _db.Dispose();
}
