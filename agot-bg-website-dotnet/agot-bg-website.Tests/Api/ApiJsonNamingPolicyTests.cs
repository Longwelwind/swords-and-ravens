using System.Text.Json;
using agot_bg_website.Api;
using agot_bg_website.Domain;
using Xunit;

namespace agot_bg_website.Tests.Api;

/// <summary>
/// Regression coverage for a real bug: <c>Program.cs</c> never actually configured
/// <c>JsonNamingPolicy.SnakeCaseLower</c> for the <c>/api/*</c> Minimal API endpoints, despite
/// Api/Dtos.cs's header comment claiming it did. Every response therefore serialized with ASP.NET
/// Core Minimal API's default (camelCase) instead of matching Django's snake_case DRF contract —
/// e.g. <see cref="UserDto.GameToken"/> came back as <c>"gameToken"</c>, not <c>"game_token"</c>,
/// which is the exact field <c>LiveWebsiteClient.ts</c>'s <c>getUser()</c> reads
/// (<c>response.game_token</c>). That silently produced <c>undefined</c> on the TS side, making
/// <c>GlobalServer.ts</c>'s <c>userData.token != authToken</c> check always fail once real
/// credentials were configured. These tests serialize with the same
/// <see cref="JsonSerializerOptions"/> shape now configured via
/// <c>builder.Services.ConfigureHttpJsonOptions</c> in Program.cs, to pin the wire format down so
/// it can't silently regress back to camelCase again.
/// </summary>
public class ApiJsonNamingPolicyTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    [Fact]
    public void UserDto_SerializesGameTokenAsSnakeCase()
    {
        var dto = new UserDto(
            Guid.NewGuid(),
            "robb_stark",
            "some-token",
            false,
            false,
            false,
            false,
            false,
            []
        );

        var json = JsonSerializer.Serialize(dto, Options);

        Assert.Contains("\"game_token\":\"some-token\"", json);
        Assert.DoesNotContain("\"gameToken\"", json);
    }

    [Fact]
    public void GameDto_SerializesOwnerAndSerializedGameAsSnakeCase()
    {
        // Matches LiveWebsiteClient.ts's getGame(): response.owner, response.serialized_game.
        var dto = new GameDto(
            Guid.NewGuid(),
            "Some game",
            Guid.NewGuid(),
            null,
            "1",
            "Ongoing",
            null,
            0
        );

        var json = JsonSerializer.Serialize(dto, Options);

        Assert.Contains("\"owner\":", json);
        Assert.DoesNotContain("\"ownerUserId\"", json);
        Assert.DoesNotContain("\"serializedGame\"", json);
    }

    [Fact]
    public void PublicGameResponseIncludesDjangoEnvelopeAndSanitizesView()
    {
        var gameId = Guid.NewGuid();
        using var viewOfGame = JsonDocument.Parse(
            """
            {
              "turn": 4,
              "publicChatRoomId": "private-room",
              "waitingFor": "House Stark"
            }
            """
        );

        var lastActiveAt = new DateTimeOffset(2026, 10, 21, 12, 34, 56, TimeSpan.Zero);

        var response = PublicApi.BuildResponse(gameId, "A game", GameState.InLobby, viewOfGame, lastActiveAt);

        Assert.Equal(gameId, response["id"]!.GetValue<Guid>());
        Assert.Equal("A game", response["name"]!.GetValue<string>());
        Assert.Equal("IN_LOBBY", response["state"]!.GetValue<string>());
        Assert.Equal("2026-10-21T12:34:56Z", response["last_active_at"].Deserialize<string>());
        Assert.Equal(4, response["view_of_game"]!["round"]!.GetValue<int>());
        Assert.Equal("House Stark", response["view_of_game"]!["waitingFor"]!.GetValue<string>());
        Assert.Null(response["view_of_game"]!["publicChatRoomId"]);
        Assert.Null(response["view_of_game"]!["turn"]);
    }

    [Fact]
    public void CreateRoomDto_DeserializesMaxRetrieveCountFromSnakeCase()
    {
        // Matches LiveWebsiteClient.ts's createPublicChatRoom()/createPrivateChatRoom() request
        // body: { name, public, users, max_retrieve_count }.
        const string incomingJson =
            """{"name":"lobby","public":true,"users":[],"max_retrieve_count":30}""";

        var dto = JsonSerializer.Deserialize<CreateRoomDto>(incomingJson, Options);

        Assert.NotNull(dto);
        Assert.Equal(30, dto!.MaxRetrieveCount);
    }

    [Fact]
    public void CreateRoomDto_DeserializesUsersAsUserWrapperObjects()
    {
        // Regression test for a real bug: LiveWebsiteClient.ts's createPrivateChatRoom() sends
        // `users: users.map(u => ({user: u.id}))` (matching Django's UserInRoomSerializer wire
        // shape), not a plain array of GUID strings. CreateRoomDto.Users used to be typed
        // IReadOnlyList<Guid>, which fails to bind non-empty user lists like this one - the bug
        // stayed hidden because public-room creation always sends an empty `users: []` array, so
        // only private chat rooms (which always have exactly two users) ever exercised this path,
        // silently creating rooms with zero UserInRoom rows and therefore no members able to join.
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var incomingJson =
            $$"""{"name":"private","public":false,"users":[{"user":"{{userId}}"},{"user":"{{otherUserId}}"}],"max_retrieve_count":null}""";

        var dto = JsonSerializer.Deserialize<CreateRoomDto>(incomingJson, Options);

        Assert.NotNull(dto);
        Assert.Equal(2, dto!.Users.Count);
        Assert.Equal(userId, dto.Users[0].User);
        Assert.Equal(otherUserId, dto.Users[1].User);
    }
}
