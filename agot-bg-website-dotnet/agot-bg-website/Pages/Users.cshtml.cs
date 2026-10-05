using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Paging;
using agot_bg_website.Services.GameListing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Pages;

/// <summary>
/// Directory of registered users, gated to logged-in members only (see the "/Users"
/// AuthorizePage convention in Program.cs) - the .NET equivalent of the individual
/// <c>/User/{id}</c> profile page but as a searchable list (Django never had this; it only
/// offered the individual profile page and a "currently online" chat widget). Unlike the Admin
/// area's own Users page (<c>Areas/Admin/Pages/Users/Index.cshtml.cs</c>), this page never
/// exposes email addresses, role/permission editing, or account deletion - it only lets users with
/// the <see cref="GamePermissions.ManageUserStatus"/> permission (Admin and High Member by
/// default) toggle the On probation/Tongueless/Banned status of other, non-staff members.
/// </summary>
public class UsersModel(
    UserManager<ApplicationUser> userManager,
    IAuthorizationService authorizationService,
    ApplicationDbContext dbContext,
    Infrastructure.Stats.UserStatsRecalculationQueue userStatsQueue
) : PageModel
{
    private const int DefaultPageSize = 10;

    /// <summary>Roles a moderator is never allowed to alter here, to prevent High Members from
    /// banning/tonguing each other or Admins - only plain Members can be moderated this way.</summary>
    private static readonly string[] ProtectedRoles = [RoleNames.Admin, RoleNames.HighMember];

    /// <summary>Allowed values for <see cref="StatusFilter"/>, mapped to the actual role name to
    /// filter by. Only exposed in the UI to users with <see
    /// cref="GamePermissions.ManageUserStatus"/> (see <see cref="CanManageUserStatus"/>) since
    /// this exists specifically so High Members/Admins can find and undo those statuses.</summary>
    private static readonly Dictionary<string, string> StatusFilterRoles = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["probation"] = RoleNames.OnProbation,
        ["tongueless"] = RoleNames.Tongueless,
        ["banned"] = RoleNames.Banned,
    };

    /// <summary>Allowed values for <see cref="SortBy"/>, and each column's "first click" sort
    /// direction - ranking-style stat columns (finished/won/removed/winrate) default to
    /// descending (best first), while username/created keep the previous implicit ascending
    /// order as their default, matching what users are already used to.</summary>
    private static readonly Dictionary<string, string> SortColumnDefaultDirection = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["username"] = "asc",
        ["ongoing"] = "desc",
        ["finished"] = "desc",
        ["won"] = "desc",
        ["removed"] = "desc",
        ["winrate"] = "desc",
        ["replacer"] = "desc",
        ["created"] = "desc",
        ["activity"] = "desc",
    };

    [BindProperty(SupportsGet = true)]
    public string? Search { get; set; }

    [BindProperty(SupportsGet = true)]
    public int PageNumber { get; set; } = 1;

    [BindProperty(SupportsGet = true)]
    public int PageSize { get; set; } = DefaultPageSize;

    [BindProperty(SupportsGet = true)]
    public string SortBy { get; set; } = "username";

    [BindProperty(SupportsGet = true)]
    public string SortDir { get; set; } = "asc";

    /// <summary>One of <see cref="StatusFilterRoles"/>'s keys ("probation"/"tongueless"/"banned"),
    /// or null/empty for no filter. Only actually applied when <see
    /// cref="CanManageUserStatus"/> is true, so a crafted query string can't be used to enumerate
    /// moderation statuses without the permission to also act on them.</summary>
    [BindProperty(SupportsGet = true)]
    public string? StatusFilter { get; set; }

    public List<ApplicationUser> Users { get; set; } = [];

    public PagerInfo Pager { get; set; } = null!;

    public Dictionary<Guid, IList<string>> RolesByUserId { get; set; } = [];

    /// <summary>Live count of non-faceless Ongoing games per user - see <see
    /// cref="LoadOngoingGamesCountsAsync"/>. Users without any are absent (i.e. 0).</summary>
    public Dictionary<Guid, int> OngoingGamesCountByUserId { get; set; } = [];

    public bool CanManageUserStatus { get; set; }

    [TempData]
    public string? StatusMessage { get; set; }

    /// <summary>Direction a click on <paramref name="column"/>'s header should sort by next -
    /// toggles the current direction if it's already the active sort column, otherwise starts at
    /// that column's default (see <see cref="SortColumnDefaultDirection"/>). Used by the view to
    /// build each header's link.</summary>
    public string NextSortDir(string column) =>
        SortBy.Equals(column, StringComparison.OrdinalIgnoreCase)
            ? (SortDir == "asc" ? "desc" : "asc")
            : SortColumnDefaultDirection.GetValueOrDefault(column, "asc");

    /// <summary>Arrow to render next to a header, or empty if that column isn't the active sort.</summary>
    public string SortIndicator(string column) =>
        SortBy.Equals(column, StringComparison.OrdinalIgnoreCase)
            ? (SortDir == "asc" ? "▲" : "▼")
            : "";

    public async Task<IActionResult> OnGetAsync()
    {
        if (!Request.Query.ContainsKey("pageSize"))
        {
            PageSize = PageSizeCookie.Read(Request, DefaultPageSize);
        }
        PageSize = PagingExtensions.NormalizePageSize(PageSize, DefaultPageSize);

        // Restore the last-viewed page/sort only on a completely fresh, query-less navigation
        // (e.g. clicking "Users" in the nav) - as soon as ANY querystring parameter is present
        // (a search, a sort-header click, a pager link, ...) that request's own
        // querystring/model-bound values are trusted as-is, so e.g. submitting a new search still
        // resets back to page 1 rather than being overridden by a stale saved page number.
        // The restore is a redirect (rather than just rendering the restored values) so the
        // restored sort ends up in the querystring - the pager's prev/next/go-to-page links and
        // page-size form round-trip the current querystring, and would otherwise silently drop
        // the restored sort and fall back to the default ordering.
        if (!Request.QueryString.HasValue)
        {
            var saved = UsersListPreferencesCookie.Read(Request);
            if (saved is { } prefs)
            {
                return RedirectToPage(
                    new
                    {
                        prefs.PageNumber,
                        prefs.SortBy,
                        prefs.SortDir,
                    }
                );
            }
        }

        if (!SortColumnDefaultDirection.ContainsKey(SortBy))
        {
            SortBy = "username";
        }
        SortDir = SortDir == "desc" ? "desc" : "asc";

        CanManageUserStatus = (
            await authorizationService.AuthorizeAsync(User, GamePermissions.ManageUserStatus)
        ).Succeeded;

        // Only High Members/Admins may filter by moderation status - anyone else's StatusFilter
        // is silently dropped rather than honored.
        if (!CanManageUserStatus || !StatusFilterRoles.ContainsKey(StatusFilter ?? ""))
        {
            StatusFilter = null;
        }

        // Deleted ("Took the Black") accounts have no reason to be exposed in a public directory.
        var query = userManager.Users.Where(u => !u.IsDeleted);
        if (!string.IsNullOrWhiteSpace(Search))
        {
            var normalized = Search.Trim();
            query = query.Where(u => EF.Functions.ILike(u.UserName!, $"%{normalized}%"));
        }
        if (StatusFilter is not null)
        {
            var roleName = StatusFilterRoles[StatusFilter];
            var userIdsInRole = dbContext
                .UserRoles.Join(
                    dbContext.Roles,
                    ur => ur.RoleId,
                    r => r.Id,
                    (ur, r) => new { ur.UserId, r.Name }
                )
                .Where(x => x.Name == roleName)
                .Select(x => x.UserId);
            query = query.Where(u => userIdsInRole.Contains(u.Id));
        }

        OngoingGamesCountByUserId = await LoadOngoingGamesCountsAsync();

        var paged = SortBy.Equals("ongoing", StringComparison.OrdinalIgnoreCase)
            ? await PageByOngoingGamesCountAsync(query)
            : await OrderByCachedColumn(query).ToPagedResultAsync(PageNumber, PageSize);
        Users = paged.Items;
        Pager = paged.Pager;

        foreach (var user in Users)
        {
            RolesByUserId[user.Id] = await userManager.GetRolesAsync(user);

            // Same "never compute inline, just enqueue" fallback as the individual profile page
            // (Pages.User.cshtml.cs) - a user whose stats have never been cached yet shows 0/n-a
            // for this one request and gets picked up by the background service instead.
            if (user.StatsCachedAt is null)
            {
                userStatsQueue.Enqueue(user.Id);
            }
        }

        UsersListPreferencesCookie.Persist(Response, PageNumber, SortBy, SortDir);
        return Page();
    }

    /// <summary>
    /// Number of currently Ongoing games per user, computed live (it changes far too often - on
    /// every game start/end - to be worth caching like the finished-game stats). Faceless games
    /// are excluded, matching the profile page's foreign-profile games list and the cached
    /// finished-games stat, so the count never hints at a hidden faceless participation. Only
    /// users with at least one such game appear in the result.
    /// </summary>
    private async Task<Dictionary<Guid, int>> LoadOngoingGamesCountsAsync()
    {
        var ongoingGames = await dbContext
            .Games.Where(g => g.State == GameState.Ongoing)
            .Select(g => new { g.Id, g.ViewOfGame })
            .ToListAsync();
        var nonFacelessGameIds = ongoingGames
            .Where(g => !ViewOfGameInfo.Parse(g.ViewOfGame).IsFaceless)
            .Select(g => g.Id)
            .ToList();

        var counts = await dbContext
            .PlayersInGame.Where(p => nonFacelessGameIds.Contains(p.GameId))
            .GroupBy(p => p.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();
        return counts.ToDictionary(c => c.UserId, c => c.Count);
    }

    /// <summary>
    /// Pages <paramref name="query"/> sorted by <see cref="OngoingGamesCountByUserId"/>, which is
    /// computed in memory (faceless filtering needs the parsed ViewOfGame) and so can't be
    /// ordered by in SQL. The few users with at least one ongoing game are sorted in memory; all
    /// remaining (zero-count) users are a single SQL-ordered-by-username block placed after them
    /// (descending) or before them (ascending), so only the requested page is ever loaded.
    /// </summary>
    private async Task<PagedResult<ApplicationUser>> PageByOngoingGamesCountAsync(
        IQueryable<ApplicationUser> query
    )
    {
        var activeIds = OngoingGamesCountByUserId.Keys.ToList();
        var activeUsers = await query
            .Where(u => activeIds.Contains(u.Id))
            .Select(u => new { u.Id, u.UserName })
            .ToListAsync();
        var activeOrdered = (
            SortDir == "desc"
                ? activeUsers.OrderByDescending(u => OngoingGamesCountByUserId[u.Id])
                : activeUsers.OrderBy(u => OngoingGamesCountByUserId[u.Id])
        )
            .ThenBy(u => u.UserName, StringComparer.OrdinalIgnoreCase)
            .Select(u => u.Id)
            .ToList();

        var inactiveQuery = query.Where(u => !activeIds.Contains(u.Id)).OrderBy(u => u.UserName);
        var inactiveCount = await inactiveQuery.LongCountAsync();

        var pageNumber = Math.Max(1, PageNumber);
        var skip = (long)(pageNumber - 1) * PageSize;
        var items = new List<ApplicationUser>();

        if (SortDir == "desc")
        {
            var activeSlice = activeOrdered
                .Skip((int)Math.Min(skip, int.MaxValue))
                .Take(PageSize)
                .ToList();
            items.AddRange(await LoadInOrderAsync(query, activeSlice));
            var remaining = PageSize - activeSlice.Count;
            if (remaining > 0)
            {
                var inactiveSkip = (int)Math.Max(0, skip - activeOrdered.Count);
                items.AddRange(
                    await inactiveQuery.Skip(inactiveSkip).Take(remaining).ToListAsync()
                );
            }
        }
        else
        {
            var inactiveItems = await inactiveQuery
                .Skip((int)Math.Min(skip, int.MaxValue))
                .Take(PageSize)
                .ToListAsync();
            items.AddRange(inactiveItems);
            var remaining = PageSize - inactiveItems.Count;
            if (remaining > 0)
            {
                var activeSkip = (int)Math.Max(0, skip - inactiveCount);
                var activeSlice = activeOrdered.Skip(activeSkip).Take(remaining).ToList();
                items.AddRange(await LoadInOrderAsync(query, activeSlice));
            }
        }

        return new PagedResult<ApplicationUser>
        {
            Items = items,
            Pager = new PagerInfo(pageNumber, PageSize, activeOrdered.Count + inactiveCount),
        };
    }

    private static async Task<List<ApplicationUser>> LoadInOrderAsync(
        IQueryable<ApplicationUser> query,
        List<Guid> ids
    )
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var byId = await query.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
        return [.. ids.Select(id => byId[id])];
    }

    private IQueryable<ApplicationUser> OrderByCachedColumn(IQueryable<ApplicationUser> query)
    {
        // Every non-username column ties-break on username too, so paging stays stable/reproducible
        // even when many users share the same (e.g. 0) stat value. Null-valued stat columns
        // (no games recalculated yet, or a win rate that's never been defined because the user
        // has 0 finished games) are always pushed to the very end regardless of sort direction -
        // Postgres's default is NULLS FIRST for DESC, which would otherwise bury actual ranked
        // players under a wall of "n/a" accounts on page 1 whenever sorting a stats column
        // descending (the exact bug reported: sorting looked like it only affected the current
        // page, because the real top performers were pushed many pages deep).
        return (SortBy, SortDir) switch
        {
            ("finished", "desc") => query
                .OrderBy(u => u.CachedFinishedGamesCount == null)
                .ThenByDescending(u => u.CachedFinishedGamesCount)
                .ThenBy(u => u.UserName),
            ("finished", _) => query
                .OrderBy(u => u.CachedFinishedGamesCount == null)
                .ThenBy(u => u.CachedFinishedGamesCount)
                .ThenBy(u => u.UserName),
            ("won", "desc") => query
                .OrderBy(u => u.CachedWonGamesCount == null)
                .ThenByDescending(u => u.CachedWonGamesCount)
                .ThenBy(u => u.UserName),
            ("won", _) => query
                .OrderBy(u => u.CachedWonGamesCount == null)
                .ThenBy(u => u.CachedWonGamesCount)
                .ThenBy(u => u.UserName),
            ("removed", "desc") => query
                .OrderBy(u => u.CachedRemovedFromGameCount == null)
                .ThenByDescending(u => u.CachedRemovedFromGameCount)
                .ThenBy(u => u.UserName),
            ("removed", _) => query
                .OrderBy(u => u.CachedRemovedFromGameCount == null)
                .ThenBy(u => u.CachedRemovedFromGameCount)
                .ThenBy(u => u.UserName),
            ("winrate", "desc") => query
                .OrderBy(u => u.CachedWinRate == null)
                .ThenByDescending(u => u.CachedWinRate)
                .ThenBy(u => u.UserName),
            ("winrate", _) => query
                .OrderBy(u => u.CachedWinRate == null)
                .ThenBy(u => u.CachedWinRate)
                .ThenBy(u => u.UserName),
            ("replacer", "desc") => query
                .OrderBy(u => u.CachedReplacerGamesCount == null)
                .ThenByDescending(u => u.CachedReplacerGamesCount)
                .ThenBy(u => u.UserName),
            ("replacer", _) => query
                .OrderBy(u => u.CachedReplacerGamesCount == null)
                .ThenBy(u => u.CachedReplacerGamesCount)
                .ThenBy(u => u.UserName),
            ("created", "desc") => query.OrderByDescending(u => u.CreatedAt),
            ("created", _) => query.OrderBy(u => u.CreatedAt),
            ("activity", "desc") => query
                .OrderByDescending(u => u.LastActivity)
                .ThenBy(u => u.UserName),
            ("activity", _) => query.OrderBy(u => u.LastActivity).ThenBy(u => u.UserName),
            (_, "desc") => query.OrderByDescending(u => u.UserName),
            _ => query.OrderBy(u => u.UserName),
        };
    }

    public async Task<IActionResult> OnPostToggleStatusAsync(Guid id, string role)
    {
        if (
            !(
                await authorizationService.AuthorizeAsync(User, GamePermissions.ManageUserStatus)
            ).Succeeded
        )
        {
            return Forbid();
        }

        if (
            role != RoleNames.Banned
            && role != RoleNames.OnProbation
            && role != RoleNames.Tongueless
        )
        {
            return BadRequest();
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null || user.IsDeleted)
        {
            return NotFound();
        }

        var existingRoles = await userManager.GetRolesAsync(user);
        if (existingRoles.Intersect(ProtectedRoles).Any())
        {
            // Refuse to touch Admins/High Members here, even if the caller crafted the request
            // manually - the UI never renders these buttons for them in the first place.
            StatusMessage = $"{user.UserName}'s status cannot be changed here.";
            return RedirectToPage(
                new
                {
                    Search,
                    PageNumber,
                    PageSize,
                    SortBy,
                    SortDir,
                    StatusFilter,
                }
            );
        }

        var roleLabel = role switch
        {
            RoleNames.OnProbation => "on probation",
            RoleNames.Tongueless => "tongueless",
            _ => "banned",
        };

        if (existingRoles.Contains(role))
        {
            await userManager.RemoveFromRoleAsync(user, role);
            StatusMessage = $"{user.UserName} is no longer {roleLabel}.";
        }
        else
        {
            await userManager.AddToRoleAsync(user, role);
            StatusMessage = $"{user.UserName} is now {roleLabel}.";
        }

        // Force the user out of any active session immediately, mirroring the Admin ban toggle and
        // the PlayApi banned check.
        await userManager.UpdateSecurityStampAsync(user);

        return RedirectToPage(
            new
            {
                Search,
                PageNumber,
                PageSize,
                SortBy,
                SortDir,
                StatusFilter,
            }
        );
    }
}
