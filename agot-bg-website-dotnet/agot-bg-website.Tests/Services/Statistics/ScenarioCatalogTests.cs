using System.Text.Json;
using agot_bg_website.Services.GameListing;
using agot_bg_website.Services.Statistics;
using Xunit;

namespace agot_bg_website.Tests.Services.Statistics;

public class ScenarioCatalogTests
{
    [Fact]
    public void EmbeddedCatalog_IsInSyncWithGameServerBaseGameData()
    {
        var baseGameDataPath = FindBaseGameData();
        Assert.SkipWhen(baseGameDataPath is null, "agot-bg-game-server is not available.");

        using var doc = JsonDocument.Parse(File.ReadAllText(baseGameDataPath!));
        var catalog = ScenarioCatalog.Instance;

        var setups = doc.RootElement.GetProperty("setups").EnumerateObject().ToList();
        Assert.Equal(setups.Select(s => s.Name), catalog.Setups.Select(s => s.Id));
        foreach (var setup in setups)
        {
            var catalogSetup = catalog.GetSetup(setup.Name)!;
            Assert.Equal(setup.Value.GetProperty("name").GetString(), catalogSetup.Name);
            foreach (var ps in setup.Value.GetProperty("playerSetups").EnumerateArray())
            {
                var playerCount = ps.GetProperty("playerCount").GetInt32();
                var expected = ps.GetProperty("houses")
                    .EnumerateArray()
                    .Select(h => h.GetString()!)
                    .Order();
                var actual = catalog.GetPlayerSetup(setup.Name, playerCount)?.Houses.Order();
                Assert.Equal(expected, actual);
            }
        }

        var houses = doc.RootElement.GetProperty("houses").EnumerateObject().Select(h => h.Name);
        Assert.Equal(houses.Order(), catalog.Houses.Select(h => h.Id).Order());
    }

    [Fact]
    public void RumbleInTheSouth_HasNoStarkOrGreyjoy()
    {
        var houses = ScenarioCatalog.Instance.GetPlayerSetup("rumble-in-the-south", 4)!.Houses;

        Assert.Equal(["baratheon", "lannister", "tyrell", "martell"], houses);
    }

    [Fact]
    public void SetupNames_ComeFromCatalog()
    {
        Assert.Equal(
            "Rumble in the South (4p)",
            GameSettingsDisplay.GetSetupName("rumble-in-the-south")
        );
        Assert.Equal("Teach the Game (2p)", GameSettingsDisplay.GetSetupName("learn-the-game"));
    }

    private static string? FindBaseGameData()
    {
        for (
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            dir is not null;
            dir = dir.Parent
        )
        {
            var candidate = Path.Combine(
                dir.FullName,
                "agot-bg-game-server",
                "data",
                "baseGameData.json"
            );
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }
}
