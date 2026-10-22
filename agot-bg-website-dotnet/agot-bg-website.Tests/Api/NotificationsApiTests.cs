using agot_bg_website.Api;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace agot_bg_website.Tests.Api;

public class NotificationsApiTests
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

    private sealed class NotificationApiHarness : IDisposable
    {
        private readonly ApplicationDbContext _db;
        private readonly DefaultHttpContext _httpContext = new();
        private readonly IConfiguration _configuration;

        public FakeEmailSender EmailSender { get; }

        private NotificationApiHarness(ApplicationDbContext db, FakeEmailSender emailSender)
        {
            _db = db;
            EmailSender = emailSender;
            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["PublicSiteUrl"] = "https://swordsandravens.example",
                    }
                )
                .Build();
            _httpContext.Request.Scheme = "https";
            _httpContext.Request.Host = new HostString("swordsandravens.example");
        }

        public static NotificationApiHarness Create()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new NotificationApiHarness(
                new ApplicationDbContext(options),
                new FakeEmailSender()
            );
        }

        public async Task SeedAsync(Game game, ApplicationUser user)
        {
            _db.Games.Add(game);
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        public async Task PostAsync(string route, Guid gameId, Guid userId)
        {
            await NotificationsApi.NotifyUsersAsync(
                route,
                gameId,
                [userId],
                _httpContext,
                _db,
                EmailSender,
                _configuration
            );
        }

        public void Dispose() => _db.Dispose();
    }

    public static TheoryData<string, string> HtmlTemplateCases =>
        new()
        {
            { "notifyReadyToStart", "is ready to start:" },
            { "notifyYourTurn", "It's your turn to play in" },
            {
                "notifyBribeForSupport",
                "and now you can call for support or try to bribe your way there:"
            },
            { "notifyBattleResults", "Your battle in" },
            { "notifyNewVote", "a new vote has been started in" },
            { "notifyGameEnded", "has ended:" },
        };

    [Theory]
    [MemberData(nameof(HtmlTemplateCases))]
    public void BuildBodyHtml_RendersHtmlParagraphsAndClickableLink(
        string route,
        string expectedSnippet
    )
    {
        var user = new ApplicationUser { UserName = "Arya" };
        var game = new Game { Name = "Clash for Westeros" };
        const string gameUrl = "https://swordsandravens.net/play/123";

        var html = NotificationsApi.BuildBodyHtml(route, user, game, gameUrl);

        Assert.Contains("<p>Hello Arya,</p>", html);
        Assert.Contains(expectedSnippet, html);
        Assert.Contains(
            "<p><a href=\"https://swordsandravens.net/play/123\">https://swordsandravens.net/play/123</a></p>",
            html
        );
        Assert.Contains("<p>Warmest regards,<br />Staff @ Swords and Ravens</p>", html);
    }

    [Fact]
    public void BuildBodyHtml_HtmlEncodesDynamicUserGameAndUrlContent()
    {
        var user = new ApplicationUser { UserName = "Player <One> & Co" };
        var game = new Game { Name = "Foo & <Bar>" };
        const string gameUrl = "https://example.com/play/123?name=foo&mode=\"pbem\"";

        var html = NotificationsApi.BuildBodyHtml("notifyReadyToStart", user, game, gameUrl);

        Assert.Contains("Hello Player &lt;One&gt; &amp; Co,", html);
        Assert.Contains("Your game &quot;Foo &amp; &lt;Bar&gt;&quot; is ready to start:", html);
        Assert.Contains(
            "<a href=\"https://example.com/play/123?name=foo&amp;mode=&quot;pbem&quot;\">https://example.com/play/123?name=foo&amp;mode=&quot;pbem&quot;</a>",
            html
        );
        Assert.DoesNotContain("Hello Player <One> & Co,", html);
        Assert.DoesNotContain("Your game &quot;Foo & <Bar>&quot; is ready to start:", html);
        Assert.DoesNotContain(
            "<a href=\"https://example.com/play/123?name=foo&mode=\"pbem\"\">",
            html
        );
    }

    [Fact]
    public async Task NotificationEndpoint_HonorsMasterOptOut_EvenWhenCategoryIsEnabled()
    {
        using var harness = NotificationApiHarness.Create();
        var (game, user) = CreateNotificationTarget();
        user.EmailNotificationActive = false;
        await harness.SeedAsync(game, user);

        await harness.PostAsync("notifyReadyToStart", game.Id, user.Id);

        Assert.Empty(harness.EmailSender.Sent);
    }

    [Theory]
    [InlineData("notifyYourTurn", "game")]
    [InlineData("notifyBattleResults", "combat")]
    [InlineData("notifyNewVote", "vote-game-end")]
    public async Task NotificationEndpoint_HonorsTheCategoryPreferenceForItsRoute(
        string route,
        string category
    )
    {
        using var harness = NotificationApiHarness.Create();
        var (game, user) = CreateNotificationTarget();
        switch (category)
        {
            case "game":
                user.EmailGameNotificationsActive = false;
                break;
            case "combat":
                user.EmailCombatNotificationsActive = false;
                break;
            case "vote-game-end":
                user.EmailVoteGameEndNotificationsActive = false;
                break;
        }
        await harness.SeedAsync(game, user);

        await harness.PostAsync(route, game.Id, user.Id);

        Assert.Empty(harness.EmailSender.Sent);
    }

    [Fact]
    public async Task NotificationEndpoint_CategoryPreferencesAreIndependent()
    {
        using var harness = NotificationApiHarness.Create();
        var (game, user) = CreateNotificationTarget();
        user.EmailGameNotificationsActive = false;
        user.EmailCombatNotificationsActive = true;
        await harness.SeedAsync(game, user);

        await harness.PostAsync("notifyYourTurn", game.Id, user.Id);
        await harness.PostAsync("notifyBattleResults", game.Id, user.Id);

        var sent = Assert.Single(harness.EmailSender.Sent);
        Assert.Equal(user.Email, sent.Email);
        Assert.Contains("Your battle in", sent.HtmlMessage);
    }

    [Fact]
    public async Task EmailNotificationPreferences_PersistIndependentlyWhileMasterToggleIsOff()
    {
        var databaseName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var userId = Guid.NewGuid();

        await using (var db = new ApplicationDbContext(options))
        {
            db.Users.Add(
                new ApplicationUser
                {
                    Id = userId,
                    UserName = "Arya",
                    EmailNotificationActive = false,
                    EmailGameNotificationsActive = false,
                    EmailCombatNotificationsActive = true,
                    EmailVoteGameEndNotificationsActive = false,
                    EmailPrivateMessageNotificationsActive = true,
                }
            );
            await db.SaveChangesAsync();
        }

        await using var reloadedDb = new ApplicationDbContext(options);
        var reloaded = await reloadedDb.Users.SingleAsync(user => user.Id == userId);

        Assert.False(reloaded.EmailNotificationActive);
        Assert.False(reloaded.EmailGameNotificationsActive);
        Assert.True(reloaded.EmailCombatNotificationsActive);
        Assert.False(reloaded.EmailVoteGameEndNotificationsActive);
        Assert.True(reloaded.EmailPrivateMessageNotificationsActive);
    }

    private static (Game Game, ApplicationUser User) CreateNotificationTarget()
    {
        var user = new ApplicationUser { UserName = "Arya", Email = "arya@example.com" };
        var game = new Game { Id = Guid.NewGuid(), Name = "Clash for Westeros" };
        return (game, user);
    }
}
