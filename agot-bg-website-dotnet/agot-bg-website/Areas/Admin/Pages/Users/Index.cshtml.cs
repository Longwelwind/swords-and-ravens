using agot_bg_website.Domain;
using agot_bg_website.Infrastructure.Auth;
using agot_bg_website.Infrastructure.Paging;
using agot_bg_website.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Areas.Admin.Pages.Users;

public class IndexModel(
    UserManager<ApplicationUser> userManager,
    AccountDeletionService accountDeletionService,
    UserStatsService userStatsService,
    Infrastructure.Stats.UserStatsRecalculationQueue userStatsQueue
) : PageModel
{
    private const int DefaultPageSize = 10;

    /// <summary>Allowed values for <see cref="SortBy"/>. Roles aren't included - a user can have
    /// several, so there's no single well-defined sort order for that column.</summary>
    private static readonly string[] SortColumns = ["username", "email", "created"];

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

    /// <summary>Direction a click on <paramref name="column"/>'s header should sort by next -
    /// toggles the current direction if it's already the active sort column, otherwise starts
    /// ascending. Used by the view to build each header's link.</summary>
    public string NextSortDir(string column) =>
        SortBy.Equals(column, StringComparison.OrdinalIgnoreCase) && SortDir == "asc"
            ? "desc"
            : "asc";

    /// <summary>Arrow to render next to a header, or empty if that column isn't the active sort.</summary>
    public string SortIndicator(string column) =>
        SortBy.Equals(column, StringComparison.OrdinalIgnoreCase)
            ? (SortDir == "asc" ? "▲" : "▼")
            : "";

    public List<ApplicationUser> Users { get; set; } = [];

    public PagerInfo Pager { get; set; } = null!;

    public Dictionary<Guid, IList<string>> RolesByUserId { get; set; } = [];

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        if (!Request.Query.ContainsKey("pageSize"))
        {
            PageSize = PageSizeCookie.Read(Request, DefaultPageSize);
        }
        PageSize = PagingExtensions.NormalizePageSize(PageSize, DefaultPageSize);

        // Restore the last-viewed page/sort only on a completely fresh, query-less navigation
        // (e.g. clicking "Users" in the Admin nav) - as soon as ANY querystring parameter is
        // present (a search, a sort-header click, a pager link, ...) that request's own
        // querystring/model-bound values are trusted as-is, matching the public "/Users" page's
        // identical restore logic (see Pages.UsersModel.OnGetAsync), including redirecting so
        // the restored sort lands in the querystring the pager links round-trip.
        if (!Request.QueryString.HasValue)
        {
            var saved = AdminUsersListPreferencesCookie.Read(Request);
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

        if (!SortColumns.Contains(SortBy, StringComparer.OrdinalIgnoreCase))
        {
            SortBy = "username";
        }
        SortDir = SortDir == "desc" ? "desc" : "asc";

        var query = userManager.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(Search))
        {
            var normalized = Search.Trim();
            query = query.Where(u =>
                EF.Functions.ILike(u.UserName!, $"%{normalized}%")
                || EF.Functions.ILike(u.Email!, $"%{normalized}%")
                || u.Id.ToString() == normalized
            );
        }

        // Every non-username column ties-break on username too, so paging stays stable/reproducible.
        var ordered = (SortBy, SortDir) switch
        {
            ("email", "desc") => query.OrderByDescending(u => u.Email).ThenBy(u => u.UserName),
            ("email", _) => query.OrderBy(u => u.Email).ThenBy(u => u.UserName),
            ("created", "desc") => query
                .OrderByDescending(u => u.CreatedAt)
                .ThenBy(u => u.UserName),
            ("created", _) => query.OrderBy(u => u.CreatedAt).ThenBy(u => u.UserName),
            (_, "desc") => query.OrderByDescending(u => u.UserName),
            _ => query.OrderBy(u => u.UserName),
        };

        var paged = await ordered.ToPagedResultAsync(PageNumber, PageSize);
        Users = paged.Items;
        Pager = paged.Pager;

        foreach (var user in Users)
        {
            RolesByUserId[user.Id] = await userManager.GetRolesAsync(user);
        }

        AdminUsersListPreferencesCookie.Persist(Response, PageNumber, SortBy, SortDir);
        return Page();
    }

    public async Task<IActionResult> OnPostToggleBanAsync(Guid id)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        IdentityResult result;
        if (await userManager.IsInRoleAsync(user, RoleNames.Banned))
        {
            result = await userManager.RemoveFromRoleAsync(user, RoleNames.Banned);
            if (result.Succeeded)
            {
                StatusMessage = $"{user.UserName} has been unbanned.";
            }
        }
        else
        {
            result = await userManager.AddToRoleAsync(user, RoleNames.Banned);
            if (result.Succeeded)
            {
                // Force the user out of any active session immediately, mirroring the PlayApi banned check.
                await userManager.UpdateSecurityStampAsync(user);
                StatusMessage = $"{user.UserName} has been banned.";
            }
        }

        if (!result.Succeeded)
        {
            StatusMessage =
                $"Failed to update ban status for {user.UserName}: {DescribeErrors(result)}";
        }

        return RedirectToPage(
            new
            {
                Search,
                PageNumber,
                PageSize,
                SortBy,
                SortDir,
            }
        );
    }

    public async Task<IActionResult> OnPostDeleteAsync(Guid id)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        var displayName = user.DisplayName;
        var result = await accountDeletionService.DeleteAccountAsync(user);
        StatusMessage = result.Succeeded
            ? $"{displayName} has Took the Black - their account has been deleted."
            : $"Failed to delete {displayName}: {DescribeErrors(result)}";

        return RedirectToPage(
            new
            {
                Search,
                PageNumber,
                PageSize,
                SortBy,
                SortDir,
            }
        );
    }

    private static string DescribeErrors(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(e => e.Description));

    /// <summary>
    /// Forces an immediate, synchronous recalculation of a single user's cached win-rate stats
    /// (<see cref="ApplicationUser.CachedWinRate"/> and friends) - the normal path only happens in
    /// the background when one of their games finishes (see Api.GamesApi's PATCH handler) or the
    /// first time their profile is viewed after never having been cached. Useful right after a
    /// change to the win-rate calculation logic itself, to refresh a specific user's numbers
    /// without waiting for their next game.
    /// </summary>
    public async Task<IActionResult> OnPostRecalculateStatsAsync(Guid id)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        await userStatsService.RecalculateAsync(id);
        StatusMessage = $"Recalculated cached win-rate stats for {user.DisplayName}.";

        return RedirectToPage(
            new
            {
                Search,
                PageNumber,
                PageSize,
                SortBy,
                SortDir,
            }
        );
    }

    /// <summary>
    /// Bulk variant of <see cref="OnPostRecalculateStatsAsync"/> - enqueues every non-deleted
    /// user for background stats recalculation (see
    /// Infrastructure.Stats.UserStatsRecalculationQueue/UserStatsRecalculationBackgroundService).
    /// Useful after a change to the stats calculation logic itself, to refresh everyone's numbers
    /// without waiting for each user's next game to finish. Only queues ids (no stats are
    /// computed inline here) and the background service already throttles itself between
    /// batches, so this responds immediately regardless of how many users exist.
    /// </summary>
    public async Task<IActionResult> OnPostRecalculateAllStatsAsync()
    {
        var userIds = await userManager
            .Users.Where(u => !u.IsDeleted)
            .Select(u => u.Id)
            .ToListAsync();
        userStatsQueue.EnqueueAll(userIds);
        StatusMessage =
            $"Queued cached stats recalculation for {userIds.Count} user(s). This runs in the background and may take a while.";

        return RedirectToPage(
            new
            {
                Search,
                PageNumber,
                PageSize,
                SortBy,
                SortDir,
            }
        );
    }
}
