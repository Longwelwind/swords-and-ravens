using agot_bg_website.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace agot_bg_website.Services.Statistics;

/// <summary>
/// Global statistics over finished games. Aggregation happens in SQL (see
/// <see cref="GameStatisticsSql"/>); results are cached per normalized filter since finished
/// games change slowly and every page view would otherwise rescan the games table.
/// </summary>
public class GameStatisticsService(ApplicationDbContext db, IMemoryCache cache)
{
    public static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    public Task<GameStatisticsOverview> GetOverviewAsync(
        GameStatisticsFilter filter,
        CancellationToken cancellationToken = default
    ) =>
        GetOrCreateAsync(
            $"game-statistics:overview:{filter.CacheKey}",
            async () =>
            {
                var summary = (
                    await Query<StatisticsSummaryRow>(
                        GameStatisticsSql.Summary(filter),
                        cancellationToken
                    )
                ).Single();
                var houses = await Query<StatisticsHouseRow>(
                    GameStatisticsSql.Houses(filter),
                    cancellationToken
                );
                return GameStatisticsShaper.ShapeOverview(
                    filter,
                    summary,
                    houses,
                    ScenarioCatalog.Instance
                );
            }
        );

    /// <summary>The newest matching games, <paramref name="page"/> is 1-based and must already be clamped by the caller.</summary>
    public Task<IReadOnlyList<LatestGame>> GetLatestGamesAsync(
        GameStatisticsFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default
    ) =>
        GetOrCreateAsync(
            $"game-statistics:latest:{pageSize}:{page}:{filter.CacheKey}",
            async () =>
            {
                var rows = await Query<StatisticsLatestRow>(
                    GameStatisticsSql.Latest(filter, (page - 1) * pageSize, pageSize),
                    cancellationToken
                );
                return GameStatisticsShaper.ShapeLatest(rows, ScenarioCatalog.Instance);
            }
        );

    private Task<List<T>> Query<T>(StatisticsSqlQuery query, CancellationToken cancellationToken) =>
        db.Database.SqlQueryRaw<T>(query.Sql, query.Parameters).ToListAsync(cancellationToken);

    private async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory) =>
        (
            await cache.GetOrCreateAsync(
                key,
                entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                    return factory();
                }
            )
        )!;
}
