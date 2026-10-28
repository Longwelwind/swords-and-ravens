using System.Text.Json;
using System.Text.Json.Serialization;

namespace agot_bg_website.Services.Statistics;

public sealed record CatalogHouse(string Id, string Name, string Color);

public sealed record CatalogPlayerSetup(int PlayerCount, IReadOnlyList<string> Houses);

public sealed record CatalogSetup(
    string Id,
    string Name,
    IReadOnlyList<CatalogPlayerSetup> PlayerSetups
);

/// <summary>
/// Scenario catalog generated from agot-bg-game-server/data/baseGameData.json by
/// <c>yarn run generate-scenario-catalog</c> (GameData/scenarios.json, embedded into this
/// assembly). A "scenario" is a (setupId, playerCount) pair, where playerCount is
/// ViewOfGame.settings.playerCount (the setup's house count - with vassals enabled, unoccupied
/// houses become vassals, so a listed house isn't proof that a human played it).
/// </summary>
public sealed class ScenarioCatalog
{
    public const string TutorialSetupId = "learn-the-game";

    internal const string ResourceName = "agot_bg_website.GameData.scenarios.json";

    private static readonly Lazy<ScenarioCatalog> LazyInstance = new(Load);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly Dictionary<string, CatalogHouse> housesById;
    private readonly Dictionary<string, CatalogSetup> setupsById;

    internal ScenarioCatalog(IReadOnlyList<CatalogHouse> houses, IReadOnlyList<CatalogSetup> setups)
    {
        Houses = houses;
        Setups = setups;
        housesById = houses.ToDictionary(h => h.Id);
        setupsById = setups.ToDictionary(s => s.Id);
    }

    public static ScenarioCatalog Instance => LazyInstance.Value;

    /// <summary>All houses in website display order (Baratheon, Lannister, Stark, ...).</summary>
    public IReadOnlyList<CatalogHouse> Houses { get; }

    public IReadOnlyList<CatalogSetup> Setups { get; }

    public CatalogHouse? GetHouse(string? houseId) =>
        houseId is not null && housesById.TryGetValue(houseId, out var h) ? h : null;

    public CatalogSetup? GetSetup(string? setupId) =>
        setupId is not null && setupsById.TryGetValue(setupId, out var s) ? s : null;

    public CatalogPlayerSetup? GetPlayerSetup(string? setupId, int playerCount) =>
        GetSetup(setupId)?.PlayerSetups.FirstOrDefault(ps => ps.PlayerCount == playerCount);

    /// <summary>Position of a house in the display order; unknown houses sort last.</summary>
    public int HouseOrder(string houseId)
    {
        for (var i = 0; i < Houses.Count; i++)
        {
            if (Houses[i].Id == houseId)
            {
                return i;
            }
        }

        return Houses.Count;
    }

    /// <summary>"Rumble in the South (4p)" or "2nd Edition Base Game (3-6p) - 6 players".</summary>
    public string GetScenarioLabel(string setupId, int playerCount)
    {
        var setup = GetSetup(setupId);
        if (setup is null)
        {
            return $"{setupId} - {playerCount} players";
        }

        return setup.PlayerSetups.Count == 1 ? setup.Name : $"{setup.Name} - {playerCount} players";
    }

    internal static ScenarioCatalog Parse(Stream json)
    {
        var dto =
            JsonSerializer.Deserialize<CatalogDto>(json, JsonOptions)
            ?? throw new InvalidOperationException("Scenario catalog is empty.");
        return new ScenarioCatalog(dto.Houses, dto.Setups);
    }

    private static ScenarioCatalog Load()
    {
        using var stream =
            typeof(ScenarioCatalog).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException(
                $"Embedded resource '{ResourceName}' not found."
            );
        return Parse(stream);
    }

    private sealed record CatalogDto(
        [property: JsonPropertyName("houses")] List<CatalogHouse> Houses,
        [property: JsonPropertyName("setups")] List<CatalogSetup> Setups
    );
}
