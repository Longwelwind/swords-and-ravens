using System.Text.Json;
using System.Text.Json.Nodes;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Api;

/// <summary>
/// GET /api/public/game/{id} — anonymous, unauthenticated access (matches Django's real behavior:
/// <c>@permission_classes([])</c> i.e. AllowAny, despite api/PUBLIC_API.md's stale "Authentication
/// Required: Yes" claim — the Django docstring itself says "Public API endpoint for anonymous
/// access"). Deliberately has no session-cookie/Basic-Auth requirement at all so third-party sites
/// embedding live game state can call it directly (plain server-side GET, no cookies to forward,
/// no CORS preflight/credentials dance). Strips server-only fields and renames turn->round, exactly
/// like Django's public serializer — see MIGRATION_PLAN.md §6.
/// </summary>
public static class PublicApi
{
    private static readonly string[] FieldsToStrip =
    [
        "replacerIds",
        "oldPlayerIds",
        "waitingForIds",
        "publicChatRoomId",
        "timeoutPlayerIds",
        "initialPlayerIds",
    ];

    public static RouteGroupBuilder MapPublicApi(this IEndpointRouteBuilder app)
    {
        // "public" group name drives which endpoints Program.cs's AddOpenApi document includes
        // (see ShouldInclude there) — this is the only Minimal API group meant to be documented
        // at /api/docs. PlayApi returns HTML (not JSON), and UsersApi/GamesApi/RoomsApi/
        // NotificationsApi are the private, port-restricted game-server contract, so none of those
        // carry this group name and are excluded from the generated document.
        //
        // No .RequireAuthorization() here (intentionally, see class doc comment above) —
        // AllowAnonymous is Minimal API's default, so nothing further is needed; there is also no
        // fallback authorization policy configured in Program.cs that would otherwise apply.
        var group = app.MapGroup("/api/public").WithGroupName("public");

        group
            .MapGet(
                "/game/{id:guid}",
                async (Guid id, ApplicationDbContext db) =>
                {
                    var game = await db
                        .Games.Where(g => g.Id == id)
                        .Select(g => new
                        {
                            g.Id,
                            g.Name,
                            g.State,
                            g.ViewOfGame,
                            g.LastActiveAt,
                        })
                        .FirstOrDefaultAsync();
                    if (game is null)
                    {
                        return Results.NotFound();
                    }

                    return Results.Text(
                        BuildResponse(game.Id, game.Name, game.State, game.ViewOfGame, game.LastActiveAt)
                            .ToJsonString(),
                        "application/json"
                    );
                }
            )
            .WithName("GetPublicGame")
            .WithSummary("Get a game's public view")
            .WithDescription(
                "Returns the same denormalized view of a game shown in the browser client, with "
                    + "server-only fields (replacer/old-player/waiting-for ids, the internal chat room id, "
                    + "timeout tracking) stripped and \"turn\" renamed to \"round\", plus \"last_active_at\": the last "
                    + "time a player acted in the game (votes and chat don't count). Anonymous/unauthenticated "
                    + "— no session cookie or credentials required; see api/PUBLIC_API.md."
            )
            .Produces(StatusCodes.Status200OK, contentType: "application/json")
            .Produces(StatusCodes.Status404NotFound);

        return group;
    }

    internal static JsonObject BuildResponse(
        Guid id,
        string name,
        GameState state,
        JsonDocument? viewOfGame,
        DateTimeOffset lastActiveAt
    )
    {
        JsonNode? sanitizedView = null;
        if (viewOfGame is not null)
        {
            sanitizedView = JsonNode.Parse(viewOfGame.RootElement.GetRawText());
            if (sanitizedView is not JsonObject viewObject)
            {
                throw new InvalidOperationException("Game view_of_game must be a JSON object.");
            }

            foreach (var field in FieldsToStrip)
            {
                viewObject.Remove(field);
            }

            if (viewObject.TryGetPropertyValue("turn", out var turnValue))
            {
                viewObject.Remove("turn");
                viewObject["round"] = turnValue?.DeepClone();
            }
        }

        return new JsonObject
        {
            ["id"] = id,
            ["name"] = name,
            ["view_of_game"] = sanitizedView,
            ["state"] = ToLegacyState(state),
            ["last_active_at"] = lastActiveAt.UtcDateTime,
        };
    }

    private static string ToLegacyState(GameState state) =>
        state switch
        {
            GameState.InLobby => "IN_LOBBY",
            GameState.Ongoing => "ONGOING",
            GameState.Finished => "FINISHED",
            GameState.Cancelled => "CANCELLED",
            _ => throw new ArgumentOutOfRangeException(nameof(state), state, null),
        };
}
