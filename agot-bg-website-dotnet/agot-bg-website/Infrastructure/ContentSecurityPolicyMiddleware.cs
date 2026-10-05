using System.Security.Cryptography;

namespace agot_bg_website.Infrastructure;

/// <summary>
/// Adds a per-request CSP nonce to <see cref="HttpContext.Items"/> and emits a
/// <c>Content-Security-Policy</c> header on production responses. Browsers report blocked
/// resources to the <c>/csp-report</c> endpoint (see Program.cs). The policy was first deployed
/// in report-only mode and observed across production traffic before enforcement.
///
/// Inline &lt;script&gt; blocks (_Layout.cshtml, _ChatWidget.cshtml, _CookieConsentPartial.cshtml,
/// _Pager.cshtml, Games.cshtml, MyGames.cshtml, Admin/Games/Edit.cshtml) render
/// <c>nonce="@Context.GetCspNonce()"</c> so
/// they're allowed under the nonce below without resorting to 'unsafe-inline' for script
/// elements - the actual protection this policy buys against an attacker injecting a brand new
/// &lt;script&gt; tag, by far the most common real-world XSS payload shape.
///
/// Inline event-handler attributes (onclick=/onsubmit=/onchange=, e.g. the confirm() dialogs in
/// _GamesTable.cshtml and the Admin area) and inline style="..." attributes (dynamic per-provider
/// button colors in Login.cshtml/Register.cshtml/ExternalLogins.cshtml) are deliberately allowed
/// via 'unsafe-inline' on script-src-attr/style-src-attr instead of being retrofitted with
/// nonces/hashes: CSP nonces don't apply to attributes at all, and hashing dozens of dynamic
/// per-page attribute values isn't practical. This is a common, intentional trade-off.
///
/// style-src-elem also allows 'unsafe-inline' for the same practical reason: the game client's
/// webpack build (agot-bg-game-server/webpack.client.js) bundles all of its CSS - bootstrap,
/// react-bootstrap, and the app's own scss - via style-loader, which injects it as runtime
/// &lt;style&gt; elements with no nonce attribute. Confirmed live via 100 identical
/// "style-src-elem"/"blocked-uri":"inline" reports from /play pages within minutes of first
/// deploying the report-only policy. style-loader/webpack CAN emit a nonce on those elements, but
/// only via a `__webpack_nonce__` global set before any CSS-importing module evaluates (typically
/// a dynamic-import bootstrap plus a per-request nonce threaded into the served HTML) - a
/// non-trivial restructure of the client entry point that isn't worth it for what's fundamentally
/// a CSS-injection vector, not the script-injection vector this policy is primarily hardening.
///
/// form-action allows Google/Discord/Facebook's own authorization-endpoint origins (in addition
/// to 'self') because the Identity scaffolding's ExternalLogin page (Areas/Identity/Pages/Account/
/// ExternalLogin.cshtml.cs) submits a form that itself does nothing but immediately 302-redirect
/// off-site to whichever provider the user picked. CSP's form-action directive is enforced
/// against the entire resulting redirect chain, not just the form's own (same-origin, 'self')
/// action URL - confirmed live via real "form-action"/blocked-uri":".../externallogin?..."
/// reports from /Identity/Account/Login once real users started signing in with those providers.
///
/// img-src additionally allows jsdelivr.net because the chat widget's emoji picker
/// (agot-bg-game-server's ChatComponent.tsx, via the emoji-picker-react package) renders actual
/// emoji as &lt;img&gt; elements, not just its own picker popup, and that package's default
/// getEmojiUrl() points at https://cdn.jsdelivr.net/npm/emoji-datasource-apple/... for every
/// desktop user (mobile uses emojiStyle=NATIVE, which needs no image at all). Confirmed live via
/// well over a thousand "img-src"/blocked-uri":"https://cdn.jsdelivr.net/npm/emoji-datasource-
/// apple/..." reports from /play in a single day - this affected every desktop user who received
/// or sent a chat emoji, by far the highest-volume genuine gap found in the report-only window.
///
/// Continue to watch /csp-report after enforcement across /play, Games/MyGames,
/// Login/Register (including Turnstile), OAuth redirects, password reset and chat.
/// /CoreAdmin and /api/docs remain excluded.
/// Unlike an extension that sets its own separate CSP (which reports to its own target, not
/// here), an extension that merely injects/rewrites DOM content still gets checked against THIS
/// real header, and genuinely-blocked injected content is reported here too - confirmed live via
/// a run of "font-src"/fonts.gstatic.com reports that all carried "source-file":"chrome-extension".
/// These aren't something this app can or should allow for. The same applies to
/// Facebook's own in-app-browser: links opened from Facebook/Messenger (recognizable by an
/// "fbclid" query string) get its "pcm.js" measurement script auto-injected client-side and
/// reported as a "script-src-elem"/blocked-uri":"https://connect.facebook.net/en_US/pcm.js"
/// violation with source-file set to our own page URL - this app has no Facebook Pixel/SDK code
/// anywhere, so it isn't something we inject or can fix, just Facebook's webview instrumenting
/// pages it opens. The last production observation also found un-nonced scripts in
/// Admin/Games/Edit.cshtml, which were corrected before enforcement. The policy directives
/// themselves were not changed during the switch from report-only to enforcement.
/// </summary>
public static class ContentSecurityPolicyMiddlewareExtensions
{
    private const string CspNonceItemsKey = "csp-nonce";

