using agot_bg_website.Infrastructure.Paging;
using agot_bg_website.Services.Statistics;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace agot_bg_website.Pages;

/// <summary>
/// Global statistics over all finished games (tutorial excluded), gated to logged-in members by
/// the "/Statistics" AuthorizePage convention in Program.cs. All filters are plain GET parameters
/// normalized by <see cref="GameStatisticsFilter.Parse"/> - invalid values never cause an error.
/// </summary>
public class StatisticsModel(GameStatisticsService statistics) : PageModel
{
    private const int DefaultPageSize = 25;

    public GameStatisticsFilter Filter { get; private set; } = GameStatisticsFilter.Default;

    public GameStatisticsOverview Overview { get; private set; } = null!;

    public IReadOnlyList<LatestGame> LatestGames { get; private set; } = [];

    public PagerInfo Pager { get; private set; } = null!;

    public ScenarioCatalog Catalog => ScenarioCatalog.Instance;

    /// <summary>True when the filter differs from the default (shows the "Reset" link).</summary>
    public bool IsFiltered => Filter.CacheKey != GameStatisticsFilter.Default.CacheKey;

    public async Task OnGetAsync(int pageNumber = 1, int pageSize = 0)
    {
        Filter = GameStatisticsFilter.Parse(key => Request.Query[key].FirstOrDefault());

        if (!Request.Query.ContainsKey("pageSize"))
        {
            pageSize = PageSizeCookie.Read(Request, DefaultPageSize);
        }
        pageSize = PagingExtensions.NormalizePageSize(pageSize, DefaultPageSize);

        Overview = await statistics.GetOverviewAsync(Filter, HttpContext.RequestAborted);

        var pager = new PagerInfo(1, pageSize, Overview.FinishedGames);
        pageNumber = Math.Clamp(pageNumber, 1, pager.TotalPages);
        Pager = pager with { PageNumber = pageNumber };

        LatestGames =
            Overview.FinishedGames == 0
                ? []
                : await statistics.GetLatestGamesAsync(
                    Filter,
                    pageNumber,
                    pageSize,
                    HttpContext.RequestAborted
                );
    }
}
