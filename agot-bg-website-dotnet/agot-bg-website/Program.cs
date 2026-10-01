using System.Text.Json;
using agot_bg_website.Api;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Chat;
using agot_bg_website.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;
using Soenneker.Validators.Email.Disposable.Online.Registrars;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Local dev profiles (Properties/launchSettings.json) now explicitly set
// ASPNETCORE_ENVIRONMENT=Development again ("Staging" is the DO droplet, unset/"Production" is
// the eventual live site — see appsettings.Staging.json and README.md's "Environments" section),
// specifically so IsDevelopment()/IsStaging()/IsProduction() can reliably tell "local machine"
// apart from "a deployed instance" (e.g. RoomSeeder only auto-creates the public/issues chat
// rooms in Development — Staging/Production always get them from the legacy data import
// instead). WebApplicationBuilder already wires up user secrets automatically when the
// environment is "Development", but this call is kept (and is a harmless no-op there) since
// Staging/Production still need it added explicitly to keep `dotnet user-secrets set ...` working
// the same way everywhere.
builder.Configuration.AddUserSecrets<Program>(optional: true);

// Error tracking. Deliberately reuses the SAME Sentry DSN/project as the Django site used to and
// the TS game server still does (SENTRY_DSN env var, see docker-compose.prod.yml/
// .env.prod.example) — one Sentry project can safely receive events from multiple SDKs/languages
// at once (each event is tagged with its own `platform`, e.g. "csharp" vs "node"), so this keeps
// all of Swords and Ravens' errors in one place instead of needing a second Sentry project. Only
// initializes when a DSN is actually configured, mirroring agotboardgame/settings.py's
// `if not DEBUG and os.environ.get('SENTRY_DSN') is not None` and server.ts's
// `if (process.env.SENTRY_DSN)` — leaving SENTRY_DSN unset (e.g. for local debugging) disables it
// entirely with no extra config needed.
var sentryDsn = builder.Configuration["SENTRY_DSN"];
if (!string.IsNullOrEmpty(sentryDsn))
{
    builder.WebHost.UseSentry(options =>
    {
        options.Dsn = sentryDsn;
        options.Environment = builder.Environment.EnvironmentName;
        // Sends request/user data (matches Django's send_default_pii=True) — safe here since this
        // is a private, non-public-facing DSN in server-side config, never shipped to the browser.
        options.SendDefaultPii = true;
        // Only send an event for truly unhandled exceptions - those are always captured
        // separately by Sentry's own middleware (SentryMiddleware.InvokeAsync catches whatever
        // propagates out of the request pipeline) regardless of this setting. Without this, the
        // ILogger integration's default (MinimumEventLevel = LogLevel.Error) means EVERY
        // logger.LogError(...) call anywhere in the app - including ones we deliberately catch
        // and log without rethrowing, like the email senders' "failed to send, but don't crash
        // the caller" handlers - also creates its own separate Sentry event, drowning out real
        // unhandled-exception alerts. LogError/LogWarning/etc. still show up as breadcrumbs
        // (MinimumBreadcrumbLevel stays at its Information default) for context on whatever event
        // does get sent.
        options.MinimumEventLevel = LogLevel.Critical;
    });
}

// The /api/* Minimal API endpoints (Api/UsersApi.cs, GamesApi.cs, RoomsApi.cs,
// NotificationsApi.cs) are the private REST contract the TS game server's
// WebsiteClient.ts/LiveWebsiteClient.ts speak — a straight port of Django's snake_case DRF
// serializers (see MIGRATION_PLAN.md §6). The DTOs in Api/Dtos.cs were written assuming this
// naming policy was configured, but it never actually was, so every response silently serialized
// with ASP.NET Core's Minimal API default (camelCase) instead of snake_case — e.g. UserDto's
// GameToken came back as "gameToken", not "game_token", which is why
// GlobalServer.ts's `userData.token != authToken` check (userData.token being undefined) always
// failed once real credentials were wired up. PropertyNamingPolicy affects both directions
// (serializing responses AND binding incoming PATCH/POST bodies), so this single fix also makes
// GamesApi's PATCH body (serialized_game/view_of_game/update_last_active/...) and RoomsApi's
// CreateRoomDto (max_retrieve_count) bind correctly, which likely never worked either.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
});

