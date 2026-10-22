using agot_bg_website.Services.GameListing;

namespace agot_bg_website.Services.Statistics;

public sealed record StatisticsSettingOption(string Key, string Label);

public sealed record StatisticsSettingGroup(
    string Title,
    bool Collapsed,
    IReadOnlyList<StatisticsSettingOption> Options
);

/// <summary>
/// The curated allow-list of boolean <c>ViewOfGame.settings</c> keys the statistics page can
/// filter on, grouped like the sections of the game server's GameSettingsComponent.tsx. This is
/// the only place keys come from: <see cref="GameStatisticsFilter.Parse"/> ignores anything not in
/// here, so no user-supplied text ever reaches a JSON path in the SQL.
/// </summary>
public static class StatisticsSettingGroups
{
    public static readonly IReadOnlyList<StatisticsSettingGroup> Groups =
    [
        Group(
            "Game",
            collapsed: false,
            "tidesOfBattle",
            "randomHouses",
            "randomChosenHouses",
            "tournamentMode",
            "private"
        ),
        Group(
            "Mother of Dragons",
            collapsed: true,
            "vassals",
            "ironBank",
            "seaOrderTokens",
            "allowGiftingPowerTokens",
            "empoweredVassals",
            "randomVassalAssignment"
        ),
        Group(
            "House cards",
            collapsed: true,
            "adwdHouseCards",
            "asosHouseCards",
            "firstEditionHouseCards",
            "houseCardsEvolution",
            "draftHouseCards"
        ),
        Group(
            "Draft variants",
            collapsed: true,
            "thematicDraft",
            "selectedRandomDraft",
            "randomDraft",
            "blindDraft",
            "limitedDraft",
            "draftTracks",
            "perpetuumRandom",
            "draftMap"
        ),
        Group(
            "More custom rules",
            collapsed: true,
            "cokWesterosPhase",
            "customBalancing",
            "precedingMustering",
            "randomStartPositions",
            "useVassalPositions",
            "endless",
            "fogOfWar",
            "holdVictoryPointsUntilEndOfRound",
            "dragonWar",
            "dragonRevenge",
            "mixedWesterosDeck1",
            "removeTob3",
            "removeTobSkulls",
            "limitTob2",
            "addPortToTheEyrie"
        ),
    ];

    private static readonly HashSet<string> AllowedKeys = Groups
        .SelectMany(g => g.Options)
        .Select(o => o.Key)
        .ToHashSet(StringComparer.Ordinal);

    public static IEnumerable<StatisticsSettingOption> AllOptions =>
        Groups.SelectMany(g => g.Options);

    public static bool IsAllowed(string key) => AllowedKeys.Contains(key);

    private static StatisticsSettingGroup Group(
        string title,
        bool collapsed,
        params string[] keys
    ) =>
        new(
            title,
            collapsed,
            [
                .. keys.Select(k => new StatisticsSettingOption(
                    k,
                    GameSettingsDisplay.SettingLabels[k]
                )),
            ]
        );
}
