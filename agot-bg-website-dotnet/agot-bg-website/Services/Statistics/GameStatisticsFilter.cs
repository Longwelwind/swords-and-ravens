using System.Globalization;

namespace agot_bg_website.Services.Statistics;

public enum GameTypeFilter
{
    Any,
    Pbem,
    Live,
}

/// <summary>
/// Normalized filter of the global statistics page. Everything is validated against the
/// <see cref="ScenarioCatalog"/> / <see cref="StatisticsSettingGroups"/> allow-lists while parsing,
/// so an instance only ever carries known ids and keys - invalid query-string input is silently
/// dropped (or replaced by the default scenario), never an error.
/// </summary>
public sealed record GameStatisticsFilter(
    string? SetupId,
    int? PlayerCount,
    GameTypeFilter GameType,
    int? MinRound,
    int? MaxRound,
    IReadOnlyList<KeyValuePair<string, bool>> Settings,
    int? HumanSeats
)
{
    public const string DefaultSetupId = "base-game";
    public const int DefaultPlayerCount = 6;
    public const int MaxRoundLimit = 1000;
    public const string AllScenariosValue = "all";
    public const string SettingParameterPrefix = "s.";

    public bool AllScenarios => SetupId is null;

    public static GameStatisticsFilter Default { get; } =
        new(DefaultSetupId, DefaultPlayerCount, GameTypeFilter.Any, null, null, [], null);

    /// <summary>Scenario dropdown value: "setupId:playerCount" or "all".</summary>
    public string ScenarioValue =>
        SetupId is null ? AllScenariosValue : ScenarioValueFor(SetupId, PlayerCount!.Value);

    public static string ScenarioValueFor(string setupId, int playerCount) =>
        $"{setupId}:{playerCount.ToString(CultureInfo.InvariantCulture)}";

    /// <summary>Every (setup, player count) offered in the scenario dropdown - the tutorial is never offered.</summary>
    public static IEnumerable<(string SetupId, int PlayerCount)> AvailableScenarios(
        ScenarioCatalog catalog
    ) =>
        catalog
            .Setups.Where(s => s.Id != ScenarioCatalog.TutorialSetupId)
            .SelectMany(s => s.PlayerSetups.Select(ps => (s.Id, ps.PlayerCount)));

    /// <summary>The houses shown in the chart for the selected scenario.</summary>
    public IReadOnlyList<CatalogHouse> AvailableHouses(ScenarioCatalog catalog)
    {
        if (SetupId is null)
        {
            return catalog.Houses;
        }

        var houseIds = catalog.GetPlayerSetup(SetupId, PlayerCount!.Value)?.Houses ?? [];
        return [.. houseIds.Select(catalog.GetHouse).OfType<CatalogHouse>()];
    }

    public SettingFilterValue GetSetting(string key)
    {
        foreach (var (k, value) in Settings)
        {
            if (k == key)
            {
                return value ? SettingFilterValue.Yes : SettingFilterValue.No;
            }
        }

        return SettingFilterValue.Any;
    }

    /// <summary>
    /// Parses and normalizes the query string. <paramref name="get"/> returns the raw value of a
    /// query parameter (or null). Parameters: scenario, type, minRound, maxRound and
    /// "s.{settingKey}" = yes|no|any.
    /// </summary>
    public static GameStatisticsFilter Parse(
        Func<string, string?> get,
        ScenarioCatalog? catalog = null
    )
    {
        catalog ??= ScenarioCatalog.Instance;

        var (setupId, playerCount) = ParseScenario(get("scenario"), catalog);

        var gameType = (get("type")?.Trim().ToLowerInvariant()) switch
        {
            "pbem" => GameTypeFilter.Pbem,
            "live" => GameTypeFilter.Live,
            _ => GameTypeFilter.Any,
        };

        var filter = new GameStatisticsFilter(setupId, playerCount, gameType, null, null, [], null);

        var minRound = ParseRound(get("minRound"));
        var maxRound = ParseRound(get("maxRound"));
        if (minRound is not null && maxRound is not null && minRound > maxRound)
        {
            (minRound, maxRound) = (maxRound, minRound);
        }

        var settings = new List<KeyValuePair<string, bool>>();
        foreach (var option in StatisticsSettingGroups.AllOptions)
        {
            switch (get(SettingParameterPrefix + option.Key)?.Trim().ToLowerInvariant())
            {
                case "yes":
                    settings.Add(new(option.Key, true));
                    break;
                case "no":
                    settings.Add(new(option.Key, false));
                    break;
            }
        }

        var maxHumanSeats =
            setupId is not null && playerCount is not null
                ? catalog.GetPlayerSetup(setupId, playerCount.Value)?.Houses.Count ?? 0
                : catalog.Houses.Count;
        var humanSeats = ParseHumanSeats(get("humanSeats"), maxHumanSeats);

        return filter with
        {
            MinRound = minRound is null or <= 1 ? null : minRound,
            MaxRound = maxRound,
            Settings = settings,
            HumanSeats = humanSeats,
        };
    }

    /// <summary>Normalized query-string values; also the basis of <see cref="CacheKey"/>.</summary>
    public IReadOnlyList<KeyValuePair<string, string>> ToQueryValues()
    {
        var values = new List<KeyValuePair<string, string>> { new("scenario", ScenarioValue) };
        if (GameType != GameTypeFilter.Any)
        {
            values.Add(new("type", GameType.ToString().ToLowerInvariant()));
        }

        if (MinRound is not null)
        {
            values.Add(new("minRound", MinRound.Value.ToString(CultureInfo.InvariantCulture)));
        }

        if (MaxRound is not null)
        {
            values.Add(new("maxRound", MaxRound.Value.ToString(CultureInfo.InvariantCulture)));
        }

        if (HumanSeats is not null)
        {
            values.Add(new("humanSeats", HumanSeats.Value.ToString(CultureInfo.InvariantCulture)));
        }

        foreach (var (key, value) in Settings)
        {
            values.Add(new(SettingParameterPrefix + key, value ? "yes" : "no"));
        }

        return values;
    }

    public string CacheKey =>
        string.Join('&', ToQueryValues().Select(kv => $"{kv.Key}={kv.Value}"));

    private static (string? SetupId, int? PlayerCount) ParseScenario(
        string? raw,
        ScenarioCatalog catalog
    )
    {
        raw = raw?.Trim();
        if (string.IsNullOrEmpty(raw))
        {
            return (DefaultSetupId, DefaultPlayerCount);
        }

        if (raw.Equals(AllScenariosValue, StringComparison.OrdinalIgnoreCase))
        {
            return (null, null);
        }

        var separator = raw.LastIndexOf(':');
        if (
            separator > 0
            && int.TryParse(
                raw[(separator + 1)..],
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out var playerCount
            )
        )
        {
            var setupId = raw[..separator];
            if (
                AvailableScenarios(catalog)
                    .Any(s => s.SetupId == setupId && s.PlayerCount == playerCount)
            )
            {
                return (setupId, playerCount);
            }
        }

        return (DefaultSetupId, DefaultPlayerCount);
    }

    private static int? ParseRound(string? raw) =>
        int.TryParse(raw?.Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var round)
        && round >= 1
        && round <= MaxRoundLimit
            ? round
            : null;

    private static int? ParseHumanSeats(string? raw, int maxHumanSeats) =>
        int.TryParse(raw?.Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var seats)
        && seats >= 1
        && seats <= maxHumanSeats
            ? seats
            : null;
}

public enum SettingFilterValue
{
    Any,
    No,
    Yes,
}