// Add services to the container.
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseNpgsql(connectionString));

// Third-party "CoreAdmin" NuGet package, kept alongside the hand-built Admin area
// (Users/Games/Rooms/Messages) rather than replacing it. It auto-scans ApplicationDbContext and
// generates generic CRUD grids for every DbSet — the closest off-the-shelf equivalent to Django's
// built-in admin site — which makes it handy for ad-hoc poking at tables nobody has built a
// dedicated screen for. It needs classic MVC controllers (AddControllersWithViews +
// MapDefaultControllerRoute below), unlike the rest of this app which is Razor Pages only.
// Gated to the same Admin role as the custom Admin area via the "Admin" role name argument.
//
// It does NOT replace Areas/Admin/Pages/Games/Edit.cshtml: CoreAdmin can't edit JsonDocument
// columns, so Game.SerializedGame/ViewOfGame — the whole reason an admin ever needs to touch a
// Game row — are read-only there. The custom Admin area stays the only way to repair a broken
// serialized game, and is also the base for the planned High Member operations screens.
builder.Services.AddControllersWithViews();
builder.Services.AddCoreAdmin(RoleNames.Admin);

// GDPR: require explicit cookie consent (via _CookieConsentPartial.cshtml) before any
// non-essential cookie is written. Identity's own auth cookies are marked "Essential" by the
// framework, so signing in/out keeps working even before a visitor accepts the banner.
builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.CheckConsentNeeded = _ => true;
    options.MinimumSameSitePolicy = SameSiteMode.Lax;
});

// Email confirmation is always required, in every environment (matches production and lets
// local testing exercise the real confirm-email flow instead of silently skipping it). Locally
// there is usually no mail sender configured, so unconfirmed accounts simply can't log in until
// either a real SMTP relay is configured (see README.md "Email" section) or the confirmation link
// is grabbed from smtp4dev's web UI at http://localhost:5099. Each external OAuth provider below
// is only wired up when its ClientId/ClientSecret are actually configured (via
// appsettings/user-secrets/env vars), so local debugging can run with individual
// (username/password) accounts only, with no OAuth app registrations needed.
//
// Registered before AddIdentity() below so its TryAddScoped<IUserValidator<TUser>, ...>() call is
// a no-op: see SafeUserValidator's own doc comment for why the built-in UserValidator<TUser> must
// be replaced, not just supplemented, to avoid a crash on legacy duplicate-email data.
builder.Services.AddScoped<IUserValidator<ApplicationUser>, SafeUserValidator>();
builder
    .Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
    {
        options.SignIn.RequireConfirmedAccount = true;
        // Two different ApplicationUsers must never share an email: Register.cshtml.cs and
        // ExternalLogin.cshtml.cs both rely on FindByEmailAsync returning at most one match so
        // local-password and external-login accounts can be told apart/linked correctly.
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders()
    .AddDefaultUI();

// Replaces the SignInManager<ApplicationUser> that AddIdentity() above registered, with one whose
// CanSignInAsync also refuses banned members — see AppSignInManager for why this is the one choke
// point that covers password login, external OAuth login, and 2FA all at once.
builder.Services.AddScoped<SignInManager<ApplicationUser>, AppSignInManager>();

// GDPR: Identity's own sign-in cookie is essential for the site to function (you can't be signed
// in without it), so it's exempt from the cookie-consent banner above — see
// https://learn.microsoft.com/aspnet/core/security/gdpr.
//
// SlidingExpiration is explicitly disabled: with the default (true), an active user's persisted
// cookie (external OAuth login, always isPersistent: true - see ExternalLogin.cshtml.cs - or
// password login with "Remember me") gets silently reissued with a fresh 14-day expiry on every
// request once more than half of ExpireTimeSpan has elapsed, so as long as someone visits at
// least once every ~2 weeks they are effectively never signed out. Disabling it makes
// ExpireTimeSpan a hard cap from the moment of login: Discord/Google/Facebook users must
// re-authenticate with the provider every 14 days, and "Remember me" password sessions expire
// after 14 days too, instead of both renewing forever. Login without "Remember me" is unaffected
// - PasswordSignInAsync(..., isPersistent: false, ...) issues a non-persistent session cookie with
// no ExpiresUtc at all, so it already only lasts until the browser is closed.
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.IsEssential = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);
    options.SlidingExpiration = false;
});
builder.Services.Configure<Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationOptions>(
    IdentityConstants.ExternalScheme,
    options => options.Cookie.IsEssential = true
);

