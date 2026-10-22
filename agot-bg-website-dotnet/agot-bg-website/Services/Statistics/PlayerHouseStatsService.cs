using System.Text.Json;
using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Services.GameListing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace agot_bg_website.Services.Statistics;

/// <summary>Counted games and wins of one player with one house.</summary>
public sealed record HouseRecord(int Games, int Wins)
{
    public double? WinRate => Games == 0 ? null : (double)Wins / Games;
}

/// <summary>
/// One scenario bucket of a player's statistics. <paramref name="SetupId"/>/<paramref
/// name="PlayerCount"/> are null for games whose ViewOfGame carries no (complete) scenario - those
/// only contribute to the "all scenarios" view. <paramref name="RemovedGames"/> counts games the
/// player was replaced/removed from (house not recorded, so never attributed to a house).
/// </summary>
public sealed record ScenarioHouseStats(
    string? SetupId,
    int? PlayerCount,
    IReadOnlyDictionary<string, HouseRecord> Houses,
    int RemovedGames
);

public sealed record PlayerHouseStats(IReadOnlyList<ScenarioHouseStats> Scenarios);

/// <summary>
/// Per-house win rates of a single player, bucketed per scenario (setupId + playerCount), so the
/// profile can show "all scenarios" and every single scenario without further queries.
///
/// Uses exactly the rules of <see cref="UserStatsService"/>/<see cref="WinRateCalculator"/> for
/// the profile's overall win rate:
/// <list type="bullet">
/// <item>A current <c>PlayerInGame</c> row counts only if its game is Finished, isn't the
/// tutorial variant and has a recorded <c>is_winner</c>.</item>
/// <item>A loss as a pure replacer (<see cref="ViewOfGameInfo.IsPureReplacer"/>) is excluded, a win
/// still counts.</item>
/// <item>A <c>PreviousPlayerInGame</c> row (Finished or Ongoing game, not the tutorial, not as a
/// pure replacer) is a loss in the overall win rate but has no house, so it's only counted in
/// <see cref="ScenarioHouseStats.RemovedGames"/>.</item>
/// </list>
/// Never touches Game.SerializedGame.
/// </summary>
public sealed class PlayerHouseStatsService(ApplicationDbContext db, IMemoryCache cache)
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public Task<PlayerHouseStats> GetAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    ) =>
        cache.GetOrCreateAsync(
            $"player-house-stats:{userId}",
            entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                return ComputeAsync(userId, cancellationToken);
            }
        )!;

    private async Task<PlayerHouseStats> ComputeAsync(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var participations = await db
            .PlayersInGame.Where(p =>
                p.UserId == userId && p.Game != null && p.Game.State == GameState.Finished
            )
            .Select(p => new { p.Data, p.Game!.ViewOfGame })
            .ToListAsync(cancellationToken);

        var removals = await db
            .PreviousPlayersInGame.Where(p =>
                p.UserId == userId
                && (p.Game!.State == GameState.Finished || p.Game.State == GameState.Ongoing)
            )
            .Select(p => p.Game!.ViewOfGame)
            .ToListAsync(cancellationToken);

        var buckets = new Dictionary<(string?, int?), Bucket>();

        Bucket BucketFor(ViewOfGameInfo view, JsonDocument? viewOfGame)
        {
            var playerCount = ReadPlayerCount(viewOfGame);
            var key =
                view.SetupId is not null && playerCount is not null
                    ? (view.SetupId, playerCount)
                    : (null, null);
            if (!buckets.TryGetValue(key, out var bucket))
            {
                bucket = buckets[key] = new Bucket();
            }
            return bucket;
        }

        foreach (var row in participations)
        {
            var view = ViewOfGameInfo.Parse(row.ViewOfGame);
            var player = PlayerInGameInfo.Parse(row.Data);
            if (
                view.IsLearnTheGame
                || player.IsWinner is null
                || string.IsNullOrEmpty(player.House)
            )
            {
                continue;
            }

            if (player.IsWinner == false && view.IsPureReplacer(userId))
            {
                continue;
            }

            var houses = BucketFor(view, row.ViewOfGame).Houses;
            var house = player.House.ToLowerInvariant();
            var record = houses.GetValueOrDefault(house) ?? new HouseRecord(0, 0);
            houses[house] = new HouseRecord(
                record.Games + 1,
                record.Wins + (player.IsWinner == true ? 1 : 0)
            );
        }

        foreach (var viewOfGame in removals)
        {
            var view = ViewOfGameInfo.Parse(viewOfGame);
            if (!view.IsLearnTheGame && !view.IsPureReplacer(userId))
            {
                BucketFor(view, viewOfGame).Removed++;
            }
        }

        var catalog = ScenarioCatalog.Instance;
        var scenarios = buckets
            .OrderBy(kv => kv.Key.Item1 is null ? 1 : 0)
            .ThenBy(kv => SetupOrder(catalog, kv.Key.Item1))
            .ThenBy(kv => kv.Key.Item1, StringComparer.Ordinal)
            .ThenBy(kv => kv.Key.Item2)
            .Select(kv => new ScenarioHouseStats(
                kv.Key.Item1,
                kv.Key.Item2,
                kv.Value.Houses,
                kv.Value.Removed
            ))
            .ToList();
        return new PlayerHouseStats(scenarios);
    }

    private static int SetupOrder(ScenarioCatalog catalog, string? setupId)
    {
        for (var i = 0; i < catalog.Setups.Count; i++)
        {
            if (catalog.Setups[i].Id == setupId)
            {
                return i;
            }
        }

        return catalog.Setups.Count;
    }

    private static int? ReadPlayerCount(JsonDocument? viewOfGame) =>
        viewOfGame?.RootElement.TryGetProperty("settings", out var settings) == true
        && settings.ValueKind == JsonValueKind.Object
        && settings.TryGetProperty("playerCount", out var count)
        && count.ValueKind == JsonValueKind.Number
        && count.TryGetInt32(out var value)
            ? value
            : null;

    private sealed class Bucket
    {
        public Dictionary<string, HouseRecord> Houses { get; } = [];

        public int Removed { get; set; }
    }
}
