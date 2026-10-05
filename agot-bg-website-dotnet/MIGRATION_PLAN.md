# Swords and Ravens — Django → ASP.NET Core Migration Plan

Status: design sketch, no code yet. Target: replace `agot-bg-website/` (Django) with a new
`agot-bg-website-dotnet/` app while keeping `agot-bg-game-server/` (Node/TS) essentially unchanged.

This document assumes familiarity with the current setup described in the root `README.md` and
`agot-bg-website/README.md`. Read those first if anything below seems to skip context.

## 1. Goals

1. Replace the Django website with ASP.NET Core, reusing PostgreSQL + Redis (already provisioned
   via `docker-compose.yml`).
2. Keep the Node/TS game server (`agot-bg-game-server/`) working with **no functional changes**
   to game logic — only the small integration seam (REST calls, generated client template,
   basic auth) needs to keep matching, plus one deliberate additive change described in §4.4/§6.1
   to support goal 7.
3. Support **three OIDC providers**: Google, Discord (both already supported today) **+ Facebook
   (new)**.
4. Add **local username/password authentication** (does not exist in Django today — Django only
   ever used `social_core.backends.google.GoogleOAuth2` / `DiscordOAuth2`, plus the Django admin
   password login which regular users never see).
5. Design a **fresh** database/schema (not an in-place Django migration), plus a **repeatable
   import tool** that copies data from the existing Django/Postgres database into the new schema.
6. When a user first authenticates on the new site (via any method) with an email that matches an
   **imported-but-unclaimed** legacy account, automatically link the new login to that account
   instead of creating a duplicate — mirroring Django's `associate_by_email` pipeline step.
7. Introduce a **`PreviousPlayerInGame`** table (missing from Django) that records players who were
   removed from a game (replaced by a vassal, replaced by another player, or timed out) so those
   games can be counted against their win rate instead of silently disappearing. See §4.4, §6.1,
   and §10.4.

## 2. Recommended stack

| Concern | Choice | Why |
|---|---|---|
| Web framework | ASP.NET Core MVC + Razor Pages (not Blazor) | See prior discussion: the interactive part of the product is the separate React/MobX game client; the website itself is server-rendered pages + a REST API + auth, which is MVC/Razor Pages' sweet spot. |
| ORM / DB | EF Core + Npgsql, PostgreSQL | Keeps the existing `docker-compose.yml` Postgres container; avoids a DB engine migration on top of a framework migration. |
| Auth | ASP.NET Core Identity | Built-in local username/password, external login linking table (`AspNetUserLogins`), extensible for exactly the "claim an imported account" flow needed here. |
| External OIDC/OAuth | `Microsoft.AspNetCore.Authentication.Google` + `Microsoft.AspNetCore.Authentication.Facebook` (both built-in/official) + a small custom `OAuthHandler<T>` for Discord (see §6.4) | Google/Facebook have mature, first-party Microsoft-maintained handlers; Discord doesn't ship an official package, so it uses a hand-rolled handler (details below). |
| Realtime chat transport | **Plain ASP.NET Core WebSockets** (`app.UseWebSockets()` + a custom handler), *not* SignalR | The existing `ChatClient.ts` speaks a raw WebSocket with a small hand-rolled JSON protocol against Django Channels. Reimplementing the same raw protocol over native ASP.NET Core WebSockets means **zero changes to `ChatClient.ts`**. SignalR would require the TS client to switch to `@microsoft/signalr` and adopt its handshake/invocation protocol — a real, non-trivial migration cost for no functional gain. Revisit SignalR later only if you want typed hubs and are willing to touch the TS client. |
| Chat/game-state fan-out across instances | `StackExchange.Redis` pub/sub, same `REDIS_URL` | Direct replacement for `channels_redis`; still just Redis. |
| Background jobs (mail, etc.) | `IHostedService` / minimal in-process queue, or Hangfire if volume grows | Django used synchronous `send_mass_mail` in request handlers; low volume today, no need for a heavy queue yet. |
| Metrics | `prometheus-net.AspNetCore` | Replacement for `django-prometheus`. |
| Errors | `Sentry.AspNetCore` | Direct equivalent of `sentry-sdk`, already used by the Node game server too (`@sentry/node`), so both backends report to the same project. |
| Static files (game client bundle) | ASP.NET Core static files middleware serving `wwwroot/static_game/` | Direct equivalent of Django's `STATICFILES_DIRS` entry for `static_game`. |

## 3. Solution layout (mirrors the 3 Django apps 1:1)

```
agot-bg-website-dotnet/
  Snr.sln
  src/
    Snr.Web/                      # ~ agotboardgame project + agotboardgame_main app
      Program.cs                  # composition root: Identity, auth handlers, WebSockets, static files
      appsettings.json / appsettings.Development.json
      Areas/Identity/             # Identity UI (login, register, external login callback, claim flow)
      Controllers/ or Pages/      # index, about, rules, games, my_games, settings, user profile, play
      GameClientTemplates/        # NOT under wwwroot — holds the generated play.html "template"
      wwwroot/
        static_game/              # built game-client assets land here (git-ignored)
      Chat/
        ChatWebSocketMiddleware.cs   # ~ chat/consumers.py
        ChatPresenceCache.cs         # ~ get/add/remove connected_user helpers (IDistributedCache/Redis)
    Snr.Api/                      # ~ api app — REST endpoints consumed by the game server
      Controllers/
        UsersController.cs        # GET /api/user/{id}
        GamesController.cs        # GET/PATCH /api/game/{id}
        RoomsController.cs        # POST /api/room
        NotificationsController.cs# /api/notifyReadyToStart/{id}, notifyYourTurn, etc.
        PublicController.cs       # /api/public/game/{id}
      Auth/
        ServiceBasicAuthenticationHandler.cs  # HTTP Basic auth for the game-server's service account
    Snr.Domain/                   # Entities + enums, framework-agnostic
      Entities/ (User, Game, PlayerInGame, PbemResponseTime, Room, Message, UserInRoom, ...)
    Snr.Infrastructure/           # EF Core DbContext, migrations, Identity store customization
      SnrDbContext.cs
      Migrations/
    Snr.Migration/                # console app: one-off/repeatable importer from the Django DB
      Program.cs
      LegacyDbReader.cs           # raw SQL/Npgsql reads against the OLD Django database (read-only)
      Importers/ (UserImporter, RoomImporter, GameImporter, PlayerInGameImporter, ...)
  tests/
    Snr.Web.Tests/
    Snr.Migration.Tests/
  build_and_place_game_client_into_dotnet.ps1
  website.Dockerfile                # multi-stage: node build stage -> dotnet publish stage
  docker-compose.override.yml       # optional: point at same db/redis containers, different db name
```

This maps directly onto the current Django apps: `agotboardgame_main` → `Snr.Web` pages/controllers,
`api` → `Snr.Api`, `chat` → `Snr.Web/Chat`.

## 4. Data model (fresh schema, EF Core code-first)

### 4.1 Guiding rule: preserve IDs the game server already persists

The Node game server stores raw string IDs inside `Game.serialized_game`/`view_of_game` JSON
(`EntireGame.id`, `EntireGame.users` keyed by user id, `publicChatRoomId` / `privateChatRoomsIds`
pointing at chat `Room.id`). **These IDs must be preserved exactly during import**, or every
persisted, currently-in-progress game becomes unloadable:

- `User.Id` (GUID) — must match Django's `agotboardgame_main.User.id` exactly.
- `Game.Id` (GUID) — must match Django's `Game.id` exactly.
- `Room.Id` (GUID, chat) — must match Django's `chat.Room.id` exactly (referenced from inside
  `serialized_game` as `publicChatRoomId`/private chat room ids).
- `Message.Id` / `PlayerInGame.Id` / `UserInRoom.Id` — not referenced from TS-side JSON; safe to
  regenerate, but the importer will preserve them anyway since it's free and simplifies diffing.

### 4.2 Entities

```
User (Identity user, extended)
  Id                 Guid   PK  (= legacy Django user id when imported)
  UserName           string (unique, 3-18 chars, same validator as Django)
  NormalizedUserName string
  Email              string? (nullable — some legacy OAuth users may have no verified email)
  NormalizedEmail    string?
  EmailConfirmed     bool
  PasswordHash       string?           // null until user sets a local password
  SecurityStamp / ConcurrencyStamp     // standard Identity plumbing
  GameToken          string            // ~ Django game_token, used by game server as auth bearer
  ProfileText        string?
  LastWonTournament  string?
  CustomUserBadge    string?           // admin-managed badge shown on the public profile
  EmailNotificationActive        bool  default true
  MuteGames                      bool  default false
  UseHouseNamesForChat           bool  default false
  UseMapScrollbar                bool  default true
  GameStateColumnRight           bool  default false // renders in-game state column on right; named
                                                       // UseResponsiveLayoutOnMobile in the legacy
                                                       // Django column/API JSON (never renamed there
                                                       // - see MIGRATION_PLAN.md §6 for the API translation)
  LastUsernameUpdateTime         DateTimeOffset?
  LastActivity                   DateTimeOffset
  ImportedFromLegacy             bool  default false // true for rows created by Snr.Migration
  Claimed                        bool  default true  // false only for ImportedFromLegacy rows with no login yet
  CreatedAt                      DateTimeOffset

UserLogin (= AspNetUserLogins, built into Identity)
  LoginProvider ("Google" | "Discord" | "Facebook")
  ProviderKey   (subject/user id from the provider)
  UserId -> User.Id

Group / Role (= Django auth Group: "Member", "Admin", "High Member", "Banned", "On probation", "Tongueless")
  -> ASP.NET Identity Roles, same names, same GROUP_COLORS-style badge mapping kept in Snr.Web config.

Game
  Id                Guid PK (= legacy Django game id when imported)
  Name              string
  OwnerUserId        Guid FK -> User
  SerializedGame     jsonb?   // full resumable state, same shape the TS server already produces
  ViewOfGame         jsonb?   // denormalized summary, same shape as today
  Version            string?
  State              string   // IN_LOBBY | ONGOING | FINISHED | CANCELLED
  CreatedAt / UpdatedAt / LastActiveAt

PlayerInGame
  Id      Guid PK
  GameId  Guid FK -> Game
  UserId  Guid FK -> User
  Data    jsonb   // same per-player payload Django stores today

PreviousPlayerInGame   // NEW — does not exist in Django, see §4.4
  Id          Guid PK
  GameId      Guid   FK -> Game
  UserId      Guid   FK -> User          // the user who was removed/replaced
  Reason      string?                    // "Vote" | "ClockTimeout", nullable — see §4.4
  ReplacedAt  DateTimeOffset?            // timestamp the row was created, if known
  CreatedAt   DateTimeOffset             // row insert time (audit only)
  // Unique index on (GameId, UserId) — at most one "currently removed" row per user per game at a
  // time. If they leave again after being voted back in, a fresh row is created (the old one was
  // already deleted when they returned). See §4.4.

PbemResponseTime
  Id            Guid PK
  UserId        Guid FK -> User
  ResponseTime  int
  CreatedAt     DateTimeOffset

Room (chat)
  Id                Guid PK (= legacy Django chat room id when imported)
  Name              string
  Public            bool
  MaxRetrieveCount  int?
  CreatedAt         DateTimeOffset

Message (chat)
  Id        long/Guid PK
  RoomId    Guid FK -> Room
  UserId    Guid FK -> User
  Text      string (<=200 chars)
  CreatedAt DateTimeOffset

UserInRoom (chat)
  Id                  Guid PK
  UserId              Guid FK -> User
  RoomId              Guid FK -> Room
  LastViewedMessageId Guid? FK -> Message
```

All `jsonb` columns keep using Postgres `jsonb` via Npgsql — no shape change needed on the game
server side; `SerializedGame`/`ViewOfGame` remain opaque blobs the TS server owns.

### 4.3 New database, not an in-place upgrade

Provision a **new** Postgres database (e.g. `snr_dotnet`) alongside the existing Django database
in the same Postgres instance (or a second one), so:

- Django keeps running unmodified against its own DB during the transition.
- EF Core migrations start from an empty schema — no risk of Django's migration history/format
  interfering.
- The importer (§7) connects to *both* databases at once (legacy read-only, new read/write).

### 4.4 `PreviousPlayerInGame` — fixing a gap that was never in Django

**The problem today:** `PlayerInGame` is fully recalculated from `IngameGameState.players` on
every `saveGame` (`api/serializers.py::GameSerializer.update` does
`instance.players.all().delete()` then recreates rows from the `players` array in the PATCH body —
see `GameSerializer.update` and `IngameGameState.getPlayersInGame()` /
`EntireGame.getPlayersInGame()`). When a player is removed from a game — replaced by a vassal
(Mother of Dragons mechanic) or timed out — they simply vanish from `IngameGameState.players`, so
the next save deletes their `PlayerInGame` row entirely. The game stops counting for or against
them, silently. This was never added to Django.

**What's implemented:** `PreviousPlayerInGame` is computed entirely by the .NET website, never
trusted from the wire (see §6.1 for why a dedicated game-server field was considered and dropped).
Two independent sources feed it, and both agree on the same simplified shape:

- **Live saves** (`GamesApi.cs`'s PATCH handler): every save that includes a `Players` list diffs
  the old and new user-id sets against the game's existing `PreviousPlayerInGame` rows. A user
  missing from the new list gets a row added, with `Reason` resolved from the just-saved
  `ViewOfGame`'s flat `oldPlayerIds`/`timeoutPlayerIds` arrays via
  `PreviousPlayerReasonResolver.Resolve` (null only if the user appears in neither — e.g. a
  replace-player-by-player/vassal swap this data model doesn't otherwise track); a user who
  reappears (voted back in) has their row removed again. See `GamesApi.DiffPreviousPlayers`,
  `PreviousPlayerReasonResolver`, and `GamesApiPreviousPlayerDiffTests`.
- **Historical import** (`Snr.Migration/PreviousPlayersBackfill.cs`, see §10.1): reads the game's
  `ViewOfGame` JSON (NOT the much larger `SerializedGame`) — a flat summary object with no
  `childGameState` nesting — specifically its top-level `oldPlayerIds` (→ `Reason = Vote`) and
  `timeoutPlayerIds` (→ `Reason = ClockTimeout`) via the same `PreviousPlayerReasonResolver`, for
  any legacy game that doesn't already have `PreviousPlayerInGame` rows, subtracting users still
  present according to the legacy `agotboardgame_main_playeringame` table (covers being voted back
  in — `ViewOfGame` itself has no raw current-player user-id list, only `victoryTrack[].player`, a
  display username).

**Deliberately not tracked:** which `House` a removed player held, whether that house ultimately
won (`WasWinner`), or a precise stint-ordering `SequenceNumber`. Reconstructing any of that
reliably would require replaying the game server's full vote/log history — which still has real
gaps (an additional "replace-player-by-player" vote type isn't visible in
`oldPlayerIds`/`timeoutPlayerIds`, and a user could theoretically hold more than one house across
replacements within a single game) — and isn't needed: every `PreviousPlayerInGame` row counts as
a loss unconditionally regardless of any of that (§10.2). `Reason` is kept (it's cheap and useful
context on a user's profile) but stays **nullable** for the cases `PreviousPlayerReasonResolver`
can't resolve from either array.

The natural key is `(GameId, UserId)`, unique — at most one "currently removed" row per user per
game at a time. If a user is voted back in and later removed again, the old row was already
deleted when they returned, so a fresh row is created rather than colliding.


## 5. Authentication design

### 5.1 Local username/password (new capability)

Standard ASP.NET Core Identity password login/registration pages. Password policy should be at
least as strict as Django's `AUTH_PASSWORD_VALIDATORS` (min length, not-too-common, not fully
numeric, not similar to username) — replicate with Identity's `PasswordOptions` +
`IPasswordValidator` (built-ins mostly cover this; add a small custom validator for the
"not-too-similar-to-username" check).

### 5.2 External providers

- **Google** — `AddGoogle(...)` using the same `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY/SECRET` values
  (rename to `Authentication:Google:ClientId/ClientSecret`).
- **Discord** — a small custom `OAuthHandler<OAuthOptions>` (see `Infrastructure/Auth/DiscordAuthenticationExtensions.cs`,
  since Discord doesn't ship an official Microsoft package), same client id/secret, request
  `identify email` scope (same as `SOCIAL_AUTH_DISCORD_SCOPE = ["identify", "email"]` today).
- **Facebook (new, replaces the originally-planned Instagram)** — `AddFacebook(...)` from the
  official `Microsoft.AspNetCore.Authentication.Facebook` package, same shape as Google's. Request
  the `email` scope/field explicitly (Facebook does return a verified email when the user grants
  that permission, unlike Instagram's Login product which frequently doesn't return one at all —
  Instagram was dropped as a provider for exactly that reason). Note Facebook does require an
  app-review pass (privacy policy URL, business verification) before non-test users can log in
  with a production Facebook app — see §12.

### 5.3 Account linking / "claiming" pipeline

Runs after any successful external login callback, and also on local registration. Conceptually a
straight port of Django's `social_core.pipeline.social_auth.associate_by_email` step:

```
OnExternalLoginCallback(provider, providerKey, emailFromProvider, displayName):
    existingLogin = FindByLogin(provider, providerKey)
    if existingLogin != null:
        SignIn(existingLogin)                       # returning user, done
        return

    if emailFromProvider != null:
        candidate = Users.SingleOrDefault(u =>
            u.NormalizedEmail == Normalize(emailFromProvider) &&
            u.ImportedFromLegacy && !u.Claimed)
        if candidate != null:
            AddLogin(candidate, provider, providerKey)
            candidate.Claimed = true
            SignIn(candidate)                        # imported account just got linked
            return

        candidateAlreadyClaimed = Users.SingleOrDefault(u =>
            u.NormalizedEmail == Normalize(emailFromProvider) && u.Claimed)
        if candidateAlreadyClaimed != null:
            # Same email, but already linked to a different login method.
            # Do NOT silently merge — show "an account with this email already exists,
            # sign in with your original method or contact support" (avoids account takeover
            # via a spoofed/re-registered email at a provider).
            ShowConflictPage()
            return

    NewUser = CreateUser(username: SuggestUsernameFrom(displayName), email: emailFromProvider)
    AddLogin(NewUser, provider, providerKey)
    SignIn(NewUser)

OnLocalRegister(username, email, password):
    candidate = Users.SingleOrDefault(u =>
        u.NormalizedEmail == Normalize(email) && u.ImportedFromLegacy && !u.Claimed)
    if candidate != null:
        SetPassword(candidate, password)             # "claim by setting a password"
        candidate.Claimed = true
        SignIn(candidate)
        return
    # else: normal Identity CreateAsync(...) flow, subject to the uniqueness constraints
```

Key points to keep from Django's behavior:
- Matching is **by normalized email only**, same as `associate_by_email`.
- An imported row is only auto-linked **once** (`Claimed` flips permanently) — subsequent
  logins from a second, different email never re-trigger linking against an already-claimed row.
- Already-claimed collisions are surfaced, not silently merged (Django's pipeline has this same
  property implicitly, since `associate_by_email` only fires when `social_user` didn't already
  find an association).

## 6. REST API for the game server (`Snr.Api`)

Goal: **the TypeScript `WebsiteClient`/`LiveWebsiteClient.ts` contract in `agot-bg-game-server/src/server/website-client/` should not need to change at all** — same routes, same JSON field names, same HTTP verbs, same Basic Auth. Only the base URL host/port changes (still just `MASTER_API_BASE_URL`).

| Django route (`api/urls.py`) | ASP.NET Core equivalent | Notes |
|---|---|---|
| `GET /api/user/{id}` | `UsersController.Get(Guid id)` | Same fields: `id, username, game_token, is_staff, mute_games, use_house_names_for_chat, use_map_scrollbar, use_responsive_layout_on_mobile, groups`. The DB column/CLR property backing the last one is `GameStateColumnRight` (renamed to match what it actually controls - see §4.2); `UserDto` pins the JSON key back to `use_responsive_layout_on_mobile` via `[JsonPropertyName]` so the game server needs no change. |
| `GET/PATCH /api/game/{id}` | `GamesController.Get/Patch` | `PATCH` body: `serialized_game, state, version, view_of_game, players[], update_last_active` — same partial-update semantics as `GameSerializer.update`. **Plus new optional `previous_players[]` field, see §6.1.** |
| `POST /api/room` | `RoomsController.Create` | Same body shape (`name, public, users, max_retrieve_count`). |
| `POST /api/notifyReadyToStart/{gameId}` etc. (5 notify endpoints) | `NotificationsController` actions | Same mail templates, same "only email users with notifications enabled" filter. |
| `POST /api/addPbemResponseTime/{userId}/{responseTime}` | `NotificationsController.AddPbemResponseTime` | |
| `DELETE /api/clearChatRoom/{roomId}` | `RoomsApi` (`MapDelete("/clearChatRoom/{roomId:guid}")`) | Deletes all messages in the room. Must be a literal `/api/clearChatRoom/{roomId}` path, not nested under `/api/room/...` — `LiveWebsiteClient.ts`'s `clearChatRoom()` calls this exact URL when a faceless game starts (`EntireGame.proceedToIngameGameState` → `GlobalServer.onClearChatRoom`); an earlier version of this endpoint used a different path here and broke the game server at the start of every faceless game. |
| `GET /api/game/{id}/isCancelled` | `GamesController.IsCancelled` | |
| `GET /api/public/game/{id}` | `PublicController.GetGameView` | Same sanitization: strip `replacerIds, oldPlayerIds, waitingForIds, publicChatRoomId, timeoutPlayerIds`; rename `turn` → `round`. Anonymous/unauthenticated (matches Django's actual `@permission_classes([])`/AllowAny — `api/PUBLIC_API.md`'s "Authentication Required: Yes" is stale docs, contradicted by the view's own docstring), so third-party sites can fetch live game state directly without forwarding cookies or hitting CORS/credentials issues. Documented at `/api/docs` via the built-in ASP.NET Core OpenAPI generator (`Microsoft.AspNetCore.OpenApi`, not Swashbuckle) — see §6.3. |

Implementation note: these endpoints are implemented as **Minimal API** endpoint groups
(`MapGroup("/api")...MapGet/MapPost/MapPatch`), not MVC controllers — no `[ApiController]` classes,
matching current ASP.NET Core guidance for small/medium JSON APIs. Identity's own login/register
UI still uses Razor Pages (that's how `Microsoft.AspNetCore.Identity.UI` ships), so the project has
no controller classes at all.

Auth for the service-to-service endpoints: replicate DRF's `BasicAuthentication` +
`IsAdminUser` with a small `AuthenticationHandler<BasicAuthenticationSchemeOptions>` that checks
credentials against `MASTER_API_USERNAME`/`MASTER_API_PASSWORD` config values (the same two env
vars the game server already sends — see `LiveWebsiteClient.ts`). No code changes needed on the
Node side.

**Bug found & fixed while first testing against the real `LiveWebsiteClient`:** the DTOs in
`Api/Dtos.cs` were written assuming a global `JsonNamingPolicy.SnakeCaseLower` was configured (its
header comment says so), but that configuration was never actually added to `Program.cs`. Every
response therefore serialized with ASP.NET Core Minimal API's default (camelCase) instead —
`UserDto.GameToken` came back as `"gameToken"`, not `"game_token"`, which is the exact field
`LiveWebsiteClient.ts`'s `getUser()` reads (`response.game_token`). That silently produced
`undefined` on the TS side, so `GlobalServer.ts`'s `userData.token != authToken` authentication
check always failed once real (non-default) `MASTER_API_USERNAME`/`MASTER_API_PASSWORD`
credentials were configured on both sides — this had gone unnoticed until then because nothing
had exercised the real HTTP round-trip before. Fixed with a single
`builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.PropertyNamingPolicy =
JsonNamingPolicy.SnakeCaseLower)` in `Program.cs`; `PropertyNamingPolicy` applies to both
directions, so this also fixes `GamesController.Patch`'s body binding (`serialized_game`,
`view_of_game`, `update_last_active`, ...) and `RoomsController.Create`'s `max_retrieve_count`,
neither of which had been exercised end-to-end before either. One endpoint needed an explicit
override on top of this: `GET /api/game/{id}/isCancelled` returns a bare `{ "cancelled": bool }`
(not `{ "is_cancelled": bool }`), matching `LiveWebsiteClient.ts`'s `isGameCancelled()` which reads
`response.cancelled` — that property is named `cancelled` directly in the anonymous response
object rather than relying on the naming policy to derive it from `IsCancelled`.
`agot-bg-website.Tests/Api/ApiJsonNamingPolicyTests.cs` pins the snake_case wire format down for
`UserDto`/`GameDto`/`CreateRoomDto` so this can't silently regress back to camelCase again.

### 6.1 `PreviousPlayerInGame` — no game-server changes needed after all

Earlier drafts of this plan proposed a new TS method (`IngameGameState.getPreviousPlayersInGame()`)
that would replay `gameLogManager.logs` to resolve exactly which house/user/reason/winner applied
to each removal, and send it to the website as a new `previous_players` field on every save. That
approach was **abandoned** — it would have been the only game-server code change in this whole
plan, for a feature whose actual scoring use (§10.2) only needs "was this user removed from this
game before it ended", never house/winner/reason. Reconstructing that reliably from replaying logs
also has real gaps (an additional "replace-player-by-player" vote type isn't visible in
`oldPlayerIds`/`timeoutPlayerIds`, and a user could theoretically hold more than one house across
replacements within a single game), so the precision wasn't worth the added game-server surface
area and coupling to the log schema.

**What's implemented instead:** the game server sends **nothing new**. `PreviousPlayerInGame` is
computed entirely by the .NET website itself, purely by diffing `Players` across saves —
`GamesApi.cs`'s PATCH handler already has the old player list (`game.Players`, loaded before the
replace) and the new one (`patch.Players`, the payload the game server always sends):

- A user present in the old list but missing from the new one → a `PreviousPlayerInGame` row is
  added for them, with `Reason` resolved from the just-saved `ViewOfGame`'s flat top-level
  `oldPlayerIds`/`timeoutPlayerIds` arrays via the shared `PreviousPlayerReasonResolver` (null only
  if the user appears in neither — e.g. a replace-player-by-player/vassal swap this data model
  doesn't otherwise track; see §4.4).
- A user who already has a `PreviousPlayerInGame` row but reappears in the new list (voted back in)
  → that row is removed again.

This pure diff logic lives in `GamesApi.DiffPreviousPlayers(oldPlayerUserIds, newPlayerUserIds,
existingPreviousPlayerUserIds)`, `internal static` specifically so it can be unit-tested directly
without a database (`GamesApiPreviousPlayerDiffTests`). `Reason` resolution itself lives in
`PreviousPlayerReasonResolver`, shared with the historical backfill (§10.1) so both paths agree on
the same logic — see `PreviousPlayerReasonResolverTests`.

**Post-implementation fix (local dev, live-tested):** the first real save-after-seating hit a
`DbUpdateConcurrencyException` ("expected to affect 1 row(s), but actually affected 0 row(s)") on
every single PATCH that added a player, not just under concurrent requests. Root cause: the new
`PlayerInGame` rows were assigned straight to the tracked `Game`'s navigation collection
(`game.Players = newList`) without ever calling `db.PlayersInGame.AddRange(...)`. Because each
row's `Id` is a client-set (non-default) `Guid`, EF Core's automatic graph fixup assumed the row
already existed and issued an `UPDATE` instead of an `INSERT` — which affects 0 rows for a row that
was never inserted. Fixed in `GamesApi.cs` by explicitly calling `AddRange` for the replacement
`PlayerInGame` list before assigning it to the navigation property; pinned down by
`GamesApiPlayerReplacementTests`. Separately, `GamesApi.cs`'s PATCH handler also acquires a
per-game `Infrastructure.GameSaveLock` (an in-memory `SemaphoreSlim` keyed by game id) as
defense-in-depth, since the game server's fire-and-forget `saveGame()` can genuinely fire
overlapping saves for the same game — this wasn't the cause of the reported exception, but is
worth keeping since it's a real possible race on the delete-then-recreate `Players` replace and the
`PreviousPlayerInGame` add/remove that now happens alongside it. Note this lock only works for a
single-process deployment; a horizontally-scaled deployment would need a distributed lock instead
(e.g. a Postgres advisory lock).

### 6.2 Network-isolating the private API from the public port (implemented)

The service-to-service endpoints in §6 (`Api/UsersApi.cs`, `GamesApi.cs`, `RoomsApi.cs`,
`NotificationsApi.cs` — everything gated by `MasterApiAuthenticationHandler`, i.e. Basic Auth
against `MASTER_API_USERNAME`/`MASTER_API_PASSWORD`) are, in the current Django deployment,
reachable on the same public port as the rest of the website and rely solely on that Basic Auth
credential for protection. Since a Docker Compose network already lets sibling containers reach
any port a container listens on via its service DNS name — whether or not that port is
`ports:`-published to the host — we can add network-level isolation as defense-in-depth without
Kubernetes, by giving these routes their own **internal-only** Kestrel endpoint that is simply
never published to the host.

**Two named Kestrel endpoints**, configured in `appsettings.json`'s `Kestrel:Endpoints` section, in
base config so the same values apply identically to plain `dotnet run` and to the Docker container
(this matters — see the pitfall below):
- `Public` — `http://0.0.0.0:8000` (everything user-facing: Razor Pages, `PublicApi`, `PlayApi`,
  chat WebSocket, static assets). Matches the Dockerfile's `EXPOSE 8000` and the "Container
  (Dockerfile)" launch profile's `httpPort`, and the old Django dev port for familiarity.
- `GameServerApi` — `http://0.0.0.0:8001` (only the four private route groups above). Only this
  port needs to be reachable by the game-server container; in production compose, only `Public`
  should be listed under `ports:`, leaving `GameServerApi` reachable solely from sibling containers
  on the same compose network (point the game server's `MASTER_API_BASE_URL` at
  `http://<website-service-name>:8001` there).

  **⚠️ Staging/production deployment note:** the local `launchSettings.json` Container profile
  publishes `8001` to the host too (see pitfall #3 below) purely so a host-run `yarn run
  run-server` game server can reach it in local dev. **Do not carry that over to the staging/
  production `docker-compose.yml`** — there, `GameServerApi` (`8001`) must be left out of
  `ports:` entirely, since both the website and game server run as sibling containers on the same
  compose network there and can already reach each other by service name without any host
  publishing. Publishing `8001` to the host in production would defeat the whole point of this
  feature (network-level isolation of the Basic-Auth-only API).

**Pitfall #1 found & fixed: don't put an environment-specific override on `Kestrel:Endpoints` for a
port VS's Docker profile also relies on.** The first version of this had `Public` bound to
`0.0.0.0:8080` in base config, overridden to `localhost:8000` only in
`appsettings.Development.json` for local `dotnet run` convenience. But `ASPNETCORE_ENVIRONMENT=
Development` is *also* the environment VS's "Container (Dockerfile)" debug profile runs with, so
that override silently applied inside the container too, on top of being loopback-only. Fixed by
putting the real, final port values (`8000`/`8001`) directly in the environment-agnostic base
`appsettings.json` instead of layering a dev-only override on top — one value, used identically
everywhere.

**Pitfall #2 found & fixed: VS's own Docker debug port mapping doesn't read `appsettings.json` at
all.** Even after fixing pitfall #1, F5-debugging via the "Container (Dockerfile)" profile still
produced `ERR_EMPTY_RESPONSE`. Root cause, found by inspecting the actual running debug container
with `docker inspect`: Visual Studio's Docker debug tooling decides which **container-side** port
to map `httpPort` (the host port, `8000` in `launchSettings.json`) to based on its own
`ASPNETCORE_HTTP_PORTS` environment variable — defaulting to `80` if that variable isn't set in the
launch profile — regardless of the Dockerfile's `EXPOSE` directives or anything in
`appsettings.json`'s `Kestrel:Endpoints`. Since our Kestrel config always overrides
`ASPNETCORE_HTTP_PORTS` for the app's *own* binding (see below), the app inside the container was
correctly listening on `8000`/`8001` the whole time — but VS was mapping host `8000` to container
`80`, where nothing listens, producing an empty response. The original (pre-port-split)
`launchSettings.json` had an explicit `"ASPNETCORE_HTTP_PORTS": "8080"` in the Container profile
for exactly this reason; it was mistakenly removed as "redundant" when the port split was first
implemented, since it has no effect on the app's actual Kestrel binding once `Kestrel:Endpoints` is
configured — but VS's own port-mapping decision still needs it. Fixed by restoring
`"ASPNETCORE_HTTP_PORTS": "8000"` in the Container profile's `environmentVariables` (updated to the
new port number). Verified by inspecting a real `docker run`/`docker inspect` reproduction of VS's
mapping behavior end-to-end, not just a bare `dotnet run`.

**Kestrel endpoint config replaces, not merges with, URL-based binding** — confirmed empirically:
the moment `Kestrel:Endpoints` (or `ConfigureKestrel`/`ListenAnyIP` in code) is present, Kestrel
logs `Overriding address(es) '...'. Binding to endpoints defined via IConfiguration and/or
UseKestrel() instead.` and stops honoring `ASPNETCORE_URLS`/launchSettings' `applicationUrl`/
`ASPNETCORE_HTTP_PORTS` entirely for the app's own binding — but see pitfall #2 above, VS's own
Docker port-mapping tooling still reads `ASPNETCORE_HTTP_PORTS` independently of that.

**Pitfall #3 found & fixed: local (non-Docker) game-server dev needs `GameServerApi` published
too.** `docker-compose`'s "sibling containers can reach unpublished ports" story (the whole
premise of this feature) only holds when the game server *also* runs inside the same Compose
network. For local development the game server normally runs directly on the host via
`yarn run run-server` (see root README), not inside a container, so it needs to reach the website's
container the same way a browser does — through a published host port. With only `Public` (`8000`)
published, `LiveWebsiteClient.ts`'s calls to `MASTER_API_BASE_URL` (default
`http://localhost:8001`) failed with `ECONNREFUSED`. Fixed by adding
`"containerRunArguments": "-p 8001:8001"` to the Container launch profile — this is purely a local
convenience for VS's Docker debug profile and has **no effect on the production docker-compose
file**, where `GameServerApi` must stay unpublished (see the staging/production deployment note in
§6.2 above the profiles). If a real Docker Compose–orchestrated local setup is used instead
(game server + website both as Compose services), this isn't needed — the game server would reach
`GameServerApi` via the service's internal DNS name/port directly, same as production.

**Enforcement (`Infrastructure/EndpointRoutingExtensions.cs`):** the private route groups call
`.RequireLocalPort(gameServerApiPort)`, which attaches `RequireLocalPortMetadata` rather than
enforcing anything itself. A single `app.UseLocalPortRestriction()` middleware — registered after
`UseRouting()` (so `HttpContext.GetEndpoint()` resolves) but **before** `UseAuthentication()`/
`UseAuthorization()` — reads that metadata off the matched endpoint and returns a bare 404
immediately if `HttpContext.Connection.LocalPort` doesn't match. Two deliberate design choices,
both found by testing rather than assumed:
- **`Connection.LocalPort`, not `RequireHost`.** `RequireHost("*:8001")` matches the client-supplied
  `Host` header, not the physical port a connection was accepted on — a request that connects to
  the public port but sends a forged `Host: internal:8001` header would satisfy it. `LocalPort`
  reflects the real accepting socket and can't be spoofed.
- **Plain middleware before `UseAuthentication()`, not an `AddEndpointFilter`.** Endpoint filters
  run as part of terminal endpoint invocation, which is *after* the authentication/authorization
  middleware. A filter-based first attempt at this was live-tested and found to leak the 401 Basic
  Auth challenge (proving the endpoint exists and is Basic-Auth-gated) to the public port before
  the filter ever ran. Moving the same port check into middleware ahead of `UseAuthentication()`
  closes that: a wrong-port request now gets an indistinguishable-from-nonexistent 404 with no
  `WWW-Authenticate` challenge, confirmed via a live curl test matrix (public port + private path,
  with and without a spoofed `Host` header, both 404; private port + private path without auth,
  401 as expected; both ports still serve their legitimate public routes with 200).

### 6.3 `/api/docs` — interactive OpenAPI UI for the public API only (implemented)

`Microsoft.AspNetCore.OpenApi` (the framework's own built-in generator, **not** Swashbuckle/Swagger
— see [the ASP.NET Core OpenAPI docs](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/aspnetcore-openapi))
is wired up in `Program.cs` to publish a single OpenAPI document at the framework's default route,
`GET /openapi/v1.json`. `Scalar.AspNetCore` (https://github.com/scalar/scalar) renders an
interactive, "try it out"-capable UI on top of that document at `GET /api/docs` — deliberately
Scalar rather than Swagger UI, per preference. Both are reachable on any configured Kestrel
endpoint. The document describes **only** `PublicApi` (`/api/public/game/{id}`) — the one JSON REST
endpoint meant for outside/third-party consumption. `PlayApi` returns HTML, not JSON, and
`UsersApi`/`GamesApi`/`RoomsApi`/`NotificationsApi` are the private, Basic-Auth-only,
port-restricted game-server contract from §6.2 that only the TS game server should ever call — both
are deliberately excluded from the generated document, not merely undocumented.

**How the filtering works:** `PublicApi.MapPublicApi()` tags its route group with
`.WithGroupName("public")`. `AddOpenApi`'s `options.ShouldInclude` is set explicitly to
`description => description.GroupName == "public"` rather than relying on the framework's default
"include endpoints with no group name too" behavior, so any future endpoint added without a group
name doesn't silently leak into `/api/docs`.

**Why the raw document stays at the default `/openapi/v1.json` route instead of `/api/docs`
itself:** the document is left **unnamed** (so it gets the framework's own default name, `"v1"`)
and mapped with a plain `app.MapOpenApi()` (no custom route). `app.MapScalarApiReference("/api/docs", ...)`
is a separate endpoint that serves the interactive UI's HTML/JS and, by default, already knows to
fetch the OpenAPI document from `/openapi/{documentName}.json` for whichever document(s) are
registered — no extra wiring needed to point it at the right JSON. (An early attempt served the raw
JSON itself directly at `/api/docs` via `MapOpenApi("/api/docs")` with an explicitly-named "public"
document; that mismatch between the document's registered name and the query-less fallback's
hardcoded expectation of `"v1"` made `/api/docs` 404 every time — found by testing, not assumed.
Switching to the default unnamed/"v1" document and letting Scalar own the `/api/docs` route instead
sidesteps that whole class of route-vs-document-name mismatch.)

**Anonymous access, matching Django:** `PublicApi`'s route group has no
`.RequireAuthorization()` at all. This matches Django's *actual* behavior — `api/views.py`'s
`get_game_view` uses `@permission_classes([])` (`AllowAny`), and its own docstring says "Public API
endpoint for anonymous access to view_of_game" — even though `api/PUBLIC_API.md` claims
"Authentication Required: Yes" (stale docs, contradicted by the code). An earlier version of this
port required a session cookie here, which was a bug: requiring auth defeats the point of a
"public" endpoint for third-party sites embedding live game state, since they have neither a
same-site session cookie to forward nor any interest in an OAuth login flow, and since a
credentialed cross-origin request also runs into CORS preflight/credentials complications that a
plain, anonymous, cookie-less GET avoids entirely. Fixed to have no authorization requirement,
matching Django.

## 7. Chat (`Snr.Web/Chat`) — WebSocket handler mirroring `consumers.py`

Implement a raw `app.Map("/ws/chat/room/{roomId}", ...)` WebSocket endpoint that:

- Requires cookie-authenticated user (equivalent to Channels' `AuthMiddlewareStack`).
- Validates room exists + user has access (public room, or a `UserInRoom` row for private rooms),
  creating a `UserInRoom` row on first connect — same as `ChatConsumer.connect`.
- Handles the same message `type`s the TS `ChatClient.ts` already sends/expects:
  `chat_message`, `chat_view_message`, `chat_retrieve`, and server → client
  `chat_message`, `chat_messages_retrieved`/`more_chat_messages_retrieved`, `connected_users`,
  `force_disconnect`.
- Re-implements the "tongueless" rate limiting (`IMemoryCache`/Redis, one message per 60s, single
  character replies only) and the private-message email notification (7-minute de-dupe window),
  using the same thresholds as `consumers.py`.
- Presence tracking (`connected_users` for the public room) via a small Redis-backed dictionary,
  replacing the Django cache-based `get_connected_users_cache_key` helpers — same stale-after-1-hour
  pruning behavior.
- Cross-instance fan-out via Redis pub/sub (`StackExchange.Redis`), replacing `channel_layer`.

Because the JSON shapes are unchanged, **`ChatClient.ts` needs no changes.**

## 8. Serving the game client (equivalent of `build_and_place_game_client_into_django.sh`)

### 8.1 One small required change in `agot-bg-game-server/`

`public/index.html` used to hardcode a **Django template tag**:

```html
<div style="display: none">
    {{ auth_data|json_script:"auth-data" }}
</div>
```

It's now a framework-neutral placeholder so any backend can inject the auth payload:

```html
<script id="auth-data" type="application/json">AUTH_DATA_JSON</script>
```

**Important, learned the hard way:** the placeholder must be literal *text* inside a real
element, not an HTML comment. An earlier version of this placeholder was
`<div style="display: none"><!--AUTH_DATA_JSON--></div>`, which looked more "neutral" but is
wrong: `webpack.client.js`/`webpack.client.local.js` build with `HtmlWebpackPlugin` in production
mode, whose default minify preset (`removeComments: true`) strips *all* HTML comments from the
built `dist/index.html` — including this one — before the file ever reaches either backend. The
placeholder would silently disappear from the real built asset (while still looking correct in
`public/index.html` and in any manual review), so `PlayApi.cs`'s string replace found nothing to
replace, and the client threw "No auth data available, can't authenticate to the server" at
runtime. The current `<script id="auth-data" type="application/json">AUTH_DATA_JSON</script>`
placeholder survives minification because it's a real, non-empty text node — and
`type="application/json"` keeps `minifyJS`/the browser from touching or executing it before the
backend substitutes real JSON in. `agot-bg-website.Tests/Api/PlayApiAuthDataPlaceholderTests.cs`
pins this contract down. If this ever needs to change again, verify against the actual *built*
`agot-bg-game-server/dist/index.html` (via `yarn run build-local-client`), not just the
`public/index.html` source.

This is the only change needed in the game-server repo for this migration.

### 8.2 `build_and_place_game_client_into_dotnet.ps1` (new script, same shape as the bash one)

```powershell
# Mirrors build_and_place_game_client_into_django.sh, targeting the .NET app instead of Django.
Write-Host "---> Building the game client"
Push-Location agot-bg-game-server
yarn install
yarn run build-local-client
Pop-Location

Write-Host "---> Placing the static files of the game client into the .NET app"
$dest = "agot-bg-website-dotnet/src/Snr.Web/wwwroot/static_game"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Recurse -Force "agot-bg-game-server/dist/*" $dest -Exclude "index.html"

$templateDir = "agot-bg-website-dotnet/src/Snr.Web/GameClientTemplates"
New-Item -ItemType Directory -Force -Path $templateDir | Out-Null
Copy-Item -Force "agot-bg-game-server/dist/index.html" "$templateDir/play.html"
```

A POSIX `build_and_place_game_client_into_dotnet.sh` twin should exist too, for parity with CI/Linux
maintainers, mirroring the existing bash script style.

### 8.3 Serving it (`PlayController`, equivalent of Django's `views.play`)

```csharp
[Authorize]
public class PlayController : Controller
{
    private static readonly Lazy<string?> Template = new(() =>
        File.Exists(TemplatePath) ? File.ReadAllText(TemplatePath) : null);

    [HttpGet("/play/{gameId:guid}/{userId:guid?}")]
    public async Task<IActionResult> Play(Guid gameId, Guid? userId)
    {
        // ... same authorization checks as Django's views.play:
        //   - banned users get force-logged-out
        //   - "on probation" users can't join new lobby games
        //   - userId param requires "can_play_as_another_player" permission
        var authData = new { userId, requestUserId = CurrentUserId, gameId, authToken = game_token };
        var html = Template.Value ?? await System.IO.File.ReadAllTextAsync(FakeTemplatePath);
        var json = JsonSerializer.Serialize(authData); // HTML-escaped the same way Django's json_script does
        return Content(html.Replace("<!--AUTH_DATA_JSON-->",
            $"<script id=\"auth-data\" type=\"application/json\">{HtmlEncoder.Default.Encode(json)}</script>"),
            "text/html");
    }
}
```

`GameClientTemplates/play_fake.html` (a straight port of Django's `play_fake.html`) is served
instead when the real template hasn't been built/placed yet, so `dotnet run` alone still boots a
usable (if game-less) website — same developer experience as today.

### 8.4 Deployment (`website.Dockerfile` equivalent)

Two-stage build, same shape as the current one:

```dockerfile
FROM node:16 AS build-client
WORKDIR /app
COPY ./agot-bg-game-server/package.json ./agot-bg-game-server/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY ./agot-bg-game-server/ .
ENV ASSET_PATH=https://swordsandravens.ams3.cdn.digitaloceanspaces.com/
RUN yarn run generate-json-schemas && yarn run build-client

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-web
WORKDIR /src
COPY ./agot-bg-website-dotnet/ .
RUN dotnet publish src/Snr.Web -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-web /app/publish .
COPY --from=build-client /app/dist ./wwwroot/static_game
COPY --from=build-client /app/dist/index.html ./GameClientTemplates/play.html
ENTRYPOINT ["dotnet", "Snr.Web.dll"]
```

## 9. Local dev workflow (replaces the relevant section of the root README)

### 9.1 Config mapping (`.env` → `appsettings`/user-secrets)

| Django `.env` key | ASP.NET Core equivalent |
|---|---|
| `DEBUG` | *(none — `ASPNETCORE_ENVIRONMENT=Development` locally (Properties/launchSettings.json), `Production` on the DO droplet since cutover, `Staging` before it/if dogfooding again — see appsettings.Production.json/appsettings.Staging.json)* |
| `SECRET_KEY` | Data Protection key ring, persisted to Redis in every environment (see `Program.cs`'s `PersistKeysToStackExchangeRedis`) |
| `DATABASE_URL` | `ConnectionStrings:Default` |
| `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY/SECRET` | `Authentication:Google:ClientId/ClientSecret` |
| `SOCIAL_AUTH_DISCORD_KEY/SECRET` | `Authentication:Discord:ClientId/ClientSecret` |
| *(new)* | `Authentication:Facebook:ClientId/ClientSecret` |
| `EMAIL_HOST/PORT/HOST_USER/HOST_PASSWORD` | `Email:Host/Port/Username/Password` |
| `REDIS_URL` | `ConnectionStrings:Redis` |
| `AWS_*` (S3 static storage) | `BlobStorage:*` (optional, only if you keep S3-hosted static assets) |
| *(new, replicated from the game server's `.env`)* | `GameServer:MasterApiUsername/Password` — Basic Auth credentials the game server sends |
| *(new)* | `PublicSiteUrl` — the public base URL (e.g. `https://swordsandravens.net`) used to build `/play/{gameId}` links in game-notification/private-message emails; the game-server-facing API only ever receives requests on its private internal port, so those emails can't derive the right host from the inbound request the way browser-triggered pages can |

### 9.2 Launching the website only

```bash
cd agot-bg-website-dotnet
dotnet tool restore                     # ef core CLI, etc.
docker compose -f ../docker-compose.yml up -d   # reuse existing postgres/redis
dotnet ef database update --project src/Snr.Infrastructure --startup-project src/Snr.Web
dotnet run --project src/Snr.Web
```

Use `dotnet user-secrets` for the OAuth client id/secret pairs in development, same role as
Django's `.env` file. Since Google/Discord/Facebook auth won't work without real app credentials,
local sign-in during development uses **the new local username/password flow** — solving the
exact pain point Django had ("As Google and Discord authentication is not available you can login
via `/admin`" → now: just register locally).

### 9.3 Launching the game + website together

Same shape as today, three steps:

```bash
./build_and_place_game_client_into_dotnet.ps1
cd agot-bg-website-dotnet && dotnet run --project src/Snr.Web
cd agot-bg-game-server && yarn run run-server   # .env still has MASTER_API_* pointed at the .NET app's port
```

## 10. Data migration tool (`Snr.Migration`)

> **`import` is now permanently disabled (deprecated).** The one-time production cutover import
> described in this section already ran to completion (§18) and the legacy Django/Dokku server has
> since been decommissioned and destroyed — there is no legacy database left anywhere to import
> from. `dotnet run --project Snr.Migration -- import` now always refuses to run immediately (see
> `Program.cs`'s `RunImportAsync`), regardless of what `--legacy`/`--target` are passed. This
> section is kept as historical documentation of how the migration worked, not as a runnable
> procedure. `verify`/`backfill-initial-players` (and any future one-time migration verb — see
> §14/§15) are unaffected.

A small, **repeatable/idempotent** console app, not a one-shot script — safe to re-run against a
freshly-restored copy of the production Django DB as many times as needed while building/testing
the new site, and again at final cutover. Verbs are parsed with the `CommandLineParser` NuGet
package (`[Verb]`/`[Option]` records in `Program.cs`), so adding a future one-time migration/
backfill tool only means adding one more options record and `MapResult` arm.

```
dotnet run --project src/Snr.Migration -- import --legacy "Host=...;Database=snr_django;..." --target "Host=...;Database=snr_dotnet;..." [--messages-days-back N]
```

Import order and behavior:

1. **Users** — copy `id, username, email, ...settings fields...` only, per your requirement
   (no auth/password/social-login data exists in Django to migrate anyway). Every imported row is
   written with `ImportedFromLegacy = true`, `Claimed = false`, `PasswordHash = null`, no
   `AspNetUserLogins` rows. Re-running updates settings fields for already-imported-but-still-
   unclaimed rows (so you can re-import right up to cutover); it never touches rows that have since
   been `Claimed` by a real login, to avoid clobbering a live user's data.
2. **Groups/Roles** — copy Django's `auth_group`/`user_groups` membership onto ASP.NET Identity
   roles of the same name.
3. **Rooms** (chat) — copy `id, name, public, max_retrieve_count`, preserving `id`.
4. **Games** — copy `id, name, owner_id, serialized_game, view_of_game, version, state,
   created_at, updated_at, last_active_at`, preserving `id`. Games cancelled while still in the
   lobby (`view_of_game.turn == -1` and `state == CANCELLED`) are **never imported** — they have no
   players who really played and no chat worth preserving. If an older run already imported one
   (from before this rule existed), it's deleted from the target instead (game row, its public chat
   room, and all of that room's messages). This exactly mirrors what the live save-game endpoint
   (`GamesApi.cs`'s PATCH handler) now does going forward: as soon as a game is saved as
   `CANCELLED` while `view_of_game.turn` is still `-1`, it's deleted outright rather than kept as a
   dead row.
5. **PlayerInGame** — copy `game_id, user_id, data`.
6. **Historical `PreviousPlayerInGame` backfill** — see §10.1 below; runs automatically as part of
   this import, right after PlayerInGame.
7. **Messages** (chat) — optional/streamed in batches given likely volume. Controlled by
   `--messages-days-back`: `-1` (default) imports all history, `0` imports none, and any positive
   `N` only imports messages younger than `N` days — useful to keep a first cutover-rehearsal
   import fast, or to intentionally leave old chat history behind.
8. **PbemResponseTime** — copy directly, historical/statistical only.
9. **UserInRoom** — copy `user_id, room_id` (chat_userinroom). **Not** optional, despite what an
   earlier version of this doc claimed: `ChatWebSocketApi.cs` requires an existing `UserInRoom` row
   before it lets anyone connect to a non-public room at all, and only public/issues rooms let a
   first-time connection create that row on demand (see `ChatWebSocketApi.cs`'s connect handler) —
   private (per-game) rooms do not. Skipping this step means every migrated private chat room comes
   in permanently unjoinable (bug found & fixed 2026-09; `last_viewed_message_id` itself is still
   skipped since it points at a legacy integer `chat_message.id` with no counterpart in the new
   Guid-keyed `Message` table — see `LegacyUserInRoom`'s doc comment).

Verification pass at the end: row counts per table compared between source and target, plus a spot
check that a sample of `Game.Id`/`User.Id`/`Room.Id` values round-trip unchanged (critical, since
those are embedded inside `serialized_game` JSON the TS server still owns).

### 10.1a Performance and re-run behavior

Every `Import*Async` step batches `SaveChangesAsync()` + `ChangeTracker.Clear()` (default every 500
rows, `Games` every 20 given how much larger each row can be) instead of once at the end of a loop
over tens of thousands of rows — without the `Clear()`, EF Core keeps every entity it has ever
tracked in memory for the whole run even after it's been saved, a real OOM risk on `Messages`/
`PbemResponseTime` in particular.

`Games` never round-trips `SerializedGame` through `JsonDocument`/EF's value converter at all — it
can be multi-MB per row and this importer never needs to inspect it (only `ViewOfGame`'s small
top-level fields are read). It's written via a raw parameterized `NpgsqlBatch` `UPDATE` instead,
letting Postgres validate/store the `jsonb` value server-side with zero .NET-side parsing.

One further optimization makes **re-running** the importer against an already-populated target much
cheaper than a from-scratch import, since that's the expected day-to-day workflow while
building/testing the new site (games are still paged in full via `created_at, id` keyset pagination
on every run — no incremental `updated_at` watermark; see below for why that turned out not to be
worth it):

- **Skip re-fetching `SerializedGame` for games that already have one** — this blob is assumed
  immutable once captured (true for `Finished`/`Cancelled` games in general, and always true for
  the one-off final cutover import, which only runs after the production site has been stopped —
  see §11). `ImportGamesAsync` preloads which game-ids already have a non-null `SerializedGame`
  locally, and only issues a small, targeted `ReadSerializedGamesByIdsAsync` query per batch for the
  ids that are actually new (a brand-new game, or an existing one whose blob is still missing) —
  the wide per-page `Games` read itself no longer selects this column at all.

**Bug fixed 2026-09**: `ImportPlayersInGameAsync` used to look up each row's existing state via a
per-row `FirstOrDefaultAsync` query straight against the database, which cannot see a row this same
loop has already `Add`-ed but not yet flushed in the current batch. The legacy
`agotboardgame_main_playeringame` table turns out to contain duplicate `(game_id, user_id)` rows for
some games, so the second occurrence of a duplicate pair within one batch was inserted again
instead of updated, violating the target's unique index and crashing the whole import partway
through. Fixed by preloading existing `(GameId, UserId) → Id` pairs once and tracking entities
added/attached within the current (not-yet-flushed) batch in memory, so any later duplicate — even
one spanning a batch boundary — is always treated as an update of the same row instead.

### 10.1 Historical backfill of `PreviousPlayerInGame`

Unlike every other table above, this one **cannot** be populated by a straight column copy — the
legacy DB never stored it. It's computed directly by `Snr.Migration` in C#, straight from each
game's `ViewOfGame` JSON — NOT the much larger `SerializedGame` — inline while games are being
imported (§10, step 5/6 above) — not a separate pass over the `Games` table afterwards, since
`ViewOfGame` is already parsed in memory at that point for other purposes.

Before the import loop starts, two things are preloaded once:

- The set of game-ids that already have `PreviousPlayerInGame` rows — this is what makes the step
  idempotent (never overwrites data a genuine live game-server save already wrote) without an extra
  per-game query.
- A `game_id → {user_id}` current-player membership map, read once from the legacy
  `agotboardgame_main_playeringame` table (small rows, no large blobs) — needed because `ViewOfGame`
  itself has no raw list of current player user-ids, only `victoryTrack[].player`, a display
  username string. (`ImportPlayersInGameAsync`, called later in the same run, reads this same
  legacy table again to actually persist `PlayerInGame` rows; the duplicate read is cheap since
  this table carries no large per-row blobs, unlike `Games`.)

For every imported `Game` with `State` in `{Finished, Cancelled}` and a non-null `ViewOfGame` whose
id isn't in the preloaded existing-rows set,
`PreviousPlayersBackfill.Compute(gameId, viewOfGame, currentPlayerUserIds)`:

- Reads `ViewOfGame`'s top-level `oldPlayerIds` and `timeoutPlayerIds` string arrays directly — a
  flat summary object with no `childGameState` nesting (see `EntireGame.getViewOfGame()`); these
  two arrays are mutually exclusive by construction in `IngameGameState.ts`, and have been present
  unconditionally since the feature was introduced, for any game that ever reached the ingame
  state.
- For each user-id found, resolves `Reason` via the shared `PreviousPlayerReasonResolver` (`Vote`
  for `oldPlayerIds`, `ClockTimeout` for `timeoutPlayerIds` — the same resolver `GamesApi.cs`'s live
  PATCH handler uses, see §6.1) and subtracts everyone still present in the preloaded
  `agotboardgame_main_playeringame`-derived membership set: a voted-out player who was later voted
  back in must **not** get a `PreviousPlayerInGame` row.
- Does **not** attempt to resolve which `House` a removed player held, a precise removal
  timestamp, or whether their house ultimately won — see §4.4 for why. `ReplacedAt` is left `null`
  for backfilled rows.

Because this only ever fills in games that currently have zero `PreviousPlayerInGame` rows, it's
always safe to re-run: any real save of the same game by the live game server (which adds/removes
these rows per save via diffing, see §6.1) permanently supersedes whatever this backfill produced,
and this step will simply skip that game on the next run.

**Follow-up not yet built**: once this data exists, show "games where you were removed" on a
user's profile page using their `PreviousPlayerInGame` rows (same way wins/losses are shown today).

### 10.2 Win-rate calculation (new formula)

- **Wins**: `PlayerInGame` rows where `is_winner = true`, for games with `state = FINISHED` (same
  scope Django uses today).
- **Losses**: `PlayerInGame` rows where `is_winner = false` (`FINISHED` games) **plus every**
  `PreviousPlayerInGame` row for `FINISHED` games — counted as a loss unconditionally, per your
  instruction that being removed from a game should never count in your favor even if your former
  house went on to win without you. Since `House`/`WasWinner` aren't tracked at all (§4.4), there's
  no way (and no need) to special-case this either way.
- `CANCELLED`/`IN_LOBBY`/`ONGOING` games contribute to neither wins nor losses, matching today's
  Django behavior of only scoring `FINISHED` games.

## 11. Rollout plan

1. Stand up `agot-bg-website-dotnet` against a separate `snr_dotnet` database/port, Django keeps
   running unmodified against its own DB.
2. Point a staging copy of the game server (`MASTER_API_BASE_URL`) at the new app; run the importer
   against a restored production snapshot; smoke-test login (all 3 OIDC providers + local),
   settings page, creating/joining a game, chat.
3. Verify the "claim an imported account" flow end-to-end for at least one user per provider.
4. Cut over DNS/reverse proxy to the .NET app; re-run the importer one final time immediately
   before cutover to catch any last-minute Django writes.
5. Keep Django + its DB read-only and available for a rollback window before decommissioning.

## 12. Open questions / risks to confirm before implementation

- **Facebook app review** — see §5.2; requires a Meta developer app (privacy policy URL, business
  verification, app review) before it works for real, non-test users — start that process early,
  it can take days/weeks, same caveat that previously applied to the dropped Instagram provider.
- **Static asset hosting** — Django currently serves `static_game`/`static` either via WhiteNoise
  (dev) or S3 (prod, `django-storages`). Decide whether ASP.NET Core continues serving
  `static_game` directly (simplest, mirrors dev behavior) or keeps the S3/CDN split used in
  production today (`ASSET_PATH` env var already supports a CDN prefix — no change needed there
  either way).
- **Hosting/process model** — Django currently runs under `gunicorn` with a `gunicorn_config.py`
  hook for `django_prometheus` multiprocess mode; ASP.NET Core's built-in Kestrel host replaces
  this outright, no multiprocess metrics registry needed.
- **Vanilla Forum integration** — referenced in Django settings/migrations but effectively
  disabled (`VANILLA_FORUM_API_KEY` optional, the actual account-creation call was removed). Decide
  whether to carry the dead integration points forward or drop them in the new codebase.
- **Debug tooling** — `django-debug-toolbar` (superuser-only) has no exact ASP.NET Core
  equivalent; consider `MiniProfiler` for local development only.
- **`PreviousPlayerInGame` scope** — this is a deliberate *improvement* over Django (which never
  tracked player-removal history at all), not a risk from the migration itself. Two scope points
  worth a quick explicit confirmation before implementation: (1) whether the historical backfill
  (§10.1) should walk `CANCELLED` games too (currently: yes, included, but excluded from win-rate
  scope like today) and (2) whether win-rate should stay `FINISHED`-only as assumed in §10.2, or be
  widened now that removal tracking exists.

## 13. Future improvements (out of scope for this migration, noted for later)

These are deliberately **not** part of the Django→.NET migration itself — noted here so they don't
get lost, to be picked up as separate follow-up work once the migration is live:

- **Precomputed statistics tables.** Win rate and average PBEM response time are currently
  calculated on the fly whenever a user profile page is visited (same as Django does today). Now
  that we have a clean EF Core schema, add a `PlayerStatistics` table (one row per user, or per
  user+game-mode) that's updated incrementally whenever a game finishes (in the same transaction
  that sets `Game.State = FINISHED` / writes `PlayerInGame.IsWinner`), rather than recomputed from
  scratch per profile view.
- **Public game statistics.** With a real relational schema (vs. Django's `view_of_game` JSON
  blobs), it becomes easy to add a public stats page/API answering things like "which house wins
  which game mode most often, broken down by settings (PBEM vs. live, Mother of Dragons on/off,
  player count, etc.)". Needs a bit of design work on what "game mode"/"settings" should mean as
  stable, queryable dimensions (today they're free-form JSON inside `ViewOfGame.settings`) — likely
  its own `GameStatistics`/`HouseWinBySettings` summary table(s), populated the same
  incrementally-on-finish way as `PlayerStatistics` above.
- **Extended Admin entity browsing & chat moderation.** The initial Admin area provides User
  search/ban/role-assignment and Game search/raw-JSON-edit. As a follow-up, expand the Admin panel
  to support browsing and editing across all database entities:
  - Chat rooms and messages: browse active/historical rooms, search chat messages, delete/moderate
    inappropriate messages.
  - User details: edit user profile fields (ProfileText, MuteGames, settings flags) directly from
    admin UI.
  - PBEM response times, user room memberships, and previous players in game inspection.
- **UI library / dark Game-of-Thrones theme.** The current Razor Pages UI still uses whatever
  Identity's default scaffolded markup looks like. Recommendation: **Tailwind CSS + DaisyUI**
  rather than Bootstrap or a Material component kit — it's the most-recommended current pick for
  server-rendered Razor Pages (no SPA framework lock-in, works fine with plain `.cshtml`), gives
  full utility-first control over a custom dark palette/typography instead of fighting a
  Bootstrap-flavored default look, and DaisyUI's theming system (CSS custom properties) makes it
  straightforward to build one cohesive "Swords and Ravens" dark/parchment-accented theme instead
  of a generic admin-dashboard look. (Commercial alternative if a fully polished component suite
  is preferred over hand-rolling every component: Telerik UI for ASP.NET Core, which also ships a
  visual theme builder for custom dark themes.)

## 14. Admin area, nav, and auth-flow hardening (implemented)

Follow-up work after first getting the app running locally end-to-end:

- **Email confirmation is now always required** (`options.SignIn.RequireConfirmedAccount = true`
  unconditionally in `Program.cs`, no longer skipped in Development) so local testing exercises the
  same confirm-email gate production has. `Login.cshtml.cs` now gives a specific message for the
  `SignInResult.IsNotAllowed` case (unconfirmed email) instead of a generic "Invalid login attempt"
  — that generic message was the actual root cause of "I logged in but the nav still shows
  Login/Register": the sign-in was silently refused, not a caching/rendering bug.
- **`options.User.RequireUniqueEmail = true`** — two `ApplicationUser`s can no longer share an
  email, which both `Register.cshtml.cs` and `ExternalLogin.cshtml.cs` now rely on.
- **Register with an OAuth-linked email is forbidden**, with a clear message telling the visitor to
  sign in with the linked provider instead (and that they can add a password afterwards from
  `Manage/SetPassword`, already provided by scaffolded Identity UI).
- **External login auto-links by email** instead of erroring/duplicating: `ExternalLogin.cshtml.cs`
  now calls `AccountLinkingService.TryLinkByEmailAsync` before creating a new user; both the
  legacy-import "Linked" outcome and a plain "already claimed" existing account are treated as
  "add this login to that existing user" for this flow specifically (the service's own
  `ConflictAlreadyClaimed` semantics are otherwise unchanged/still tested for the legacy-migration
  use case in `AccountLinkingServiceTests`).
- **Phone number field removed** from `Manage/Index.cshtml` (unused, never collected by Django).
- **Nav rebuilt to match Django's production bar**: All Games / My Games (signed-in only) / Rules /
  About / FAQ (external link) / Admin (Admin role only), replacing the scaffolded Home/Privacy
  links. New pages: `Pages/Games.cshtml` (open + ongoing games), `Pages/MyGames.cshtml`
  (`[Authorize]`, games the current user is a player in), `Pages/Rules.cshtml`, `Pages/About.cshtml`
  (static content mirroring Django's `rules.html`/`about.html`).
- **New `Areas/Admin` Razor Pages area** — the .NET equivalent of Django Admin (ASP.NET Core has no
  built-in one). Gated by an `"AdminArea"` authorization policy (`RequireRole(RoleNames.Admin)`)
  applied via `options.Conventions.AuthorizeAreaFolder("Admin", "/", "AdminArea")`. Provides:
  - `Admin/Users` — search by username/email/id, ban/unban (toggles the `Banned` role and bumps the
    security stamp so it takes effect immediately), and `Admin/Users/Edit` for full role editing.
  - `Admin/Games` — search by name/id, and `Admin/Games/Edit` for viewing/editing the raw
    `SerializedGame`/`ViewOfGame` JSON directly and cancelling a game — the direct equivalent of
    what this maintainer previously had to do by hand-editing the Django database.
  - Note the same caveat that applied in Django: editing `SerializedGame` only sticks if the game
    server doesn't have that game loaded in memory (it will overwrite on its next save).
- **Real SMTP vs. smtp4dev**: smtp4dev (already wired up per §6/§9) is a local catcher — it really
  receives the SMTP transaction so confirmation/reset emails show up in its web UI at
  `http://localhost:5099`, but it never delivers anywhere else by design, so it's normal to not see
  mail in a real inbox while using it. To test genuine end-to-end delivery, point `Email:Host`
  (and `Email:Port`/`Email:Username`/`Email:Password`/`Email:EnableSsl` if your provider needs them)
  at a real SMTP relay via `dotnet user-secrets set Email:Host ...` etc. (never commit real
  credentials — see README.md "Email" section for the exact commands and provider notes).
- **Account deletion ("Took the Black" soft-delete), implemented.** In Django, account deletion was
  never supported because deleting a user broke `PlayerInGame` FK joins/rendering for past games.
  `PlayerInGame`/`PreviousPlayerInGame`/`Message` all reference `AspNetUsers` with
  `ON DELETE RESTRICT`, so a real row delete (or moving the row to a separate `DeletedUsers` table
  and dropping it from `AspNetUsers`) would either be blocked outright or require rewriting every
  historical game/chat FK to a second table. Instead we keep the `AspNetUsers` row and soft-delete
  it in place via `Services/AccountDeletionService.cs`:
  - Adds `ApplicationUser.IsDeleted`/`DeletedAt`, and a `[NotMapped]` `DisplayName` property that
    returns `"Took the Black"` whenever `IsDeleted` is true (and the real `UserName` otherwise).
    Every place a username used to be rendered (`Games`/`MyGames`/`Admin/Games` owner column,
    `Admin/Users` list) now reads `DisplayName` instead of `UserName` directly.
  - On deletion: removes all roles/external logins/claims, disables 2FA, nulls `Email`/
    `NormalizedEmail`/`PasswordHash`/`ProfileText`/`LastWonTournament`, regenerates `GameToken` (a
    `NOT NULL UNIQUE` column, so it can't be nulled), sets `LockoutEnabled`/`LockoutEnd` to
    permanently lock the row out (belt-and-braces, on top of the password already being gone), and
    rotates `SecurityStamp` to invalidate any existing auth cookie immediately.
  - `UserName`/`NormalizedUserName` can't be nulled either — Identity's default `UserValidator`
    rejects a null/empty username regardless of `RequireUniqueEmail`, and still enforces its own
    uniqueness check — so they're replaced with the user's own (already-unique, non-PII) `Id`
    instead. This frees the real email and username up for someone else to register with again,
    while `DisplayName` still shows the same `"Took the Black"` text for every deleted account.
  - Self-service via `Areas/Identity/Pages/Account/Manage/DeletePersonalData.cshtml(.cs)` (now
    calls `AccountDeletionService` instead of the Identity-scaffolded `UserManager.DeleteAsync`),
    and admin-triggered via a new "Delete" button in `Admin/Users/Index`.
  - `Login.cshtml.cs` also picked up a related fix here: it used to call
    `PasswordSignInAsync(Input.Email, ...)`, which only worked because `UserName` used to always
    equal `Email`. Now that users can pick an independent username, it looks the user up by email
    via `UserManager.FindByEmailAsync` first and signs in with the resolved `ApplicationUser`.
  - The public user-profile page below correctly returns 404 for `IsDeleted` users. Nothing else
    needed to change: `PlayerInGame`/`PreviousPlayerInGame` resolve normally since the row (and its
    `Id`) still exists, they'll just join to a `DisplayName` of `"Took the Black"`.

- **Public user-profile page, implemented** (`Pages/User.cshtml(.cs)`, route `/User/{id:guid}`,
  mirroring Django's `agotboardgame_main.views.user_profile` / `user_profile.html`):
  - Returns 404 for a nonexistent or `IsDeleted` user (see above).
  - Shows role badges (same color mapping as Django's `settings.GROUP_COLORS`), joined date, last
    activity (via new `Infrastructure/RelativeTimeFormatter.cs`, a hand-rolled port of Django's
    `naturaltime` filter), ongoing/finished/won/replaced-by-vote-or-timeout counts, win rate, and
    average PBEM response time.
  - Win rate reuses the previously-built (and until now unused) `WinRateCalculator.Calculate`
    unchanged. Games are read from `PlayerInGame.Data` (`{house, is_winner}`, snake_case — matches
    the TS game server's `EntireGame.ts` wire format exactly) and `Game.ViewOfGame`
    (`{turn, maxPlayerCount, waitingFor, winner, settings: {setupId, faceless, pbem}}`,
    camelCase). Faceless games (`settings.faceless == true`) are excluded from the games list
    entirely; `setupId == "learn-the-game"` games are excluded only from the win-rate numerator/
    denominator (Django's `.exclude(data__is_winner__isnull=True)` equivalent), still shown in the
    list. A `PreviousPlayerInGame` row for a `Finished` game always counts as an unconditional loss.
  - Average PBEM response time: new `Services/PbemResponseTimeCalculator.cs`, a pure/testable port
    of Django's exact algorithm — take the most recent 100 `PbemResponseTime.ResponseTime` values,
    and if there are more than 20, sort and drop the 10 fastest/10 slowest before averaging.
  - House icons: copied the 8 simply-named Django `static/house_icons/{house}.png` files into
    `wwwroot/house_icons/` — the .NET game-client's webpack-bundled `static_game/*.png` files have
    content-hashed names, so they aren't usable for a direct by-house-name `<img>` lookup.
  - Owner/username columns in `Games`/`MyGames`/`Admin/Games`/`Admin/Users` now link to the
    profile, and the nav's account dropdown got a "Profile" link alongside the existing "Manage"
    one. Gotcha to remember for future numeric-display work: string interpolation of a `decimal`/
    `double` with a `:F1`-style format specifier uses the server's current culture (so e.g. a
    German-locale host would render `33,3 %` instead of `33.3 %`) — always format via
    `.ToString("F1", CultureInfo.InvariantCulture)` instead for any value shown to users.

- **CoreAdmin comparison tab, implemented.** Added the `CoreAdmin` NuGet package alongside the
  hand-built `Areas/Admin` area (kept, not replaced — see its doc comment/nav entry) purely so the
  maintainer can compare the two side by side. Known CoreAdmin limitation: it cannot edit `jsonb`
  columns (`Game.SerializedGame`/`ViewOfGame`), so the hand-built `Admin/Games/Edit` raw-JSON editor
  remains the only way to edit those. Longer-term idea (not started): reuse the hand-built admin
  panel's UI/permissions model so High Members (not just Admins) can use a subset of it.
- **Permission ↔ role and role ↔ user admin UI, implemented via hand-built pages, not CoreAdmin.**
  CoreAdmin's "foreign key navigation" dropdown feature (see its README) only kicks in for entities
  with an explicit `[ForeignKey]` + CLR navigation property; ASP.NET Core Identity's built-in
  `IdentityRoleClaim<Guid>`/`IdentityUserClaim<Guid>`/`IdentityUserRole<Guid>` have none (just raw
  `RoleId`/`UserId` Guid columns configured through Fluent API), so editing them via CoreAdmin would
  mean hand-typing/copy-pasting a Role or User GUID with no name shown — usable in the most literal
  sense, but error-prone enough (silently grants the wrong user on a typo) that it doesn't meet a
  reasonable bar for a real admin workflow. Added `Areas/Admin/Pages/Roles/Index.cshtml`+`Edit.cshtml`
  (grant/revoke a `GamePermissions` value on a whole role via `RoleManager.AddClaimAsync`/
  `RemoveClaimAsync`) and extended `Areas/Admin/Pages/Users/Edit.cshtml` with a second checkbox list
  for direct per-user permission overrides via `UserManager.AddClaimAsync`/`RemoveClaimAsync` (Django's
  `auth_user_user_permissions` equivalent). Both bump the affected user(s)' security stamp on change,
  same convention as the existing role-assignment code, so the change takes effect on the user's very
  next request instead of waiting for their session's normal cookie revalidation interval.
- **Dead `PhoneNumber`/`PhoneNumberConfirmed` fields, fixed.** These were still visible via
  CoreAdmin and in the "download my private data" JSON export despite the `RemovePhoneNumberField`
  EF migration having already dropped the columns — the migration only removed the *database*
  columns, but `ApplicationUser` still inherited them from `IdentityUser<Guid>` in memory (EF Core's
  reflection-based CoreAdmin scaffolding and the data-export code both read off the CLR type, not
  the DB schema). Fixed by shadowing both with `internal new` no-op properties on `ApplicationUser`.
- **`GameStateColumnRight` rename, implemented.** The user setting that used to be named
  `UseResponsiveLayoutOnMobile` (legacy/unused Django name, never actually wired to a Django
  migration) is now really used for "load the game with the game-state column aligned to the
  right", so the EF Core column/property was renamed via a data-preserving `RenameColumn`
  migration. The public user-settings API still emits/accepts the JSON key
  `use_responsive_layout_on_mobile` (via `[JsonPropertyName]`) so the TypeScript game server needs
  no corresponding change.
- **Enhanced Games/MyGames lists, implemented** (`Services/GameListing/GameListQueryService.cs` +
  `Pages/Shared/_GamesTable.cshtml`, mirroring Django's `views.py`/`views_helpers.py`
  `games()`/`enrich_games()`): round/waiting-for tooltip, live/PBEM badge, house icon +
  your-turn/playing badge, unread public/private message badges (batched into 2 queries total,
  not one per room), replacement-needed badge + admin "Join as ..." action, password-protected
  lock badge, X/Y player count, and four extra lists (games waiting for inactive players /
  without a move for 5 days / inactive tournament games / inactive private games), gated behind
  the same `CanPlayAsAnotherPlayer`/`CanCancelGame` permissions as the existing admin features.
  Every query projects into a DTO that never selects `SerializedGame` (the .NET equivalent of
  Django's `.defer('serialized_game')`, done to avoid the same OOM issue that pattern was
  originally added for). **EF Core gotcha found here**: `OrderBy`/`Take` must be applied to the
  `IQueryable<Game>` *before* the record-projecting `.Select(...)`, not after — ordering after a
  projection containing a nested collection subquery (`Players.Select(...).ToList()`) fails to
  translate against Npgsql, even though it silently "works" against the EF Core InMemory provider
  used by this repo's unit tests. Always spot-check new EF Core projection code against the real
  `snr_dotnet` Postgres dev database, not just the InMemory-provider test suite.
- **Online-presence expiry/reconnect hardening, implemented.** The global website chat client no
  longer inherits Django's assumption that visibility changes regularly disconnect/reconnect each
  tab. Public-room sockets now send a jittered heartbeat, retry unexpected closures with bounded
  exponential backoff, and recreate their presence record after a long suspension. Redis presence
  is stored per connection with an independent TTL rather than as one room-wide read/modify/write
  JSON blob, so simultaneous tabs and reconnect waves cannot overwrite one another; stale pruning
  targets only the expired connection, not every tab belonging to that user. This fixes the
  periodic empty "Online users" snapshot that occurred when quiet-but-live users crossed the old
  one-hour last-chat-activity threshold and were force-reconnected together.
- **Public contact form, implemented** (`Pages/Contact.cshtml(.cs)`, linked from the footer next
  to Privacy). Deliberately anonymous — someone who can't log in (lost password, locked account)
  is exactly who needs to reach the staff — so it reuses registration's bot protection:
  Cloudflare Turnstile (`data-action="contact"`, verified server-side by the existing
  `TurnstileVerifier`) plus the same hidden honeypot field. On top of that, each visitor may send
  at most `Contact:MaxMessagesPerDay` (default 2) messages per UTC day, keyed by user ID when
  logged in and by remote IP otherwise. That quota lives in Redis (`ContactRateLimiter`, one
  `contact:sent:{yyyy-MM-dd}:{key}` counter expiring at the next UTC midnight) rather than in the
  in-process `RegistrationRateLimiter`, because a *daily* quota must survive deploys/container
  restarts and be shared by every instance. `Contact:RecipientAddress` has **no default** — it
  ships blank, which disables the form (with a visible notice) instead of silently dropping mail
  or leaking to a real inbox that doesn't exist (`admin@swordsandravens.net`); an operator must
  opt in by setting it. It also accepts a `;`-separated list (e.g. to loop in interested mods),
  all delivered via a new `IBccEmailSender.SendBccEmailAsync` (implemented alongside the existing
  `IEmailSender` in every sender: `SmtpEmailSender`, `ApiEmailSender`, `SesApiEmailSender`,
  `LoggingEmailSender`) so every recipient lands in Bcc and never sees each other's address. Raw
  SMTP sends true Bcc-only with an empty To; the two HTTP-API senders (Resend, SES) require a
  non-empty To, so they reuse the site's own no-reply address (`EmailAddressHelper.
  ExtractBareAddress` on `Email:FromAddress`) as a placeholder To with the real recipients in Bcc.
  A logged-in visitor's name/email are shown read-only in the form and are **never trusted from
  the posted values** — `ContactModel` always overwrites `Input.Name`/`Input.Email` from the real
  account (via `UserManager.GetUserAsync`) before validating or sending, so a tampered
  devtools-edited field can't be used to impersonate another user in the "From" line; only
  anonymous visitors' typed name/email are used as-is. Wired end to end for production via
  `Contact__RecipientAddress`/`Contact__MaxMessagesPerDay` in `docker-compose.prod.yml` (with
  `CONTACT_RECIPIENT_ADDRESS`/`CONTACT_MAX_MESSAGES_PER_DAY` documented in `.env.prod.example`,
  both blank/unset by default).
- **"Replacer games" stat, implemented.** Rewards players who jump into an existing house via a
  player-replacement vote to help finish a stalled game: a resulting loss no longer counts against
  their win rate at all (excluded from both numerator and denominator), while a win still counts
  normally — see `Services/WinRateCalculator.cs`'s `IsReplacer` fact. Deliberately **not** a new
  `PlayerInGame` column: whether a user was a replacer for a given game is derived at read time
  from that game's already-stored `ViewOfGame.replacerIds` (`ViewOfGameInfo.ReplacerIds`,
  `Services/GameListing/ViewOfGameInfo.cs`), the same pattern already used for `IsWinner`/
  `IsFaceless`/`IsLearnTheGame`. `replacerIds` has been present in `ViewOfGame` since the same
  game-server commit that added `oldPlayerIds`/`timeoutPlayerIds` (which `PreviousPlayersBackfill`/
  `PreviousPlayerReasonResolver` already rely on being reliably populated for any historical game -
  see §10.1), so **no separate historical backfill was needed**: the existing "Recalculate stats"
  actions (single-user and bulk, `Areas/Admin/Pages/Users/Index.cshtml.cs`) already re-derive
  everything from `PlayerInGame.Data`/`Game.ViewOfGame` on every call, so re-running them after
  deploy is enough to populate `ApplicationUser.CachedReplacerGamesCount` for already-played games.
  Surfaced as a "Replacer games" stat + "Replacer" badge on the game rows on the profile page
  (`Pages/User.cshtml(.cs)`) and as a sortable column on the Users directory (`Pages/Users.cshtml
  (.cs)`), positioned after Win rate/Removed like the other cached stat columns. To keep the win
  rate auditable from the profile page alone (the "Won games"/"Replacer games" numbers alone leave
  a reconciliation gap), the profile sidebar also breaks "Replacer games" down into "Replacer wins"
  (`ApplicationUser.CachedReplacerWinsCount`) and "Replacer losses (excluded)"
  (`CachedReplacerLossesExcludedCount`), computed in `UserStatsService.RecalculateAsync` directly
  from the same win-rate-qualifying `winRateFacts` used for the win rate itself (so these two
  numbers reconcile exactly with the displayed win rate — note this scope is narrower than the
  plain "Replacer games" count, which includes non-finished/tutorial replacer games too, so the two
  don't simply subtract). All three cached counters were added in a single EF migration
  (`AddCachedReplacerGameStats`) since neither of these fields had shipped to any environment yet.
  A replacer can themselves later be removed again (voted out/timed out a second time) before the
  game ends — `replacerIds` only ever grows (`IngameGameState.ts`'s replace-player vote pushes to
  it once and never removes), so it still names the user even after their own
  `PreviousPlayerInGame` row is created. Without an explicit check this would otherwise defeat the
  "no downside risk" promise entirely (a `PreviousPlayerInGame` row counts as an unconditional loss
  per §10.2). `UserStatsService.RecalculateAsync` now excludes such a removal from
  `CachedRemovedFromGameCount`/the win-rate loss the same way a still-seated replacer's loss is
  excluded, while still surfacing it (badged "Replacer") on the profile's "Previously participated
  games" list for transparency — removal from stats and visibility in that history list are
  deliberately decoupled, same as the existing Cancelled-game handling there.
- **`initialPlayerIds` refinement, implemented.** Closes a further gap in the "Replacer games"
  exemption: a user who was one of a game's *original* players, got replaced, and later separately
  jumped back in as a replacer for a *different* house of the same game must not get the "pure
  replacer" exemption for their own removal(s) or losses in that game — having started the game
  themselves, a later removal is a real loss, not just "helping finish someone else's game".
  - **Game server**: `IngameGameState.initialPlayerIds: string[]` (new field, mirrors
    `oldPlayerIds`/`replacerIds`/`timeoutPlayerIds`'s serialize/deserialize pattern exactly) is
    populated once in `beginGame()` from `futurePlayers` (the same seated-user map that also drives
    the existing, once-only `"user-house-assignments"` game-log entry) and never modified
    afterwards. `EntireGame.getViewOfGame()` exposes it the same way as `replacerIds`; `PublicApi.
    cs`'s `FieldsToStrip` redacts it from the anonymous public game endpoint alongside the other
    internal id lists. Historical *Ongoing* games self-heal for free: `serializedGameMigrations.ts`
    version "137" derives `initialPlayerIds` for any older game from its
    `gameLogManager.logs`' one-time `"user-house-assignments"` entry the next time that game is
    loaded, so it gets persisted the next time the game server saves it through normal play — no
    special-casing needed beyond the standard migration mechanism already used for `oldPlayerIds`/
    `replacerIds` (see §10.1's version-86 precedent).
  - **Website**: `ViewOfGameInfo.InitialPlayerIds` (parsed the same way as `ReplacerIds`) plus a new
    `ViewOfGameInfo.IsPureReplacer(userId)` helper (`replacerIds.Contains(userId) &&
    !initialPlayerIds.Contains(userId)`) replaces every previous raw `ReplacerIds.Contains(userId)`
    check that gated a win-rate/removal exemption in `UserStatsService.cs` (the "Replacer" *badges*
    on the Games/Previously-participated-games tables deliberately keep using the raw
    `ReplacerIds.Contains` check instead — those are purely informational "did this user ever
    replace in this game" markers, not tied to the stricter exemption rule).
  - **Historical Finished/Cancelled games**: unlike Ongoing games, a dormant Finished/Cancelled
    game nobody ever reloads never gets the game-server migration's self-heal to actually persist
    (nothing triggers a fresh save). `Snr.Migration`'s new `backfill-initial-players` verb
    (`InitialPlayersBackfill.cs`) is a *separate*, explicitly-invoked one-time tool for exactly this
    gap: unlike every other backfill here, it does have to parse each candidate game's
    (potentially multi-MB) `SerializedGame` — `ViewOfGame` itself carries no game-log data at all —
    scanning for the same one-time `"user-house-assignments"` log entry the game-server migration
    uses. Safe to re-run (skips games whose `ViewOfGame` already has `initialPlayerIds`). Run
    "Recalculate stats" (single/bulk, `Areas/Admin/Pages/Users/Index.cshtml.cs`) afterwards so
    cached `ApplicationUser` fields pick up the corrected `IsPureReplacer` computation for affected
    users.
  - `Snr.Migration`'s CLI was also switched from a hand-rolled `args[0]`/`GetOption` argument
    parser to the `CommandLineParser` NuGet package (`[Verb]`/`[Option]` records in `Program.cs`),
    so that adding this (and any future) one-time migration/backfill verb only means adding one
    more options record and one more `MapResult` arm.
- **Profile and presence badges completed**: the tournament-winner trophy is shown on public
  profiles and in the online-users list; its profile tooltip opens below the icon so the sticky
  navigation cannot cover it. Logout/login now evict the five-minute cached online-user details,
  so an admin-updated tournament badge is refreshed on the next presence connection. Users also
  have an optional CoreAdmin-managed `CustomUserBadge`, rendered as a neutral badge immediately
  after the trophy on their profile only. The obsolete `VanillaForumUserId` field and database
  column were removed because the retired forum will not be revived in place.
- **Games/users list fixes**: the shared games table's "Host" column (and the settings popup's
  owner data) shows "-" for faceless games via `GameListItem.PublicOwnerDisplayName`; the cancel
  confirmation names the game. `/Users` has a live, sortable "Ongoing games" column (non-faceless
  Ongoing games only; sorted in memory for users with ≥1 game, SQL-paged for the rest). `/Users`
  and `/Admin/Users` now *redirect* when restoring their saved page/sort cookie, so the restored
  sort is in the querystring and survives the pager's prev/next links.

## 15. Roadmap / follow-ups (as of 2026-09-16)

Kept up to date here so a fresh session can answer "what's next" immediately without having to
re-derive it. Update this section whenever priorities shift or an item is completed.

### Before go-live (blocking rollout, see §11/§12)
1. **Facebook OIDC** — needs a Meta developer app + app review (privacy policy URL, business
   verification) before it works for real (non-test) users; start the review process early, it can
   take days/weeks. Note Meta's Facebook Login product rejects `http://localhost` redirect URIs
   (unlike Google/Discord), so this provider can't be smoke-tested locally at all — first real test
   must happen against a deployed HTTPS environment (staging).
2. **Full data-migration dry run** — restore a production DB snapshot, run `Snr.Migration` against
   it, and smoke-test end-to-end: login via all 3 OIDC providers + local, the account-claiming
   flow, chat, and game create/join — not just spot-checked tables.
3. **Static asset hosting — decided and implemented**: DigitalOcean Spaces (not Kestrel-served
   `static_game`), matching Django's production setup. Wired into `.github/workflows/deploy.yml`
   (see §16 Phase 2) — the game client build sets webpack's `ASSET_PATH` to the Spaces CDN URL,
   and CI uploads the built assets there directly.
4. **Two small open questions from §12** — should `PreviousPlayerInGame` backfill include
   `CANCELLED` games, and should win-rate stay `FINISHED`-only now that removal tracking exists.
5. **GitHub Actions CI/CD — implemented** (`.github/workflows/deploy.yml`, see §16 Phase 2),
   triggered automatically on every `push` to `master` (plus a manual `workflow_dispatch` for
   re-running a deploy without an empty commit) — merging the migration branch into `master` is
   what performs the production cutover from the old Dokku deployment.

### Deferred / nice-to-have (see §13), suggested rough order
1. **Precomputed `PlayerStatistics` table** — win-rate/PBEM response time are recomputed on every
   profile view today; update incrementally when a game finishes instead.
2. **Public game statistics page** — house win-rates by game mode/settings, now that data is
   relational instead of Django's free-form `ViewOfGame.settings` JSON.
3. **Extended Admin: chat moderation** — browse/search/delete chat messages, edit user profile
   fields (`ProfileText`, `MuteGames`, settings flags) directly from the admin UI.
4. **CoreAdmin → hand-built admin reuse for High Members** — expose a subset of the hand-built
   `Areas/Admin` UI/permissions to High Members (not just Admins), once it's more battle-tested.
5. **UI theme pass** — Tailwind/DaisyUI dark "Swords and Ravens" theme instead of today's default
   Identity-scaffold look, once functionality is stable.

### Already done, no longer on the list
Pagination for Admin Users/Games/Rooms/Messages; CoreAdmin comparison tab; dead phone-number field
cleanup; `GameStateColumnRight` rename; enhanced Games/MyGames lists with badges + inactive-game
lists (all documented under §14 above); private game-server API split onto its own internal-only
Kestrel endpoint, not just Basic Auth (see §6.2); production docker-compose + Caddy TLS setup for
the DO Docker droplet (see §16); game-save hardening against a live game silently reverting to a
stale/paused snapshot after an out-of-order or dropped save — `Game.SaveSequence` column +
`GamesApi` PATCH rejecting any save whose sequence isn't strictly greater than what's stored
(`GamesApi.cs`), the TS game server flushing/awaiting pending throttled saves on `SIGTERM`/`SIGINT`
(`GlobalServer.shutdown()`, `server.ts`), bypassing the save throttle for `FINISHED`/`CANCELLED`
transitions (`EntireGame.saveGame`), and skipping the `PlayerInGame`/`PreviousPlayerInGame`
delete+recreate on saves where the player list didn't change (`GamesApi.PlayersUnchanged`);
heartbeat-backed, per-connection online presence with automatic WebSocket reconnect.

## 16. Production deployment: plain Docker + Compose, no Dokku/Kubernetes (implemented)

The old Django/TS stack deploys via Dokku (`deploy.sh`, `.github/workflows/deploy.yml`), which
gives git-push deploy + its own reverse proxy/Let's Encrypt for free. The new DigitalOcean droplet
is a plain "1-Click Docker" image (Docker + docker-compose only, no PaaS layer), so this had to be
hand-built — nothing about it requires Dokku, since §6.2's private/public Kestrel port split was
already designed against vanilla Compose networking from the start.

**New files (repo root, sit next to the existing local-dev-only `docker-compose.yml`):**
- **`docker-compose.prod.yml`** — `website` (this app), `game-server` (the TS game server,
  `game_server.Dockerfile`), `db` (**`postgres:18`** — the current stable major; not 17), `redis`
  (**`redis:8`** — current stable major), and `caddy` (reverse proxy/TLS). Only `caddy` publishes
  ports (`80`/`443`) to the host — `website`, `game-server`, `db`, and `redis` are reachable only
  from sibling containers on Compose's default network via service-name DNS, matching §6.2's
  design (`GameServerApi`/8001 is never published, same as local dev's Pitfall #3 warns not to
  carry over). **`website`/`game-server` reference `image:` tags (GHCR), not `build:` contexts** —
  mirroring the old Dokku-era `.github/workflows/deploy.yml`'s build-in-CI approach, so the
  droplet itself never builds anything and doesn't need a full repo clone (only this file,
  `Caddyfile`, and `.env.prod`).
- **`Caddyfile`** — a single reverse-proxy site block per domain; Caddy auto-obtains/renews the
  Let's Encrypt certificate on first request, no certbot/nginx config needed. Proxied
  `winordie.net` (the pre-cutover test domain — see `appsettings.Staging.json`'s
  `PublicSiteUrl`/`AllowedHosts`) up to go-live; switched to `swordsandravens.net` at cutover (§18)
  — see `appsettings.Production.json` for the matching `PublicSiteUrl`/`AllowedHosts`.
- **`.env.prod.example`** — template for the real secrets `docker-compose.prod.yml` interpolates
  (`DB_PASSWORD`, `MASTER_API_USERNAME/PASSWORD`, OAuth client secrets, SMTP credentials) plus
  `WEBSITE_IMAGE`/`GAME_SERVER_IMAGE` (which GHCR tag to deploy — defaults to `:latest`; the CI/CD
  pipeline will instead pin a specific commit SHA per deploy, same as the old workflow's
  `${{ github.sha }}` tags). Copy to `.env.prod` on the droplet and fill in real values —
  `.env.prod` is gitignored, never commit it.
- **root `.dockerignore`** — extended to exclude `agot-bg-game-server/node_modules` and the .NET
  solution's `bin`/`obj`/`.vs` directories from the build context (both Dockerfiles now build with
  repo-root or `agot-bg-website-dotnet/`-root context).
- **`Program.cs`: `Database.MigrateAsync()` on startup** — pending EF Core migrations are now
  applied automatically every time the app starts (in every environment, including local Docker
  debug), instead of requiring a separate manual `dotnet ef database update` step after each
  deploy. Idempotent (EF Core's `__EFMigrationsHistory` table makes re-running a no-op once the
  schema is current) and safe against a cold-starting `db` container because
  `docker-compose.prod.yml`'s `db` service has a healthcheck and `website` depends on it with
  `condition: service_healthy`.

**Phased first deploy on the droplet** (decided to stand up infra first, then build the CI/CD
pipeline — including Spaces-backed static assets, §15 roadmap items 3/5 — before ever running the
app containers; and to build images only in CI, never on the droplet, mirroring the old
`deploy.yml`):

**Phase 1 — infra only (`db`, `redis`, `caddy`), no app containers yet:**
```bash
ufw allow 80,443/tcp   # only 22/2375/2376 are open by default on the 1-Click Docker image;
                       # a DigitalOcean Cloud Firewall (if configured on the droplet's Networking
                       # page) is a *separate*, additional layer — both it and UFW must allow
                       # 80/443, since traffic has to pass both to reach the containers
                       # (also: close 2375/2376 unless you actually use the remote Docker API —
                       # unauthenticated 2375 is a known instant-root-compromise vector)
mkdir -p /opt/swords-and-ravens && cd /opt/swords-and-ravens
# Only these 3 files are needed on the droplet — website/game-server images come from GHCR, not a
# local build, so there's no need to clone the full source repo here at all:
#   docker-compose.prod.yml, Caddyfile, .env.prod.example (copy from wherever is easiest, e.g.
#   `git clone --depth 1` into a scratch dir and copy the 3 files out, or scp them directly)
cp .env.prod.example .env.prod   # fill in real secrets — DB_PASSWORD/MASTER_API_PASSWORD can be
                                 # generated fresh, e.g. `openssl rand -base64 32 | tr -d '/+='`;
                                 # Postgres uses whatever's in DB_PASSWORD as its real password
                                 # only on first-ever init of the empty `pgdata` volume
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d db redis caddy
docker compose -f docker-compose.prod.yml ps
```
`caddy` starts fine even though its `reverse_proxy website:8000` upstream isn't running yet —
Caddy resolves upstreams per-request, not at startup, so it'll just 502 until `website` exists.
That's expected during this phase.

**Phase 2 — CI/CD pipeline (implemented in `.github/workflows/deploy.yml`)**: builds the game
client (webpack `ASSET_PATH` pointed at the Spaces CDN URL), uploads its output (minus
`index.html`) to the Spaces bucket, copies `index.html` into
`agot-bg-website-dotnet/agot-bg-website/GameClientTemplates/play.html` before building the
`website` image (so the image never needs the actual JS/CSS bundles — `PlayApi.cs`'s served HTML
already points at the CDN), builds+pushes both `website` and `game-server` images to GHCR tagged
by commit SHA (not `:latest`, unlike the local dev defaults in `.env.prod.example`), then SSHes
into the droplet and runs `docker compose -f docker-compose.prod.yml --env-file .env.prod pull
website game-server && ... up -d website game-server` — `db`/`redis`/`caddy` are never touched by
a deploy. No `--build` step ever runs on the droplet.

Triggered automatically on every `push` to `master` (i.e. every merge), plus a manual
`workflow_dispatch` for re-running a deploy without needing an empty commit — merging the
migration branch into `master` is what cuts production over from the old Dokku deployment.
Required GitHub repo secrets: `CI_DEPLOY_SSH_KEY` (droplet SSH key, same as the old
workflow), `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_S3_ENDPOINT_URL`/
`AWS_STORAGE_BUCKET_NAME` (Spaces credentials, same names as the old workflow so they can be
reused as-is). The droplet itself needs a one-time `docker login ghcr.io` (PAT with
`read:packages`) so `docker compose pull` can authenticate against GHCR — this isn't automated by
the workflow since it only needs doing once, not per-deploy.

`GlobalServer.ts`'s `MASTER_API_BASE_URL` default (`http://localhost:8001/api`) would **not** work
across Compose's separate containers — `docker-compose.prod.yml`'s `game-server` service already
overrides it explicitly to `http://website:8001/api` (Compose's service-name DNS), so no code
change was needed there; the default only applies to genuinely standalone local dev.

No separate DB migration step needed once `website` does start — it applies pending EF Core
migrations itself on startup (see above). Point the domain's DNS A record at the droplet's IP;
Caddy requests the TLS cert automatically on first HTTPS request once `website` is reachable.

## 17. Operating the droplet — quick reference (deploy + re-running `Snr.Migration`)

Written down so this doesn't need re-discovering every time. Nothing here is secret by itself
(no passwords are inlined) — actual secrets always stay in `.env.prod`/user-secrets and are piped
in at run time, never typed into a command line or logged.

### 17.1 Connecting

```powershell
ssh -i "$env:USERPROFILE\.ssh\snr-deploy" root@165.245.221.184
```
Compose stack lives at `/opt/swords-and-ravens/` on the droplet (`docker-compose.prod.yml`,
`Caddyfile`, `.env.prod`). Container names follow the `swords-and-ravens-<service>-1` pattern
(`-website-1`, `-game-server-1`, `-db-1`, `-redis-1`, `-caddy-1`); all are on the same default
Compose network (`swords-and-ravens_default`), reachable from each other by service name.

### 17.2 Redeploying `website`/`game-server` (normal code change rollout)

From the repo root, on this machine, once changes are pushed to the working branch:
```powershell
gh workflow run deploy.yml --ref migrate-website-to-dotnet
```
This builds+pushes both images to GHCR (tagged by commit SHA) then SSHes into the droplet itself
and runs `docker compose ... pull website game-server && ... up -d website game-server` — `db`,
`redis`, and `caddy` are left untouched. No manual SSH/compose step is needed for a normal deploy;
watch the run with `gh run watch` or `gh run list --workflow=deploy.yml`.

### 17.3 Running `Snr.Migration` against the droplet's production Postgres

`Snr.Migration` isn't part of the deployed images (it's a one-off operator tool), so it has to be
built self-contained and copied over manually:

```powershell
# 1. Publish a self-contained linux-x64 build (from agot-bg-website-dotnet/):
dotnet publish Snr.Migration -c Release -r linux-x64 --self-contained true -o publish\snr-migration-linux

# 2. Copy it to the droplet:
scp -i "$env:USERPROFILE\.ssh\snr-deploy" -r publish\snr-migration-linux root@165.245.221.184:/opt/swords-and-ravens/snr-migration

# 3. SSH in, then run it attached to the compose network so `db` resolves by service name.
#    Target connection string (production Postgres, reachable as `db` on the compose network):
#      Host=db;Port=5432;Database=snr_dotnet;Username=postgres;Password=<DB_PASSWORD from .env.prod>
#    Legacy (Django) connection string is NOT on the droplet — read it from this machine's
#    Snr.Migration user-secrets (id 3bd17916-4f1d-470e-a8e2-d3962d7aecc2) before SSHing in, or
#    keep it in a local password manager; never paste it into shell history on the droplet.
ssh -i "$env:USERPROFILE\.ssh\snr-deploy" root@165.245.221.184
cd /opt/swords-and-ravens
grep DB_PASSWORD .env.prod   # only reveals the *new* DB's password, not the legacy one
docker run -d --network swords-and-ravens_default \
  --name snr-migration-import \
  -v /opt/swords-and-ravens/snr-migration:/app \
  -w /app mcr.microsoft.com/dotnet/runtime-deps:10.0 \
  ./Snr.Migration import \
  --legacy "Host=<legacy host>;Port=<legacy port>;Database=agot_bg_database;Username=<legacy user>;Password=<legacy password>" \
  --target "Host=db;Port=5432;Database=snr_dotnet;Username=postgres;Password=<new DB password>"
# Then, from any shell (this doesn't need to be the one that started it - it's detached):
docker logs -f snr-migration-import
```
**Always run the import container detached (`-d`, not `--rm -it`)**: a full run takes long enough
(the ~2M-row chat-message table alone) that running it attached exposes it to any local network
hiccup or local terminal/SSH client crash for its entire duration. This bit us once already — a
local PowerShell/SSH client process crashed mid-run (exit code 139/SIGSEGV) partway through the
messages step, which dropped the SSH session and sent SIGHUP to the still-attached `docker run`,
killing it before it ever reached the games step (`RunAsync`'s order is `users → rooms → messages
→ chat memberships → games → players-in-game → PBEM times` — a mid-run kill during the slow
messages step means everything after it, including all games, silently never ran, even though
rooms/messages had already imported correctly up to that point). Running detached means the
import keeps going on the droplet regardless of what happens to the local shell; just reconnect
and `docker logs -f snr-migration-import` (or `docker logs --tail 200 snr-migration-import` for a
quick status check without following) to see progress, and `docker rm snr-migration-import` once
it's done so the name is free for the next run.

The importer is idempotent (existing rows are matched by preserved/natural id and skipped or
updated, never duplicated) — safe to re-run after every legacy data change, or after a fresh
`website` DB reset, with no extra flags needed. A full run against the real production data
(10k users, 86k rooms, ~2.08M chat messages, 23k games, 1.2M PBEM response times) takes on the
order of 10-15 minutes end to end, dominated by the chat-message table; a repeat/idempotent run
over already-imported data takes about as long again since every row is still read and compared
even when nothing changes.

**Gotcha after a fresh DB reset**: `website`'s `RoomSeeder` only auto-creates the "public"/"issues"
rooms in the Development environment (local dev). On Staging/Production it never creates them —
if `website` starts against an empty database (the normal case right after a reset, before
`Snr.Migration` has run), it just leaves `RoomSeeder.PublicRoomId`/`IssuesRoomId` unset (any code
that touches chat before then throws a clear "run the import" error) — **always
`docker compose restart website` after running `Snr.Migration` against a freshly-reset database**
so it picks up the two rooms the import just inserted (their ids are cached once at startup).

### 17.4 Dropping/recreating the `snr_dotnet` database (local or droplet)

Only do this when a schema change requires a full clean re-import (e.g. a changed primary key
type) — `website` must be stopped first since `DROP DATABASE` fails while it holds connections:
```bash
# stop the app so it releases its DB connections (only needed on the droplet; `docker compose stop website`)
docker compose -f docker-compose.prod.yml --env-file .env.prod stop website
docker exec -i swords-and-ravens-db-1 psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'snr_dotnet' AND pid <> pg_backend_pid();"
docker exec -i swords-and-ravens-db-1 psql -U postgres -c "DROP DATABASE snr_dotnet;"
docker exec -i swords-and-ravens-db-1 psql -U postgres -c "CREATE DATABASE snr_dotnet;"
```
Then deploy/start `website` again (§17.2, or `docker compose ... up -d website` locally) — its
`Database.MigrateAsync()` startup hook recreates the schema from the current migration, after
which §17.3's `Snr.Migration import` can be re-run for a fresh full import.

### 17.5 Lessons from the first full production-data dry run

Two real issues surfaced doing a full end-to-end dry run (drop DB → redeploy `website` → stop it
→ copy `Snr.Migration` → import) against the actual production data, worth remembering before the
final cutover:

- **`scp -r local\snr-migration-linux ... remote:/opt/swords-and-ravens/snr-migration` silently
  nests the build one directory deeper if the remote `snr-migration` directory already exists**
  from a previous run (`scp` copies the *source directory itself* into the destination directory
  rather than replacing its contents). The container then happily starts and runs whatever stale
  binary is still sitting at the old top-level path instead of the freshly published one, with no
  error — the only symptom was a stale log message (`"N seeded duplicates merged"`) that no longer
  exists in the current code. **Always `rm -rf /opt/swords-and-ravens/snr-migration` on the
  droplet before every `scp`** (or `scp` to a fresh/uniquely-named directory) so this can't happen
  silently again, and spot-check `docker logs` output against what the current `Importer.cs`
  actually prints if anything looks even slightly off.
- **`ImportUsersInRoomAsync` could crash with an EF Core identity-conflict exception**
  (`InvalidOperationException: The instance of entity type 'UserInRoom' cannot be tracked...`)
  partway through a full production run. Root cause: the legacy `chat_room_membership` table is
  not actually unique on `(user_id, room_id)` — a handful of rows repeat the same pair. The
  importer used to `Attach()` a fresh stub entity for every "this pair already exists" row, which
  works fine the first time but throws the moment the *same* pair is seen again before the next
  `SaveChanges`/`ChangeTracker.Clear()` batch flush, since two different object instances can't be
  tracked under the same key at once. Fixed by tracking a small `Dictionary<(UserId, RoomId),
  UserInRoom>` of entities added/attached since the last flush and updating the *same* instance in
  place for a same-batch repeat instead of attaching a second one (see `Importer.cs`,
  `ImportUsersInRoomAsync`); logged as a new "duplicate rows merged" count in that step's summary
  line. This was invisible on every prior smaller/synthetic test run and only showed up against
  the full real legacy dataset.

A second full run after the fix completed cleanly end to end (idempotent re-run over the
partially-imported data from the crashed first attempt — see the row-count/spot-check summary
`Snr.Migration` prints at the end). Final row counts: 10,058 users, 86,290 rooms, 2,078,595 chat
messages, 14,108 games (23,259 legacy rows minus 9,151 intentionally-skipped cancelled-lobby
games — expected, not a bug), 65,828 players-in-game, 1,216,881 PBEM response times.

**A post-import `pg_dump` backup of this dry-run database was taken** so a repeat of this exact
dry run (e.g. re-verifying before the real cutover) can restore instead of re-running the full
~10-15 minute import again:
```bash
# Taken on the droplet after the dry run, custom format (-Fc) so it can be restored with pg_restore:
docker exec swords-and-ravens-db-1 pg_dump -U postgres -Fc -d snr_dotnet -f /tmp/snr_dotnet_post_import.dump
docker cp swords-and-ravens-db-1:/tmp/snr_dotnet_post_import.dump /opt/swords-and-ravens/backups/snr_dotnet_post_import_2026-09-05.dump
docker exec swords-and-ravens-db-1 rm /tmp/snr_dotnet_post_import.dump
```
Lives at `/opt/swords-and-ravens/backups/snr_dotnet_post_import_2026-09-05.dump` on the droplet
(~420 MB). To restore it (e.g. after another §17.4 drop/recreate cycle, to get back to this exact
dry-run state without re-running the importer):
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod stop website
docker exec swords-and-ravens-db-1 psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'snr_dotnet' AND pid <> pg_backend_pid();"
docker exec swords-and-ravens-db-1 psql -U postgres -c "DROP DATABASE snr_dotnet;"
docker exec swords-and-ravens-db-1 psql -U postgres -c "CREATE DATABASE snr_dotnet;"
docker cp /opt/swords-and-ravens/backups/snr_dotnet_post_import_2026-09-05.dump swords-and-ravens-db-1:/tmp/restore.dump
docker exec swords-and-ravens-db-1 pg_restore -U postgres -d snr_dotnet /tmp/restore.dump
docker exec swords-and-ravens-db-1 rm /tmp/restore.dump
# then start website again (§17.2 deploy, or docker compose ... up -d website)
```
The fixed `Snr.Migration` build is deliberately left in place at
`/opt/swords-and-ravens/snr-migration` on the droplet (not cleaned up) — it's the same binary the
real cutover import will use, so there's no need to republish/re-copy it again unless
`Importer.cs` changes before then.

## 18. Final cutover: winordie.net (staging) → swordsandravens.net (production)

Code/config side of the cutover (this commit): a new **`appsettings.Production.json`** was added
(mirroring `appsettings.Staging.json`'s structure) with `PublicSiteUrl`/`AllowedHosts` set to
`swordsandravens.net`/`swordsandravens.net;website`; `appsettings.Staging.json` itself is left
untouched (still `winordie.net`) so that dogfooding environment stays available if ever needed
again. `docker-compose.prod.yml`'s `ASPNETCORE_ENVIRONMENT` now defaults to `Production` (was
hardcoded `Staging`), overridable back to `Staging` via `.env.prod` if needed. `Caddyfile`'s site
blocks switched from `winordie.net`/`play.winordie.net` to `swordsandravens.net`/
`play.swordsandravens.net` — Caddy only ever proxies one live domain at a time here, so there's no
separate "production Caddyfile"; the old `winordie.net` blocks would need restoring by hand if that
environment is ever spun up again with its own Caddy in front. The `no-reply@winordie.net` fallback
addresses in `SmtpEmailSender.cs`/`SesApiEmailSender.cs`/`ApiEmailSender.cs`/`appsettings.json`
updated to `swordsandravens.net` (cosmetic fallback only — `.env.prod`'s real `EMAIL_FROM_ADDRESS`
already points at `swordsandravens.net` and is unchanged, since the current email setup already
sends from that domain).

**OAuth callback path (updated post-cutover):** Django's `social_django.urls` used
python-social-auth's fixed `/complete/<backend>/` scheme (`google-oauth2`/`discord`), so at cutover
`Program.cs`'s `AddGoogle`/`AddDiscord` temporarily set `options.CallbackPath` explicitly to those
legacy paths (`/complete/google-oauth2/`, `/complete/discord/`) to reuse the existing Google Cloud
Console / Discord Developer Portal app registrations unchanged. That was later found to conflict
with the global trailing-slash-to-canonical-URL redirect in `Program.cs` (added for legacy Django
bookmarks like `/games/`), which stripped the callback path's load-bearing trailing slash and broke
login with a 404. Rather than special-case the redirect further, `/signin-google` and
`/signin-discord` (this library's own `CallbackPath` defaults) were added as additional authorized
redirect URIs in both providers' dashboards, and `Program.cs` now omits `CallbackPath` entirely,
using those defaults. The legacy `/complete/...` redirect URIs can be removed from both dashboards
once this has been confirmed stable in production.

**`Snr.Migration` now self-provisions the target schema:** `Importer.MigrateTargetAsync()` (called
from `Program.cs` before `import`/`verify`) runs `Database.MigrateAsync()` against `--target`
before anything else — a fresh/dropped `snr_dotnet` no longer needs `website` started first just
to create its schema (previously required per §17.4's "then deploy/start `website` again"
comment); `Snr.Migration import` alone is now enough against a brand-new empty database.

**Remaining operational steps (not run automatically by this commit — irreversible/production
affecting, run manually in this order when ready):**
1. Stop the legacy Django/Dokku site (`swordsandravens.net`) so it stops accepting new
   writes/games before the final import snapshot is taken.
2. On the droplet: stop `website` (`docker compose -f docker-compose.prod.yml --env-file .env.prod
   stop website`) and drop+recreate `snr_dotnet` per §17.4 to clear out the Sep-5 dry-run data
   (or restore/keep the §17.5 post-import dry-run dump if a full re-import isn't wanted — decide
   based on how stale that dry-run data is relative to legacy by then).
3. Deploy this commit (`gh workflow run deploy.yml --ref migrate-website-to-dotnet`, §17.2) —
   `website` starts under `ASPNETCORE_ENVIRONMENT=Production` (now the compose default), applies
   migrations, comes up against the empty DB; `RoomSeeder`'s Development-only rooms are skipped as
   expected on Production, same as they were on Staging (§17.3's "Gotcha" note).
4. Run `Snr.Migration import` (§17.3) for the final production data import — no longer needs a
   preceding `website` start since it self-migrates now.
5. `docker compose ... restart website` (picks up the "public"/"issues" room ids the import just
   inserted — same gotcha as §17.3).
6. Copy `.env.prod.example` → `.env.prod` on the droplet (if not already) and fill in the *existing*
   Discord/Google app Client ID/Secret (Facebook left blank/unused unless also migrated) — the
   callback-path fix above means no dashboard changes are needed for those two.
7. Once smoke-tested end to end (login via all 3 configured methods + local, one game
   created/joined, chat, an email), repoint `swordsandravens.net`'s DNS A record at the droplet's
   IP — Caddy requests its Let's Encrypt cert automatically on first HTTPS request once traffic
   arrives.
8. ~~Switch `deploy.yml`'s trigger from `workflow_dispatch` to `push: branches: [master]`~~ — done;
   `deploy.yml` now triggers on every push to `master` (`workflow_dispatch` kept as a manual
   fallback), so merging PR #31 into `master` will trigger the production deploy automatically.