builder.Services.AddScoped<AccountLinkingService>();
builder.Services.AddScoped<AccountDeletionService>();
builder.Services.AddScoped<agot_bg_website.Services.GameListing.GameListQueryService>();
builder.Services.AddScoped<agot_bg_website.Services.UserStatsService>();

// Recomputes cached user stats (won/finished/removed-from game counts and win rate) in the
// background whenever a game finishes (see Api.GamesApi's PATCH handler) or an admin triggers a
// bulk recalculation, instead of recalculating from every PlayerInGame row on every profile page
// view - see UserStatsRecalculationQueue/UserStatsRecalculationBackgroundService.
builder.Services.AddSingleton<agot_bg_website.Infrastructure.Stats.UserStatsRecalculationQueue>();
builder.Services.AddHostedService<agot_bg_website.Infrastructure.Stats.UserStatsRecalculationBackgroundService>();

// Refuses throwaway addresses (mailinator.com and the like) on registration/email-change - see
// LOCAL_DEV_VERIFICATION.md "Disposable email" section for why this package/approach was picked.
// It downloads the community-maintained disposable/disposable-email-domains list once (lazily,
// cached for the app's lifetime) and checks the domain locally, so it never sends the email
// address itself anywhere.
builder.Services.AddEmailDisposableOnlineValidatorAsSingleton();
builder.Services.AddScoped<DisposableEmailChecker>();
builder.Services.Configure<TurnstileOptions>(builder.Configuration.GetSection("Turnstile"));
builder.Services.AddHttpClient<TurnstileVerifier>();

// Singleton: tracks per-IP registration attempt counts across requests for the app's lifetime.
// Scoped only to RegisterModel - not app-wide rate-limiting middleware, so no other route is affected.
builder.Services.AddSingleton<RegistrationRateLimiter>();

// Public contact form (Pages/Contact.cshtml) - recipient address and the per-visitor daily quota.
// The limiter itself is Redis-backed (registered below, once the multiplexer exists) so the quota
// survives deploys/restarts and is shared across instances.
builder.Services.Configure<ContactOptions>(builder.Configuration.GetSection("Contact"));

// Chat (MIGRATION_PLAN.md §7) — raw ASP.NET Core WebSockets + Redis pub/sub, replacing Django
// Channels, so ChatClient.ts/games_chat.html don't need any changes.
var redisConnectionString =
    builder.Configuration.GetConnectionString("Redis")
    ?? throw new InvalidOperationException("Connection string 'Redis' not found.");
var redisConnectionMultiplexer = ConnectionMultiplexer.Connect(redisConnectionString);
builder.Services.AddSingleton<IConnectionMultiplexer>(redisConnectionMultiplexer);
builder.Services.AddSingleton<IContactRateLimiter, ContactRateLimiter>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ChatConnectionManager>();
builder.Services.AddSingleton<ChatPresenceService>();
builder.Services.AddSingleton<ChatBroadcaster>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<ChatBroadcaster>());

