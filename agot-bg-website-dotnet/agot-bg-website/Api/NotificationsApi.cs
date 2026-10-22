using System.Net;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Services;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Api;

/// <summary>
/// The game-server-facing notification endpoints, equivalent of Django's
/// api/views.py::notify_* + add_pbem_response_time — see MIGRATION_PLAN.md §6. Each POST body is
/// <c>{ "users": ["&lt;guid&gt;", ...] }</c>; mail is sent only when the master preference and
/// the preference for that notification's category are both on.
/// Subjects/bodies are ported line-for-line from the corresponding
/// agotboardgame_main/templates/agotboardgame_main/*_notification.html templates.
/// </summary>
public static class NotificationsApi
{
    private sealed record NotifyRequest(List<Guid> Users);

    private enum NotificationCategory
    {
        Game,
        Combat,
        VoteGameEnd,
    }

    private sealed record NotificationTemplate(
        NotificationCategory Category,
        Func<Game, string> Subject,
        Func<ApplicationUser, Game, string, string> Body
    );

    // One category, subject, and body builder per notify* route, preserving the wording/structure
    // from the matching Django template, but rendered as HTML because email is sent as HTML.
    private static readonly Dictionary<string, NotificationTemplate> Templates = new()
    {
        ["notifyReadyToStart"] = new(
            NotificationCategory.Game,
            game => $"Your game is ready to start: {game.Name}",
            (user, game, gameUrl) =>
                BuildNotificationEmailHtml(
                    user,
                    $"Your game &quot;{HtmlEncode(game.Name)}&quot; is ready to start:",
                    gameUrl
                )
        ),
        ["notifyYourTurn"] = new(
            NotificationCategory.Game,
            game => $"It's your turn in '{game.Name}'",
            (user, game, gameUrl) =>
                BuildNotificationEmailHtml(
                    user,
                    $"It's your turn to play in &quot;{HtmlEncode(game.Name)}&quot;:",
                    gameUrl
                )
        ),
        ["notifyBribeForSupport"] = new(
            NotificationCategory.Combat,
            game => $"You are attacked and now can call for support in '{game.Name}'",
            (user, game, gameUrl) =>
                BuildNotificationEmailHtml(
                    user,
                    $"You are attacked in the game &quot;{HtmlEncode(game.Name)}&quot; and now you can call for support or try to bribe your way there:",
                    gameUrl
                )
        ),
        ["notifyBattleResults"] = new(
            NotificationCategory.Combat,
            game => $"Your battle is over in '{game.Name}'",
            (user, game, gameUrl) =>
                BuildNotificationEmailHtml(
                    user,
                    $"Your battle in &quot;{HtmlEncode(game.Name)}&quot; is over:",
                    gameUrl
                )
        ),
        ["notifyNewVote"] = new(
            NotificationCategory.VoteGameEnd,
            game => $"Your vote is needed in '{game.Name}'",
            (user, game, gameUrl) =>
                BuildNotificationEmailHtml(
                    user,
                    $"a new vote has been started in &quot;{HtmlEncode(game.Name)}&quot;:",
                    gameUrl
                )
        ),
        ["notifyGameEnded"] = new(
            NotificationCategory.VoteGameEnd,
            game => $"Game has ended -  {game.Name}",
            (user, game, gameUrl) =>
                BuildNotificationEmailHtml(
                    user,
                    $"The game &quot;{HtmlEncode(game.Name)}&quot; has ended:",
                    gameUrl
                )
        ),
    };

    internal static string BuildBodyHtml(
        string route,
        ApplicationUser user,
        Game game,
        string gameUrl
    ) => Templates[route].Body(user, game, gameUrl);

    internal static string BuildNotificationEmailHtml(
        ApplicationUser user,
        string explanationHtml,
        string gameUrl
    )
    {
        var encodedGameUrl = HtmlEncode(gameUrl);

        return EmailTemplates.Build(
            user.UserName,
            user.Email,
            $"""
            <p>{explanationHtml}</p>
            <p><a href="{encodedGameUrl}">{encodedGameUrl}</a></p>
            """
        );
    }

    private static string HtmlEncode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    public static RouteGroupBuilder MapNotificationsApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api")
            .RequireAuthorization(Infrastructure.Auth.MasterApiAuthenticationHandler.SchemeName);

        group.MapPost(
            "/addPbemResponseTime/{userId:guid}/{responseTime:int}",
            async (Guid userId, int responseTime, ApplicationDbContext db) =>
            {
                db.PbemResponseTimes.Add(
                    new PbemResponseTime
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        ResponseTime = responseTime,
                    }
                );
                await db.SaveChangesAsync();
                return Results.NoContent();
            }
        );

        foreach (var route in Templates.Keys)
        {
            group.MapPost(
                $"/{route}/{{gameId:guid}}",
                async (
                    Guid gameId,
                    NotifyRequest body,
                    HttpContext ctx,
                    ApplicationDbContext db,
                    IEmailSender emailSender,
                    IConfiguration configuration
                ) =>
                    await NotifyUsersAsync(
                        route,
                        gameId,
                        body.Users,
                        ctx,
                        db,
                        emailSender,
                        configuration
                    )
            );
        }

        return group;
    }

    internal static async Task<IResult> NotifyUsersAsync(
        string route,
        Guid gameId,
        IReadOnlyCollection<Guid> userIds,
        HttpContext context,
        ApplicationDbContext db,
        IEmailSender emailSender,
        IConfiguration configuration
    )
    {
        var template = Templates[route];
        var game = await db.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Id == gameId);
        if (game is null)
        {
            return Results.NotFound();
        }

        var candidateUsers = db.Users.Where(u =>
            userIds.Contains(u.Id) && u.EmailNotificationActive && u.Email != null
        );
        var eligibleUsers = template.Category switch
        {
            NotificationCategory.Game => candidateUsers.Where(u => u.EmailGameNotificationsActive),
            NotificationCategory.Combat => candidateUsers.Where(u =>
                u.EmailCombatNotificationsActive
            ),
            NotificationCategory.VoteGameEnd => candidateUsers.Where(u =>
                u.EmailVoteGameEndNotificationsActive
            ),
            _ => throw new InvalidOperationException(
                $"Unsupported notification category: {template.Category}"
            ),
        };
        var users = await eligibleUsers.ToListAsync();

        // This endpoint only ever runs on the private GameServerApi Kestrel endpoint
        // (see Program.cs's RequireLocalPort(gameServerApiPort)) - the TypeScript game server
        // dials that internal-only port/host directly, so ctx.Request.Host here would be that
        // internal address (e.g. "localhost:8001"), not the public site humans actually browse
        // to. Use the configured public site URL instead; only fall back to the request's own
        // host if it's not configured.
        var publicSiteUrl = (
            configuration["PublicSiteUrl"] ?? $"{context.Request.Scheme}://{context.Request.Host}"
        ).TrimEnd('/');
        var gameUrl = $"{publicSiteUrl}/play/{gameId}";
        var subject = template.Subject(game);

        foreach (var user in users)
        {
            await emailSender.SendEmailAsync(
                user.Email!,
                subject,
                template.Body(user, game, gameUrl)
            );
        }

        return Results.Ok(new { status = "ok" });
    }
}