    // Must match ASSET_PATH in .github/workflows/deploy.yml - the DigitalOcean Spaces CDN bucket
    // the game client's webpack build embeds its script/media/font URLs under. Update both if the
    // bucket name or region slug ever changes.
    private const string GameClientCdnOrigin =
        "https://swords-and-ravens-spaces.fra1.cdn.digitaloceanspaces.com";

    /// <summary>
    /// Reads the CSP nonce generated for production requests by
    /// <see cref="UseContentSecurityPolicy"/>. Returns null in local development, where no
    /// CSP middleware runs and Razor omits the nonce attribute.
    /// </summary>
    public static string? GetCspNonce(this HttpContext context) =>
        context.Items.TryGetValue(CspNonceItemsKey, out var nonce) ? (string)nonce! : null;

    /// <summary>
    /// Must run before routing/Razor Pages execute (so the nonce exists in
    /// <see cref="HttpContext.Items"/> by the time a page renders) - registered early in
    /// Program.cs, right after <c>UseForwardedHeaders</c>.
    /// </summary>
    public static IApplicationBuilder UseContentSecurityPolicy(this IApplicationBuilder app)
    {
        return app.Use(
            async (context, next) =>
            {
                var nonce = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));
                context.Items[CspNonceItemsKey] = nonce;

                context.Response.OnStarting(() =>
                {
                    // Scalar's bundled API reference UI (/api/docs, see Program.cs's
                    // MapScalarApiReference) and the third-party CoreAdmin package's own MVC
                    // views (/CoreAdmin, see Program.cs's AddCoreAdmin) are dev/admin tools we
                    // don't control the markup of and have no intention of CSP-hardening -
                    // CoreAdmin's Index.cshtml and Markdown.cshtml editor template in particular
                    // render un-nonced inline <script> blocks, which were showing up as real
                    // script-src-elem violations in the /csp-report logs for every admin who
                    // opened a grid or a markdown field. Exempted so neither drowns real
                    // violations in noise.
                    if (
                        !context.Request.Path.StartsWithSegments(
                            "/api/docs",
                            StringComparison.OrdinalIgnoreCase
                        )
                        && !context.Request.Path.StartsWithSegments(
                            "/CoreAdmin",
                            StringComparison.OrdinalIgnoreCase
                        )
                    )
                    {
                        var config = context.RequestServices.GetRequiredService<IConfiguration>();
                        context.Response.Headers["Content-Security-Policy"] = BuildPolicy(
                            config,
                            nonce
                        );
                    }
                    return Task.CompletedTask;
                });

                await next(context);
            }
        );
    }

    private static string BuildPolicy(IConfiguration config, string nonce)
    {
        // Mirrors GameClient.ts's own "localhost -> ws://localhost:5000, else ->
        // wss://play.<host>" branch (agot-bg-game-server/src/client/GameClient.ts), so this stays
        // correct for the configured production public site without hardcoding its hostname.
        var publicSiteHost = new Uri(config["PublicSiteUrl"] ?? "http://localhost:8000").Host;
        var gameWebSocketOrigin =
            publicSiteHost == "localhost" ? "ws://localhost:5000" : $"wss://play.{publicSiteHost}";

        string[] directives =
        [
            "default-src 'self'",
            $"script-src-elem 'self' 'nonce-{nonce}' https://challenges.cloudflare.com {GameClientCdnOrigin}",
            "script-src-attr 'unsafe-inline'",
            "style-src 'self'",
            "style-src-elem 'self' 'unsafe-inline'",
            "style-src-attr 'unsafe-inline'",
            "font-src 'self'",
            $"img-src 'self' data: {GameClientCdnOrigin} https://cdn.jsdelivr.net",
            $"media-src {GameClientCdnOrigin}",
            $"connect-src 'self' {gameWebSocketOrigin}",
            "frame-src https://challenges.cloudflare.com",
            "form-action 'self' https://accounts.google.com https://discord.com https://www.facebook.com",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "report-uri /csp-report",
        ];
        return string.Join("; ", directives);
    }
}