// Without this, ASP.NET Core's Data Protection key ring (which encrypts/decrypts the Identity
// auth cookie, antiforgery tokens, etc.) falls back to its default auto-discovery, which inside a
// Docker container has nowhere durable to persist keys - so every container
// restart/recreate generates a brand new ephemeral key ring, and every previously-issued auth
// cookie silently fails to decrypt, forcing everyone to log in again (this is the exact "I have to
// log in every time I restart the container" symptom). Persisting the key ring to Redis (already
// used for chat above, and itself backed by a durable volume/restart-always container) means keys
// - and therefore sessions - now survive container restarts. SetApplicationName pins the key ring
// to a stable name so it isn't accidentally tied to a machine-specific/container-specific content
// root path.
builder
    .Services.AddDataProtection()
    .SetApplicationName("agot-bg-website")
    .PersistKeysToStackExchangeRedis(redisConnectionMultiplexer, "DataProtection-Keys");

// Email sending — used by both Identity's own emails (password reset, email confirmation) and
// NotificationsApi/ChatWebSocketApi's notification emails, see MIGRATION_PLAN.md §6/§9.1. Exactly
// one IEmailSender implementation is registered, chosen once at startup by configuration
// precedence: Amazon SES's own API (Email:Ses:AccessKeyId) > a generic bearer-token API provider
// (Email:Api:Key) > SMTP (Email:Host); if none are configured (the common local-dev state),
// LoggingEmailSender is registered instead of Identity's own built-in no-op default, so emails
// are at least logged rather than silently dropped, and the app never crashes for lack of email
// config. All API-based options are preferred over SMTP when both are set, since API-based
// delivery isn't subject to outbound SMTP port blocking on some hosts (Dokku blocked it). See
// README.md's "Email" section for setup notes and a provider/cost comparison.
if (!string.IsNullOrEmpty(builder.Configuration["Email:Ses:AccessKeyId"]))
{
    // Register the AWS SDK client itself as a singleton (it's documented as thread-safe and
    // meant to be reused across calls, same as HttpClient) instead of letting SesApiEmailSender
    // construct-and-dispose a new one per email - that would repeat connection/TLS setup on every
    // send and risks socket exhaustion under load.
    builder.Services.AddSingleton<Amazon.SimpleEmailV2.IAmazonSimpleEmailServiceV2>(sp =>
    {
        var config = sp.GetRequiredService<IConfiguration>();
        var region = config["Email:Ses:Region"] ?? "eu-north-1";
        return new Amazon.SimpleEmailV2.AmazonSimpleEmailServiceV2Client(
            config["Email:Ses:AccessKeyId"],
            config["Email:Ses:SecretAccessKey"],
            Amazon.RegionEndpoint.GetBySystemName(region)
        );
    });
    builder.Services.AddTransient<
        Microsoft.AspNetCore.Identity.UI.Services.IEmailSender,
        SesApiEmailSender
    >();
    builder.Services.AddTransient<IBccEmailSender, SesApiEmailSender>();
}
else if (!string.IsNullOrEmpty(builder.Configuration["Email:Api:Key"]))
{
    // Email:Api:Host defaults to Resend's API but is configurable so a different API-based
    // provider (or a test double) can be pointed at instead without a code change.
    var apiHostConfig = builder.Configuration["Email:Api:Host"];
    var apiHost = string.IsNullOrEmpty(apiHostConfig) ? "https://api.resend.com/" : apiHostConfig;
    builder.Services.AddHttpClient<ApiEmailSender>(client =>
    {
        client.BaseAddress = new Uri(apiHost);
    });
    // Deliberately NOT AddTransient<IEmailSender, ApiEmailSender>() here: that would register a
    // second, independent ApiEmailSender constructed via plain DI (with an HttpClient resolved
    // from the default factory, BaseAddress unset), instead of reusing the instance the typed
    // client registration above just configured - causing "invalid request URI... BaseAddress
    // must be set" at send time (seen in production via Sentry). Resolve through the typed
    // client's own registration so the configured HttpClient is actually used.
    builder.Services.AddTransient<
        Microsoft.AspNetCore.Identity.UI.Services.IEmailSender,
        ApiEmailSender
    >(sp => sp.GetRequiredService<ApiEmailSender>());
    builder.Services.AddTransient<IBccEmailSender, ApiEmailSender>(sp =>
        sp.GetRequiredService<ApiEmailSender>()
    );
}
else if (!string.IsNullOrEmpty(builder.Configuration["Email:Host"]))
{
    builder.Services.AddTransient<
        Microsoft.AspNetCore.Identity.UI.Services.IEmailSender,
        SmtpEmailSender
    >();
    builder.Services.AddTransient<IBccEmailSender, SmtpEmailSender>();
}
else
{
    builder.Services.AddTransient<
        Microsoft.AspNetCore.Identity.UI.Services.IEmailSender,
        LoggingEmailSender
    >();
    builder.Services.AddTransient<IBccEmailSender, LoggingEmailSender>();
}

