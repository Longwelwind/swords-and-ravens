using System.Security.Claims;
using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Stats;
using agot_bg_website.Pages;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace agot_bg_website.Tests.Pages;

/// <summary>
/// Covers the public users directory/ranking page (Pages/Users.cshtml.cs): sorting by each cached
/// stats column in both directions, and that a user whose stats have never been cached gets
/// enqueued for background recalculation instead of the page computing anything inline.
/// </summary>
public class UsersModelTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IAuthorizationService _authorizationService;
    private readonly UserStatsRecalculationQueue _userStatsQueue;

    public UsersModelTests()
    {
        var services = new ServiceCollection();
        services.AddDbContext<ApplicationDbContext>(o =>
            o.UseInMemoryDatabase(Guid.NewGuid().ToString())
        );
        services.AddLogging();
        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();
        services.AddAuthorizationBuilder().AddGamePermissionPolicies();
        services.AddSingleton<UserStatsRecalculationQueue>();

        _provider = services.BuildServiceProvider();
        _db = _provider.GetRequiredService<ApplicationDbContext>();
        _userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();
        _roleManager = _provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        _authorizationService = _provider.GetRequiredService<IAuthorizationService>();
        _userStatsQueue = _provider.GetRequiredService<UserStatsRecalculationQueue>();
    }

    private UsersModel CreatePageModel(ClaimsPrincipal? viewer = null) =>
        new(_userManager, _authorizationService, _db, _userStatsQueue)
        {
            PageContext = new PageContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = viewer ?? new ClaimsPrincipal(new ClaimsIdentity()),
                },
            },
        };

    /// <summary>A signed-in principal holding the <see cref="GamePermissions.ManageUserStatus"/>
    /// claim directly (the same "one-off claim on a single user" grant path covered by
    /// GamePermissionsTests), so tests can exercise the status-filter/moderation UI without
    /// needing a full role assignment round-trip.</summary>
    private static ClaimsPrincipal ManageUserStatusViewer() =>
        new(
            new ClaimsIdentity(
                [new Claim(GamePermissions.ClaimType, GamePermissions.ManageUserStatus)],
                authenticationType: "Test"
            )
        );

    private async Task<ApplicationUser> CreateUserAsync(
        string userName,
        int? finished,
        int? won,
        int? removed,
        double? winRate,
        DateTimeOffset? lastActivity = null
    )
    {
        var user = new ApplicationUser
        {
            UserName = userName,
            Email = $"{userName}@example.com",
            CachedFinishedGamesCount = finished,
            CachedWonGamesCount = won,
            CachedRemovedFromGameCount = removed,
            CachedWinRate = winRate,
            StatsCachedAt = finished is null ? null : DateTimeOffset.UtcNow,
            LastActivity = lastActivity ?? DateTimeOffset.UtcNow,
        };
        await _userManager.CreateAsync(user);
        return user;
    }

    [Fact]
    public async Task SortByWonGames_Descending_OrdersHighestFirst()
    {
        await CreateUserAsync("low", finished: 5, won: 1, removed: 0, winRate: 0.2);
        await CreateUserAsync("high", finished: 10, won: 8, removed: 0, winRate: 0.8);
        await CreateUserAsync("mid", finished: 6, won: 3, removed: 0, winRate: 0.5);

        var model = CreatePageModel();
        model.SortBy = "won";
        model.SortDir = "desc";
        await model.OnGetAsync();

        Assert.Equal(["high", "mid", "low"], model.Users.Select(u => u.UserName));
    }

    [Fact]
    public async Task SortByLastActivity_Descending_OrdersMostRecentFirst()
    {
        var now = DateTimeOffset.UtcNow;
        await CreateUserAsync(
            "stale",
            finished: 1,
            won: 1,
            removed: 0,
            winRate: 1.0,
            lastActivity: now.AddDays(-30)
        );
        await CreateUserAsync(
            "active",
            finished: 1,
            won: 0,
            removed: 0,
            winRate: 0.0,
            lastActivity: now
        );

        var model = CreatePageModel();
        model.SortBy = "activity";
        model.SortDir = "desc";
        await model.OnGetAsync();

        Assert.Equal(["active", "stale"], model.Users.Select(u => u.UserName));
    }

    [Fact]
    public async Task SortByWinRate_Ascending_OrdersLowestFirst()
    {
        await CreateUserAsync("low", finished: 5, won: 1, removed: 0, winRate: 0.2);
        await CreateUserAsync("high", finished: 10, won: 8, removed: 0, winRate: 0.8);

        var model = CreatePageModel();
        model.SortBy = "winrate";
        model.SortDir = "asc";
        await model.OnGetAsync();

        Assert.Equal(["low", "high"], model.Users.Select(u => u.UserName));
    }

    /// <summary>
    /// Regression test for the reported bug: a null win rate (no finished games yet, or stats
    /// never recalculated) must never outrank an actual ranked player - on Postgres, the naive
    /// `OrderByDescending(u => u.CachedWinRate)` puts NULLs FIRST for a descending sort (Postgres's
    /// default null ordering), which buried real high-win-rate players many pages deep behind a
    /// wall of "n/a" accounts, making sorting look like it only reordered the current page. Nulls
    /// must land last regardless of direction.
    /// </summary>
    [Theory]
    [InlineData("asc")]
    [InlineData("desc")]
    public async Task SortByWinRate_NullWinRateAlwaysSortsLast(string sortDir)
    {
        await CreateUserAsync("unranked", finished: 0, won: 0, removed: 0, winRate: null);
        await CreateUserAsync("ranked", finished: 5, won: 4, removed: 0, winRate: 0.8);

        var model = CreatePageModel();
        model.SortBy = "winrate";
        model.SortDir = sortDir;
        await model.OnGetAsync();

        Assert.Equal(["ranked", "unranked"], model.Users.Select(u => u.UserName));
    }

    [Fact]
    public async Task InvalidSortBy_FallsBackToUsernameAscending()
    {
        await CreateUserAsync("zeta", finished: 1, won: 1, removed: 0, winRate: 1.0);
        await CreateUserAsync("alpha", finished: 1, won: 0, removed: 0, winRate: 0.0);

        var model = CreatePageModel();
        model.SortBy = "not-a-real-column";
        await model.OnGetAsync();

        Assert.Equal("username", model.SortBy);
        Assert.Equal(["alpha", "zeta"], model.Users.Select(u => u.UserName));
    }

    /// <summary>
    /// A request that explicitly sorts by a column (as if a sort-header link was clicked) must
    /// persist that choice into <c>snr_users_list_prefs</c>, and a later, completely fresh
    /// query-less visit (e.g. clicking "Users" in the nav) must restore it instead of defaulting
    /// back to username/ascending - see <see cref="agot_bg_website.Infrastructure.Paging.UsersListPreferencesCookie"/>.
    /// </summary>
    [Fact]
    public async Task ListPreferences_ArePersistedAndRestoredOnFreshVisit()
    {
        await CreateUserAsync("alpha", finished: 1, won: 1, removed: 0, winRate: 1.0);
        await CreateUserAsync("beta", finished: 2, won: 2, removed: 0, winRate: 1.0);

        var firstContext = new DefaultHttpContext();
        firstContext.Request.QueryString = new QueryString("?SortBy=won&SortDir=desc");
        var first = new UsersModel(_userManager, _authorizationService, _db, _userStatsQueue)
        {
            PageContext = new PageContext { HttpContext = firstContext },
            SortBy = "won",
            SortDir = "desc",
        };
        await first.OnGetAsync();

        var setCookieHeader = firstContext.Response.Headers.SetCookie.ToString();
        Assert.Contains("snr_users_list_prefs=", setCookieHeader);
        // A browser only ever replays "name=value" back to the server, dropping the
        // path/expires/samesite attributes - mirror that here for the second request below.
        var cookiePair = setCookieHeader.Split(';')[0];

        var secondContext = new DefaultHttpContext();
        secondContext.Request.Headers.Cookie = cookiePair;
        var second = new UsersModel(_userManager, _authorizationService, _db, _userStatsQueue)
        {
            PageContext = new PageContext { HttpContext = secondContext },
        };
        var result = await second.OnGetAsync();

        // The restore redirects so the restored sort ends up in the querystring - otherwise the
        // pager's prev/next links (which round-trip the querystring) would drop it again.
        var redirect = Assert.IsType<RedirectToPageResult>(result);
        Assert.Equal("won", redirect.RouteValues!["SortBy"]);
        Assert.Equal("desc", redirect.RouteValues["SortDir"]);
        Assert.Equal(1, redirect.RouteValues["PageNumber"]);
    }

    /// <summary>
    /// The "Ongoing games" column counts only currently Ongoing, non-faceless games, and sorting
    /// by it (computed in memory, see UsersModel.PageByOngoingGamesCountAsync) pages correctly
    /// across the in-memory-sorted active users and the SQL-ordered zero-count users.
    /// </summary>
    [Theory]
    [InlineData("desc", 1, new[] { "busy", "some", "u1", "u2", "u3" })]
    [InlineData("desc", 2, new[] { "u4", "u5" })]
    [InlineData("asc", 1, new[] { "u1", "u2", "u3", "u4", "u5" })]
    [InlineData("asc", 2, new[] { "some", "busy" })]
    public async Task SortByOngoingGames_CountsNonFacelessOngoingGamesAndPages(
        string sortDir,
        int pageNumber,
        string[] expected
    )
    {
        var busy = await CreateUserAsync("busy", finished: 0, won: 0, removed: 0, winRate: null);
        var some = await CreateUserAsync("some", finished: 0, won: 0, removed: 0, winRate: null);
        var u1 = await CreateUserAsync("u1", finished: 0, won: 0, removed: 0, winRate: null);
        foreach (var name in new[] { "u2", "u3", "u4", "u5" })
        {
            await CreateUserAsync(name, finished: 0, won: 0, removed: 0, winRate: null);
        }

        AddGame(GameState.Ongoing, faceless: false, busy, some);
        AddGame(GameState.Ongoing, faceless: false, busy);
        // Neither a faceless ongoing game nor a non-ongoing game may count.
        AddGame(GameState.Ongoing, faceless: true, busy, some, u1);
        AddGame(GameState.Finished, faceless: false, busy, u1);
        await _db.SaveChangesAsync();

        var model = CreatePageModel();
        model.HttpContext.Request.QueryString = new QueryString("?pageSize=5");
        model.SortBy = "ongoing";
        model.SortDir = sortDir;
        model.PageSize = 5;
        model.PageNumber = pageNumber;
        await model.OnGetAsync();

        Assert.Equal(7, model.Pager.TotalCount);
        Assert.Equal(expected, model.Users.Select(u => u.UserName));
        Assert.Equal(2, model.OngoingGamesCountByUserId[busy.Id]);
        Assert.Equal(1, model.OngoingGamesCountByUserId[some.Id]);
        Assert.False(model.OngoingGamesCountByUserId.ContainsKey(u1.Id));
    }

    private void AddGame(GameState state, bool faceless, params ApplicationUser[] players)
    {
        var game = new Game
        {
            Name = "game",
            OwnerUserId = players[0].Id,
            State = state,
            ViewOfGame = JsonDocument.Parse(
                "{\"settings\":{\"faceless\":" + (faceless ? "true" : "false") + "}}"
            ),
        };
        foreach (var player in players)
        {
            game.Players.Add(new PlayerInGame { UserId = player.Id });
        }
        _db.Games.Add(game);
    }

    [Fact]
    public void NextSortDir_TogglesActiveColumnAndDefaultsOthers()
    {
        var model = CreatePageModel();
        model.SortBy = "won";
        model.SortDir = "desc";

        // Clicking the already-active column toggles direction...
        Assert.Equal("asc", model.NextSortDir("won"));
        // ...while clicking a different stats column starts at that column's own default (desc,
        // i.e. best-first for a ranking column) regardless of the currently active column/direction.
        Assert.Equal("desc", model.NextSortDir("winrate"));
        // Username's default first-click direction is ascending, matching the previous
        // (pre-sorting) implicit behaviour.
        Assert.Equal("asc", model.NextSortDir("username"));
    }

    [Fact]
    public async Task UserWithUncachedStats_IsEnqueuedForBackgroundRecalculation()
    {
        var user = await CreateUserAsync(
            "uncached",
            finished: null,
            won: null,
            removed: null,
            winRate: null
        );

        var model = CreatePageModel();
        await model.OnGetAsync();

        await using var enumerator = _userStatsQueue
            .ReadAllAsync(CancellationToken.None)
            .GetAsyncEnumerator();
        Assert.True(await enumerator.MoveNextAsync());
        Assert.Equal(user.Id, enumerator.Current);
    }

    [Fact]
    public async Task StatusFilter_WithManageUserStatusPermission_FiltersToRoleMembers()
    {
        var banned = await CreateUserAsync("banned", finished: 1, won: 1, removed: 0, winRate: 1.0);
        await _roleManager.CreateAsync(new IdentityRole<Guid>(RoleNames.Banned));
        await _userManager.AddToRoleAsync(banned, RoleNames.Banned);
        await CreateUserAsync("regular", finished: 1, won: 0, removed: 0, winRate: 0.0);

        var model = CreatePageModel(ManageUserStatusViewer());
        model.StatusFilter = "banned";
        await model.OnGetAsync();

        Assert.Equal(["banned"], model.Users.Select(u => u.UserName));
    }

    /// <summary>A viewer without <see cref="GamePermissions.ManageUserStatus"/> must never be
    /// able to use StatusFilter to enumerate who's on probation/tongueless/banned - the filter is
    /// silently dropped for them rather than honored, so the query just returns everyone.</summary>
    [Fact]
    public async Task StatusFilter_WithoutManageUserStatusPermission_IsIgnored()
    {
        var banned = await CreateUserAsync("banned", finished: 1, won: 1, removed: 0, winRate: 1.0);
        await _roleManager.CreateAsync(new IdentityRole<Guid>(RoleNames.Banned));
        await _userManager.AddToRoleAsync(banned, RoleNames.Banned);
        await CreateUserAsync("regular", finished: 1, won: 0, removed: 0, winRate: 0.0);

        var model = CreatePageModel();
        model.StatusFilter = "banned";
        await model.OnGetAsync();

        Assert.Null(model.StatusFilter);
        Assert.Equal(["banned", "regular"], model.Users.Select(u => u.UserName));
    }

    public void Dispose()
    {
        _db.Dispose();
        _provider.Dispose();
    }
}
