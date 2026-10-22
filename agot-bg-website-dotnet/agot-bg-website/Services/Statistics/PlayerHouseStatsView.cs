using System.Globalization;

namespace agot_bg_website.Services.Statistics;

public enum HouseCardState
{
    Played,
    NotPlayed,
    NotInScenario,
}

public sealed record HouseCard(
    string Id,
    string Name,
    string Color,
    HouseCardState State,
    int Games,
    int Wins,
    bool IsBest
)
{
    public double? WinRate => Games == 0 ? null : (double)Wins / Games;

    public string WinRateDisplay =>
        WinRate is { } rate ? (rate * 100).ToString("F0", CultureInfo.InvariantCulture) + "%" : "–";
}

/// <summary>One option of the profile's scenario selector with the house cards to show for it.
/// <paramref name="Key"/> is empty for "All scenarios".</summary>
public sealed record HouseStatsSelection(
    string Key,
    string Label,
    int Games,
    int RemovedGames,
    IReadOnlyList<HouseCard> Cards
);

public static class PlayerHouseStatsView
{
    /// <summary>A house needs at least this many games in the current selection to be "best".</summary>
    public const int MinGamesForBest = 3;

    /// <summary>"All scenarios" first, then one selection per scenario with counted games, in catalog
    /// order.</summary>
    public static IReadOnlyList<HouseStatsSelection> BuildSelections(
        PlayerHouseStats stats,
        ScenarioCatalog catalog
    )
    {
        var selections = new List<HouseStatsSelection>
        {
            BuildSelection(
                string.Empty,
                "All scenarios",
                stats.Scenarios.SelectMany(s => s.Houses),
                stats.Scenarios.Sum(s => s.RemovedGames),
                activeHouseIds: null,
                catalog
            ),
        };

        foreach (var scenario in stats.Scenarios)
        {
            if (
                scenario.SetupId is null
                || scenario.PlayerCount is null
                || scenario.Houses.Count == 0
            )
            {
                continue;
            }

            var setupHouses = catalog
                .GetPlayerSetup(scenario.SetupId, scenario.PlayerCount.Value)
                ?.Houses;
            // An unknown scenario has no catalog house list: treat the houses played in it as active.
            var activeHouseIds = (setupHouses ?? []).Concat(scenario.Houses.Keys).ToHashSet();
            selections.Add(
                BuildSelection(
                    $"{scenario.SetupId}:{scenario.PlayerCount}",
                    catalog.GetScenarioLabel(scenario.SetupId, scenario.PlayerCount.Value),
                    scenario.Houses,
                    scenario.RemovedGames,
                    activeHouseIds,
                    catalog
                )
            );
        }

        return selections;
    }

    private static HouseStatsSelection BuildSelection(
        string key,
        string label,
        IEnumerable<KeyValuePair<string, HouseRecord>> houseRecords,
        int removedGames,
        HashSet<string>? activeHouseIds,
        ScenarioCatalog catalog
    )
    {
        var totals = houseRecords
            .Where(kv => catalog.GetHouse(kv.Key) is not null)
            .GroupBy(kv => kv.Key)
            .ToDictionary(
                g => g.Key,
                g => new HouseRecord(g.Sum(kv => kv.Value.Games), g.Sum(kv => kv.Value.Wins))
            );

        var best = totals
            .Where(kv => kv.Value.Games >= MinGamesForBest && kv.Value.Wins > 0)
            .OrderByDescending(kv => kv.Value.WinRate)
            .ThenByDescending(kv => kv.Value.Games)
            .ThenBy(kv => catalog.HouseOrder(kv.Key))
            .Select(kv => kv.Key)
            .FirstOrDefault();

        var cards = catalog
            .Houses.Select(house =>
            {
                var record = totals.GetValueOrDefault(house.Id) ?? new HouseRecord(0, 0);
                var state =
                    record.Games > 0 ? HouseCardState.Played
                    : activeHouseIds is not null && !activeHouseIds.Contains(house.Id)
                        ? HouseCardState.NotInScenario
                    : HouseCardState.NotPlayed;
                return new HouseCard(
                    house.Id,
                    house.Name,
                    house.Color,
                    state,
                    record.Games,
                    record.Wins,
                    house.Id == best
                );
            })
            .ToList();

        var games = totals.Values.Sum(h => h.Games);
        return new HouseStatsSelection(key, $"{label} ({games})", games, removedGames, cards);
    }
}