// Canonical, all-lowercase URLs everywhere (e.g. "/user/{id}" instead of "/User/{id}") - applies
// to links the framework generates itself (asp-page tag helpers, Url.Page, RedirectToPage,
// LinkGenerator, ...); routing already matched incoming URLs case-insensitively regardless, this
// just makes what appears in the address bar/links consistent. Hardcoded literal hrefs (e.g. the
// few "/User/{id}" links to the profile page) still need fixing by hand - see individual .cshtml
// files.
builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteOptions>(options =>
{
    options.LowercaseUrls = true;
});

// ASP.NET Core's default per-form-field limit is 4MB. The Admin "Edit game" page posts the raw
// `serialized_game` JSON back as a plain form field, and that JSON includes the full game log -
// which keeps growing every round and can get huge for very long games (see Areas/Admin/Pages/
// Games/Edit.cshtml.cs). Raise the hard framework limit comfortably above EditModel's own
// MaxJsonFieldLength, so an over-sized save is rejected by EditModel's friendly validation message
// instead of by this raw low-level limit first.
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit =
        agot_bg_website.Areas.Admin.Pages.Games.EditModel.MaxJsonFieldLength + 4 * 1024 * 1024;
});

builder.Services.AddRazorPages(options =>
{
    // The Admin area is the .NET equivalent of Django Admin (there's no built-in one) — gate the
    // whole area behind the Admin role instead of any-authenticated-user, mirroring Django's
    // `user.is_staff` gate on /admin.
    options.Conventions.AuthorizeAreaFolder("Admin", "/", "AdminArea");

    // All Games / My Games require a logged-in user — matches nav links only being shown to
    // authenticated users (FAQ is an external link so it's just hidden, not gated server-side).
    // Terms of Use is intentionally anonymous: OAuth providers (Discord/Google/Facebook) require a
    // publicly reachable terms-of-use URL during app review, before a user can log in at all.
    options.Conventions.AuthorizePage("/Games");
    options.Conventions.AuthorizePage("/MyGames");
    options.Conventions.AuthorizePage("/Users");
});

// External logins: Google/Discord/Facebook — see MIGRATION_PLAN.md §5. Plus a MasterApi Basic
// Auth scheme for the game server's service-to-service calls, see MIGRATION_PLAN.md §6.
var authenticationBuilder = builder.Services.AddAuthentication();

bool IsConfigured(string clientIdKey, string clientSecretKey) =>
    !string.IsNullOrEmpty(builder.Configuration[clientIdKey])
    && !string.IsNullOrEmpty(builder.Configuration[clientSecretKey]);

if (IsConfigured("Authentication:Google:ClientId", "Authentication:Google:ClientSecret"))
{
    authenticationBuilder.AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
        // Uses this library's default CallbackPath ("/signin-google"). The legacy Django site's
        // python-social-auth callback ("/complete/google-oauth2/") was used at cutover instead,
        // to avoid touching the Google Cloud Console's Authorized redirect URI - now replaced
        // with "/signin-google" as an additional authorized redirect URI, so this default applies.
    });
}

