using agot_bg_website.Services.Statistics;
using Xunit;

namespace agot_bg_website.Tests.Services.Statistics;

public class GameStatisticsFilterTests
{
    private static GameStatisticsFilter Parse(params (string Key, string Value)[] query)
    {
        var values = query.ToDictionary(q => q.Key, q => q.Value);
        return GameStatisticsFilter.Parse(key => values.GetValueOrDefault(key));
    }

    [Fact]
    public void NoParameters_DefaultsToBaseGameSixPlayers()
    {
        var filter = Parse();

        Assert.Equal("base-game", filter.SetupId);
        Assert.Equal(6, filter.PlayerCount);
        Assert.Equal(GameTypeFilter.Any, filter.GameType);
        Assert.Null(filter.MinRound);
        Assert.Null(filter.MaxRound);
        Assert.Empty(filter.Settings);
    }

    [Theory]
    [InlineData("rumble-in-the-south:4", "rumble-in-the-south", 4)]
    [InlineData("base-game:3", "base-game", 3)]
    [InlineData("base-game:7", "base-game", 6)]
    [InlineData("nonsense", "base-game", 6)]
    [InlineData("base-game:x", "base-game", 6)]
    [InlineData("learn-the-game:2", "base-game", 6)]
    public void Scenario_IsValidatedAgainstCatalog_TutorialIsNeverAccepted(
        string raw,
        string expectedSetup,
        int expectedPlayers
    )
    {
        var filter = Parse(("scenario", raw));

        Assert.Equal(expectedSetup, filter.SetupId);
        Assert.Equal(expectedPlayers, filter.PlayerCount);
    }

    [Fact]
    public void AllScenarios_HasNoSetup_AndOffersNoTutorial()
    {
        var filter = Parse(("scenario", "ALL"));

        Assert.True(filter.AllScenarios);
        Assert.DoesNotContain(
            GameStatisticsFilter.AvailableScenarios(ScenarioCatalog.Instance),
            s => s.SetupId == ScenarioCatalog.TutorialSetupId
        );
    }

    [Fact]
    public void Settings_AcceptOnlyAllowListedKeysWithYesNo()
    {
        var filter = Parse(
            ("s.vassals", "yes"),
            ("s.tidesOfBattle", "NO"),
            ("s.ironBank", "any"),
            ("s.fogOfWar", "maybe"),
            ("s.setupId", "yes"),
            ("s.noPrivateChats", "no"),
            ("s.onlyLive", "yes"),
            ("s.x' OR '1'='1", "yes"),
            ("vassals", "yes")
        );

        Assert.Equal(
            [KeyValuePair.Create("tidesOfBattle", false), KeyValuePair.Create("vassals", true)],
            filter.Settings
        );
        Assert.Equal(SettingFilterValue.Yes, filter.GetSetting("vassals"));
        Assert.Equal(SettingFilterValue.No, filter.GetSetting("tidesOfBattle"));
        Assert.Equal(SettingFilterValue.Any, filter.GetSetting("ironBank"));
    }

    [Theory]
    [InlineData("3", "7", 3, 7)]
    [InlineData("7", "3", 3, 7)]
    [InlineData("1", "", null, null)]
    [InlineData("0", "-4", null, null)]
    [InlineData("abc", "1001", null, null)]
    [InlineData("", "1000", null, 1000)]
    public void Rounds_AreBoundedAndOrdered(
        string min,
        string max,
        int? expectedMin,
        int? expectedMax
    )
    {
        var filter = Parse(("minRound", min), ("maxRound", max));

        Assert.Equal(expectedMin, filter.MinRound);
        Assert.Equal(expectedMax, filter.MaxRound);
    }

    [Theory]
    [InlineData("mother-of-dragons:8", "8", 8)]
    [InlineData("mother-of-dragons:8", "7", 7)]
    [InlineData("rumble-in-the-south:4", "5", null)]
    [InlineData("all", "8", 8)]
    [InlineData("all", "9", null)]
    [InlineData("base-game:6", "0", null)]
    [InlineData("base-game:6", "abc", null)]
    public void HumanSeats_AreBoundedBySelectedScenario(
        string scenario,
        string rawSeats,
        int? expected
    )
    {
        var filter = Parse(("scenario", scenario), ("humanSeats", rawSeats));

        Assert.Equal(expected, filter.HumanSeats);
    }

    [Fact]
    public void QueryValues_RoundTripToTheSameFilter()
    {
        var filter = Parse(
            ("scenario", "mother-of-dragons:8"),
            ("type", "live"),
            ("minRound", "4"),
            ("maxRound", "9"),
            ("humanSeats", "8"),
            ("s.vassals", "no"),
            ("s.endless", "yes")
        );
        var values = filter.ToQueryValues().ToDictionary(kv => kv.Key, kv => kv.Value);

        var reparsed = GameStatisticsFilter.Parse(key => values.GetValueOrDefault(key));

        Assert.Equal(filter.CacheKey, reparsed.CacheKey);
        Assert.Equal(GameTypeFilter.Live, reparsed.GameType);
        Assert.Equal(8, reparsed.HumanSeats);
    }

    [Fact]
    public void LegacyHouseQueryParameter_IsIgnored()
    {
        var withLegacyParameter = Parse(("house", "stark"));

        Assert.Equal(GameStatisticsFilter.Default.CacheKey, withLegacyParameter.CacheKey);
        Assert.DoesNotContain(withLegacyParameter.ToQueryValues(), value => value.Key == "house");
    }
}
