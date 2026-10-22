using System.Text.Json;
using agot_bg_website.Domain;

namespace agot_bg_website.Services.GameListing;

/// <summary>
/// Friendly display names for a game's `ViewOfGame.settings` blob, used to summarize a game's
/// setup/settings in the games-list "gear" popup on Games/MyGames/User (see _GamesTable.cshtml
/// and Pages/User.cshtml). Mirrors the client's src/client/GameSettingsComponent.tsx labels
/// verbatim and data/baseGameData.json's per-setup `name` fields - never touches SerializedGame,
/// only the small ViewOfGame JSON already loaded for every other games-list column.
/// </summary>
public static class GameSettingsDisplay
{
    /// <summary>setupId -> the exact display name from data/baseGameData.json's `setups.*.name`.</summary>
    public static readonly IReadOnlyDictionary<string, string> SetupNames = new Dictionary<
        string,
        string
    >
    {
        ["base-game"] = "2nd Edition Base Game (3-6p)",
        ["mother-of-dragons"] = "Mother of Dragons (7p/8p)",
        ["a-dance-with-dragons"] = "A Dance with Dragons (6p)",
        ["a-feast-for-crows"] = "A Feast for Crows (4p)",
        ["a-dance-with-mother-of-dragons"] = "A Dance with Mother of Dragons (8p)",
        ["struggle-in-the-north"] = "Struggle in the North (4p/5p)",
        ["rumble-in-the-south"] = "Rumble in the South (4p)",
        ["race-to-kings-landing"] = "Race to King's Landing (5p)",
        ["no-kraken-for-dinner"] = "No Kraken for Dinner (5p)",
        ["learn-the-game"] = "Teach the Game (2p)",
    };

    /// <summary>
    /// Boolean GameSettings.ts field -> the exact label text from GameSettingsComponent.tsx's
    /// &lt;label&gt;s. Deliberately covers every boolean field GameSettings.ts declares - leaving
    /// one out would silently make a true setting vanish from the summary rather than fall back
    /// to something readable. "pbem" is handled separately in <see cref="GetEnabledSettingLabels"/>
    /// since, unlike every other entry here, it must always show up first - as either "Play By
    /// E-Mail" or "Live" - rather than only appearing when true.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> SettingLabels = new Dictionary<
        string,
        string
    >
    {
        ["onlyLive"] = "Game clock",
        ["fixedClock"] = "Fixed clock",
        ["startWhenFull"] = "Start when full",
        ["adwdHouseCards"] = "A Dance with Dragons House cards",
        ["asosHouseCards"] = "A Storm of Swords House cards",
        ["firstEditionHouseCards"] = "1st edition House cards",
        ["vassals"] = "Mother of Dragons: Vassals",
        ["ironBank"] = "Mother of Dragons: Iron Bank",
        ["seaOrderTokens"] = "Mother of Dragons: Sea Order Tokens",
        ["allowGiftingPowerTokens"] = "Mother of Dragons: Gifting Power Tokens",
        ["empoweredVassals"] = "Custom: Empowered Vassals",
        ["randomVassalAssignment"] = "Custom: Random vassal assignment",
        ["dragonWar"] = "Custom: Dragon War",
        ["dragonRevenge"] = "Custom: Dragon Revenge",
        ["tidesOfBattle"] = "Tides of Battle",
        ["removeTob3"] = "Custom: Remove 3s cards from ToB",
        ["removeTobSkulls"] = "Custom: Remove skulls from ToB",
        ["limitTob2"] = "Custom: Limit ToB 2s cards",
        ["cokWesterosPhase"] = "Clash of Kings: Westeros Phase",
        ["customBalancing"] = "Custom: Balancing",
        ["houseCardsEvolution"] = "Custom: House cards evolution",
        ["addPortToTheEyrie"] = "Custom: Add a port to The Eyrie",
        ["fogOfWar"] = "Custom: Fog of War",
        ["mixedWesterosDeck1"] = "Custom: Mixed Westeros Deck 1",
        ["precedingMustering"] = "Custom: Preceding mustering",
        ["randomStartPositions"] = "Custom: Random start positions",
        ["useVassalPositions"] = "Custom: Vassal start positions",
        ["holdVictoryPointsUntilEndOfRound"] = "Custom: Hold victory points until end of round",
        ["draftHouseCards"] = "Custom: Draft House cards",
        ["thematicDraft"] = "Custom: Thematic Draft",
        ["selectedRandomDraft"] = "Custom: Selected Random Draft",
        ["randomDraft"] = "Custom: Random Draft",
        ["blindDraft"] = "Custom: Blind Draft",
        ["limitedDraft"] = "Custom: Limited Draft",
        ["draftTracks"] = "Custom: Draft Influence tracks",
        ["perpetuumRandom"] = "Custom: Perpetuum Random",
        ["draftMap"] = "Custom: Draft Scenario",
        ["endless"] = "Custom: Endless game (1000 rounds)",
        ["private"] = "Private game",
        ["tournamentMode"] = "Tournament game",
        ["faceless"] = "Faceless",
        ["randomHouses"] = "Random houses",
        ["randomChosenHouses"] = "Random chosen houses",
        ["noPrivateChats"] = "No private chats",
    };

    public static string GetSetupName(string? setupId) =>
        setupId is not null && SetupNames.TryGetValue(setupId, out var name)
            ? name
            : setupId ?? "Unknown setup";

    /// <summary>
    /// Every boolean setting that's true on this game, in GameSettings.ts's own declaration order.
    /// A couple of settings get an inline numeric suffix, matching what the in-game settings UI
    /// shows right next to that same checkbox (the live-clock length, the evolution round).
    /// </summary>
    public static List<string> GetEnabledSettingLabels(
        JsonDocument? viewOfGame,
        GameState gameState
    )
    {
        var labels = new List<string>();
        if (viewOfGame is null)
        {
            return labels;
        }

        if (
            !viewOfGame.RootElement.TryGetProperty("settings", out var settingsEl)
            || settingsEl.ValueKind != JsonValueKind.Object
        )
        {
            return labels;
        }

        // Every game is either PBEM or live - unlike every other setting below, this is never
        // "absent" so it always leads the list rather than only appearing when true.
        var isPbem =
            settingsEl.TryGetProperty("pbem", out var pbemEl)
            && pbemEl.ValueKind == JsonValueKind.True;
        labels.Add(isPbem ? "Play By E-Mail" : "Live");

        foreach (var (key, label) in SettingLabels)
        {
            if (key == "startWhenFull" && gameState != GameState.InLobby)
            {
                continue;
            }

            if (
                !settingsEl.TryGetProperty(key, out var valueEl)
                || valueEl.ValueKind != JsonValueKind.True
            )
            {
                continue;
            }

            var suffix = key switch
            {
                "onlyLive" when TryGetInt(settingsEl, "initialLiveClock", out var clock) =>
                    $" ({clock} min)",
                "houseCardsEvolution"
                    when TryGetInt(settingsEl, "houseCardsEvolutionRound", out var round) =>
                    $" (round {round})",
                _ => "",
            };
            labels.Add(label + suffix);
        }

        return labels;
    }

    private static bool TryGetInt(JsonElement obj, string name, out int value)
    {
        if (obj.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.Number)
        {
            value = el.GetInt32();
            return true;
        }

        value = 0;
        return false;
    }
}