if (IsConfigured("Authentication:Discord:ClientId", "Authentication:Discord:ClientSecret"))
{
    authenticationBuilder.AddDiscord(options =>
    {
        options.ClientId = builder.Configuration["Authentication:Discord:ClientId"]!;
        options.ClientSecret = builder.Configuration["Authentication:Discord:ClientSecret"]!;
        // Uses this library's default CallbackPath ("/signin-discord"), same reasoning as Google
        // above - "/signin-discord" is now registered as an additional authorized redirect URI in
        // the Discord Developer Portal, replacing the legacy "/complete/discord/" shim.
    });
}

if (IsConfigured("Authentication:Facebook:ClientId", "Authentication:Facebook:ClientSecret"))
{
    authenticationBuilder.AddFacebook(options =>
    {
        options.ClientId = builder.Configuration["Authentication:Facebook:ClientId"]!;
        options.AppId = options.ClientId;
        options.ClientSecret = builder.Configuration["Authentication:Facebook:ClientSecret"]!;
        options.AppSecret = options.ClientSecret;
        options.Scope.Add("email");
        options.Fields.Add("email");
    });
}

authenticationBuilder.AddScheme<MasterApiAuthenticationOptions, MasterApiAuthenticationHandler>(
    MasterApiAuthenticationHandler.SchemeName,
    options =>
    {
        options.Username = builder.Configuration["GameServer:MasterApiUsername"] ?? string.Empty;
        options.Password = builder.Configuration["GameServer:MasterApiPassword"] ?? string.Empty;
    }
);

builder
    .Services.AddAuthorizationBuilder()
    .AddPolicy(
        MasterApiAuthenticationHandler.SchemeName,
        policy =>
            policy
                .AddAuthenticationSchemes(MasterApiAuthenticationHandler.SchemeName)
                .RequireAuthenticatedUser()
    )
    .AddPolicy("AdminArea", policy => policy.RequireRole(RoleNames.Admin))
    .AddGamePermissionPolicies();

// Built-in ASP.NET Core OpenAPI (Microsoft.AspNetCore.OpenApi), not Swashbuckle/Swagger, generates
// the underlying document; Scalar.AspNetCore renders an interactive "try it out" UI on top of it
// at /api/docs (see MapOpenApi/MapScalarApiReference below) — deliberately Scalar rather than
// Swagger UI, per preference. A single document (the default name "v1", left unnamed here on
// purpose) describes only PublicApi (api/public/game/{id}, api/PUBLIC_API.md), the one JSON REST
// endpoint meant for outside consumption. PlayApi returns HTML rather than JSON, and
// UsersApi/GamesApi/RoomsApi/NotificationsApi are the private, Basic-Auth-only, port-restricted
// game-server contract (see MIGRATION_PLAN.md §6.2) that only the TS game server should ever call,
// so both are deliberately left out of the generated document via ShouldInclude, filtering on the
// "public" endpoint-group name PublicApi.cs tags its group with (not to be confused with this
// document's own "v1" name) so any endpoint added later without a group name doesn't leak into
// /api/docs by accident.
builder.Services.AddOpenApi(options =>
{
    options.ShouldInclude = description => description.GroupName == "public";
    options.AddDocumentTransformer(
        (document, _, _) =>
        {
            document.Info.Title = "Swords and Ravens Public API";
            document.Info.Description =
                "Read-only public REST endpoints for outside consumption. Anonymous/unauthenticated "
                + "— no login or credentials required.";
            document.Info.Version = "v1";
            return Task.CompletedTask;
        }
    );
});

var app = builder.Build();

// Caddy (docker-compose.prod.yml) terminates TLS and reverse-proxies to this container over
// plain HTTP on the shared Compose network, adding X-Forwarded-Proto/X-Forwarded-For (Caddy does
// this by default). Without trusting those headers, Kestrel always sees Request.Scheme = "http"
// for every request, which breaks anything that builds an absolute URL from the current request's
// scheme - most visibly, external OAuth providers (Google/Discord/Facebook) reject the sign-in
// callback because the generated redirect_uri comes back as "http://..." instead of "https://...",
// even though the provider is configured with an https redirect URI. KnownNetworks/KnownProxies
// are cleared because Caddy's container IP on the Compose bridge network isn't fixed/known ahead
// of time (the default restriction only trusts loopback) - this is the standard pattern for
// ASP.NET Core behind a reverse proxy in Docker. Must run before any other middleware that reads
// Request.Scheme/Request.IsHttps (UseHttpsRedirection, authentication, etc.).
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
};
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

// Apply enforcing CSP in production only. Local development has no CSP middleware; the
// optional nonce helper leaves Razor's nonce attributes out of its responses.
// Register early so production Razor Pages have a nonce before rendering.
if (app.Environment.IsProduction())
{
    app.UseContentSecurityPolicy();
}

// Keep the production-safe error page in every environment, including local development, rather
// than exposing the EF Core migrations-endpoint/detailed-exception page.
app.UseExceptionHandler("/Error");

app.UseHttpsRedirection();

// Legacy Django URLs commonly ended in a trailing slash (e.g. "/games/", "/my_games/") - old
// bookmarks/links still hit those exact paths. Razor Pages routing matches "/games/" to the same
// page as "/games" leniently, but that isn't enough on its own: browser-relative URL resolution
// (e.g. the ES module imports in _ChatWidget.cshtml) depends on the exact path shown in the
// address bar - a trailing slash silently resolves "./foo" one directory too deep, which is
// exactly what broke the "Online users" widget on "/games/" (see _ChatWidget.cshtml's now-absolute
// import paths). Normalize every request to a slash-free path (except the root "/") with a
// permanent redirect before routing ever sees it, so old bookmarks always land on a canonical URL.
// Exempt the Scalar API reference UI (see MapScalarApiReference("/api/docs") below): Scalar relies
// on the opposite convention, 302-redirecting the bare "/api/docs" to "/api/docs/" so its own
// relative asset URLs resolve against the right base path. Without this exemption the two
// middlewares fight over the trailing slash forever (307/301 ping-pong, never reaching the UI).
app.Use(
    async (context, next) =>
    {
        var path = context.Request.Path;
        if (
            path.HasValue
            && path.Value!.Length > 1
            && path.Value.EndsWith('/')
            && !path.StartsWithSegments("/api/docs", StringComparison.OrdinalIgnoreCase)
        )
        {
            var target = path.Value.TrimEnd('/') + context.Request.QueryString;
            context.Response.Redirect(target, permanent: true);
            return;
        }

        await next();
    }
);

app.UseCookiePolicy();
app.UseWebSockets();
app.UseRouting();

// Enforce RequireLocalPort restrictions (see EndpointRoutingExtensions.cs) before authentication
// so a request to the wrong port gets a plain 404 instead of reaching the Basic Auth challenge.
app.UseLocalPortRestriction();

// CoreAdmin (see registration comment above) serves its own embedded static assets outside of
// MapStaticAssets's manifest-based approach, so it needs the classic static files middleware too.
app.UseStaticFiles();

// The game client's webpack bundle is built with publicPath "/static/" (matching Django's
// STATIC_URL, since webpack.client.local.js is shared between both website rewrites — see
// MIGRATION_PLAN.md §8), but build_and_place_game_client_into_dotnet.ps1/.sh places the built
// assets under wwwroot/static_game/ (kept distinct from ASP.NET Core's own wwwroot-relative
// MapStaticAssets mapping below). Re-expose that folder under the "/static" request path so the
// generated play.html's absolute script/asset URLs resolve without editing the shared webpack
// config.
var staticGameDir = Path.Combine(app.Environment.WebRootPath, "static_game");
if (Directory.Exists(staticGameDir))
{
    app.UseStaticFiles(
        new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(staticGameDir),
            RequestPath = "/static",
        }
    );
}

app.UseAuthentication();
app.UseAuthorization();

app.UseLastActivityTracking();

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();
app.MapDefaultControllerRoute();

// Legacy Django bookmark: "/my_games/" (see agot-bg-website/agotboardgame_main/urls.py) -> the
// new Razor Page is "/MyGames", served (via LowercaseUrls above) at "/mygames".
app.MapGet("/my_games", () => Results.Redirect("/mygames", permanent: true));

// Minimal API groups — the REST contract the game server speaks, see MIGRATION_PLAN.md §6.
//
// UsersApi/GamesApi/RoomsApi/NotificationsApi are the private, service-to-service REST contract
// (Basic Auth via MasterApiAuthenticationHandler) that only the TS game server should ever be
// able to reach. They're additionally restricted to the "GameServerApi" Kestrel endpoint (see
// appsettings.json's Kestrel:Endpoints section) so that, in docker-compose, only the "Public"
// port needs to be published to the host/internet — the GameServerApi port stays reachable only
// from sibling containers on the same compose network (i.e. the game server), giving
// defense-in-depth beyond the Basic Auth credentials alone even if those ever leaked. PublicApi
// (anonymous, used by third-party sites/front-end tooling) and PlayApi/ChatWebSocket (used by
// signed-in users directly) are intentionally left reachable on every configured endpoint.
var gameServerApiPort = new Uri(
    builder.Configuration["Kestrel:Endpoints:GameServerApi:Url"] ?? "http://0.0.0.0:8001"
).Port;
app.MapUsersApi().RequireLocalPort(gameServerApiPort);
app.MapGamesApi().RequireLocalPort(gameServerApiPort);
app.MapRoomsApi().RequireLocalPort(gameServerApiPort);
app.MapPublicApi();
app.MapNotificationsApi().RequireLocalPort(gameServerApiPort);
app.MapPlayApi();
app.MapChatWebSocket();

// Logs Content-Security-Policy violations (see
// Infrastructure/ContentSecurityPolicyMiddleware.cs) to monitor blocked resources after
// enforcement. Browsers POST a JSON body here - either the legacy
// "report-uri" shape or, on newer browsers, an "application/reports+json" batch - logged as-is
// rather than deserialized into a strict DTO, since the exact shape differs by browser and this
// is diagnostic-only.
app.MapPost(
    "/csp-report",
    async (HttpRequest request, ILogger<Program> logger) =>
    {
        using var reader = new StreamReader(request.Body);
        var body = await reader.ReadToEndAsync();
        logger.LogWarning("CSP violation report: {Report}", body);
        return Results.NoContent();
    }
);

// Generated OpenAPI document for the "public" group only (see AddOpenApi/ShouldInclude above),
// raw JSON at the framework's own default route (/openapi/v1.json, since the document was left
// unnamed so it gets the default name "v1") plus an interactive, "try it out"-capable UI on top of
// it via Scalar.AspNetCore (https://github.com/scalar/scalar) — deliberately not Swagger UI, per
// preference — browsable at /api/docs, e.g. https://localhost:8000/api/docs.
app.MapOpenApi();
app.MapScalarApiReference(
    "/api/docs",
    options => options.WithTitle("Swords and Ravens Public API")
);

using (var scope = app.Services.CreateScope())
{
    // Applies any pending EF Core migrations automatically on startup, in every environment
    // (including local Docker debug) - replaces a separate manual `dotnet ef database update`
    // step that would otherwise be needed after every deploy to the DO droplet. Safe to run on
    // every restart: EF Core tracks already-applied migrations in the `__EFMigrationsHistory`
    // table and this is a no-op once the schema is current. docker-compose.prod.yml's `db`
    // service has a healthcheck and `website` depends on it with `condition: service_healthy`,
    // so Postgres is already accepting connections by the time this runs.
    await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.MigrateAsync();

    await RoleSeeder.SeedAsync(scope.ServiceProvider);
    await PermissionSeeder.SeedAsync(scope.ServiceProvider);
    await RoomSeeder.SeedAsync(scope.ServiceProvider, app.Environment);

    // Nobody can still be connected to this single website process when it starts, so remove both
    // legacy room-wide presence blobs and per-connection records left by the previous process.
    await scope
        .ServiceProvider.GetRequiredService<ChatPresenceService>()
        .ClearAllConnectedUsersAsync();
}

app.Run();
