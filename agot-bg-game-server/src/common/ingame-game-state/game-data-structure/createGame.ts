import * as baseGameData from "../../../../data/baseGameData.json";
import HouseCard from "./house-card/HouseCard";
import House from "./House";
import Region from "./Region";
import World from "./World";
import WesterosCard from "./westeros-card/WesterosCard";
import {westerosCardTypes} from "./westeros-card/westerosCardTypes";
import unitTypes from "./unitTypes";
import Game from "./Game";
import WildlingCard from "./wildling-card/WildlingCard";
import wildlingCardTypes from "./wildling-card/wildlingCardTypes";
import BetterMap from "../../../utils/BetterMap";
import * as _ from "lodash";
import houseCardAbilities from "./house-card/houseCardAbilities";
import staticWorld from "./static-data-structure/globalStaticWorld";
import IngameGameState from "../IngameGameState";
import { vassalHouseCards } from "./static-data-structure/vassalHouseCards";

const MAX_POWER_TOKENS = 20;

interface HouseCardContainer {
    houseCards: {[key: string]: HouseCardData};
}

interface HouseData {
    name: string;
    color: string;
    unitLimits: {[key: string]: number};
    houseCards: {[key: string]: HouseCardData};
    supplyLevel: number;
}

interface UnitData {
    unitType: string;
    house: string;
    quantity: number;
    quantityVassal?: number;
}

export interface HouseCardData {
    name: string;
    combatStrength?: number;
    swordIcons?: number;
    towerIcons?: number;
    ability?: string;
}

export interface GameSetup {
    playerCount: number;
    houses: string[];
    blockedRegions?: string[];
    removedUnits?: string[];
    tracks?: { ironThrone?: string[]; fiefdoms?: string[]; kingsCourt?: string[] };
    houseCards?: {[key: string]: HouseCardContainer};
    units?: {[key: string]: UnitData[]};
    structuresCountNeededToWin?: number;
    maxTurns?: number;
    supplyLevels?: {[key: string]: number};
    powerTokensOnBoard?: {[key: string]: string[]};
    garrisons?: {[key: string]: number};
}

export interface GameSetupContainer {
    name: string;
    playerSetups: GameSetup[];
}

function getHouseCardData(container: {[key: string]: HouseCardContainer}): [string,HouseCardData][] {
    let result: [string,HouseCardData][] = [];
    new BetterMap(Object.entries(container)).values.forEach(container => {
        result = _.concat(result, Object.entries(container.houseCards as {[key: string]: HouseCardData}));
    });
    return result;
}

function getTrackWithAdjustedVassalPositions(track: House[], playerHouses: string[]): House[] {
    const areVassalsInTopThreeSpaces = _.take(track, 3).some(h => !playerHouses.includes(h.id));

    if (areVassalsInTopThreeSpaces) {
        const vassals = track.filter(h => !playerHouses.includes(h.id));
        const newTrack = _.without(track, ...vassals);
        newTrack.push(...vassals);
        return newTrack;
    }

    return track;
}

function createHouseCard(id: string, houseCardData: HouseCardData): HouseCard {
    return new HouseCard(
        id,
        houseCardData.name,
        houseCardData.combatStrength ? houseCardData.combatStrength : 0,
        houseCardData.swordIcons ? houseCardData.swordIcons : 0,
        houseCardData.towerIcons ? houseCardData.towerIcons : 0,
        houseCardData.ability ? houseCardAbilities.get(houseCardData.ability) : null
    );
}

export const baseHouseCardsData = getHouseCardData(baseGameData.houses);
export const adwdHouseCardsData = getHouseCardData(baseGameData.adwdHouseCards);
export const ffcHouseCardsData = getHouseCardData(baseGameData.ffcHouseCards);
export const modAHouseCardsData = getHouseCardData(baseGameData.modAHouseCards);
export const modBHouseCardsData = getHouseCardData(baseGameData.modBHouseCards);

export const allGameSetups = new BetterMap(Object.entries(baseGameData.setups as {[key: string]: GameSetupContainer}));

export function getGameSetupContainer(setupId: string): GameSetupContainer {
    if (!allGameSetups.has(setupId)) {
        throw new Error(`Invalid setupId ${setupId}. All setups: ${JSON.stringify(allGameSetups)}`);
    }

    return allGameSetups.get(setupId);
}

export default function createGame(ingame: IngameGameState, housesToCreate: string[], playerHouses: string[]): Game {
    const entireGame = ingame.entireGame;
    const gameSettings = entireGame.gameSettings;

    const game = new Game(ingame);

    const baseGameHousesToCreate = new BetterMap(
        Object.entries(baseGameData.houses as {[key: string]: HouseData})
        .filter(([hid, _]) => housesToCreate.includes(hid)));

    /* In the previous version the productive system sometimes applied the garrisons (only the garrisons,
        not the tokens on board which is weird!) of the adwd setup though only adwdHouseCards were set with another game setup.
        Don't ask me why but it seems as getting the house cards from the adwd setup makes trouble in the productive system.
        During debug this never happened! So we now define the adwd house cards in the baseGameSetup directly, not under the adwd setup
        which hopefully solves the issues (#792 #796).
     */

     // Overwrite house cards
    if (gameSettings.adwdHouseCards) {
        const adwdHouseCards = baseGameData.adwdHouseCards as {[key: string]: HouseCardContainer};
        const newHouseCards = new BetterMap(
            Object.entries(adwdHouseCards)
            .filter(([hid, _]) => housesToCreate.includes(hid)));

        newHouseCards.keys.forEach(hid => {
           const newHouseData = baseGameHousesToCreate.get(hid);
           newHouseData.houseCards = newHouseCards.get(hid).houseCards;
           baseGameHousesToCreate.set(hid, newHouseData);
        });
    }

    // Overwrite supply levels
    if (entireGame.selectedGameSetup.supplyLevels != undefined) {
        Object.entries(entireGame.selectedGameSetup.supplyLevels)
            .filter(([hid, _]) => housesToCreate.includes(hid))
            .forEach(([hid, level]) => {
                const newHouseData = baseGameHousesToCreate.get(hid);
                newHouseData.supplyLevel = level;
                baseGameHousesToCreate.set(hid, newHouseData);
        });
    }

    game.houses = new BetterMap(
        baseGameHousesToCreate.entries
        .map(([hid, houseData]) => {
            const houseCards = new BetterMap<string, HouseCard>(
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore The conversion provokes n error in the CI
                // Don't ask me why.

                Object.entries(houseData.houseCards)
                    .map(([houseCardId, houseCardData]) => {
                        const houseCard = createHouseCard(houseCardId, houseCardData);
                        return [houseCardId, houseCard];
                    })
            );

            const unitLimits = new BetterMap(
                Object.entries(houseData.unitLimits as {[key: string]: number})
                    .map(([unitTypeId, limit]) => [unitTypes.get(unitTypeId), limit])
            );

            const powerTokens = gameSettings.vassals ? playerHouses.length < entireGame.selectedGameSetup.playerCount ? 7 : 5 : 5;
            const house = new House(hid, houseData.name, houseData.color, playerHouses.includes(hid) ? houseCards : new BetterMap(), unitLimits, powerTokens, houseData.supplyLevel);

            return [hid, house];
        })
    );

    if (gameSettings.draftHouseCards) {
        const baseGameHouses = new BetterMap(Object.entries(baseGameData.houses as {[key: string]: HouseData}));
        const allBaseGameHouseCardData = _.flatMap(baseGameHouses.entries.map(([_hid, h]) => Object.entries(h.houseCards)));
        const baseGameHouseCards = allBaseGameHouseCardData.map(([hcid, hcd]) => createHouseCard(hcid, hcd));

        const adwdHouseCardContainer = Object.entries(baseGameData.adwdHouseCards as {[key: string]: HouseCardContainer});
        const allAdwdHouseCardData = _.flatMap(adwdHouseCardContainer.map(([_hid, hcc]) => Object.entries(hcc.houseCards)));
        const adwdHouseCards = allAdwdHouseCardData.map(([hcid, hcd]) => createHouseCard(hcid, hcd));

        const ffcHouseCardContainer = Object.entries(baseGameData.ffcHouseCards as {[key: string]: HouseCardContainer});
        const allFfcHouseCardData = _.flatMap(ffcHouseCardContainer.map(([_hid, hcc]) => Object.entries(hcc.houseCards)));
        const ffcHouseCards = allFfcHouseCardData.map(([hcid, hcd]) => createHouseCard(hcid, hcd));

        const modAHouseCardContainer = Object.entries(baseGameData.modAHouseCards as {[key: string]: HouseCardContainer});
        const allModAHouseCardData = _.flatMap(modAHouseCardContainer.map(([_hid, hcc]) => Object.entries(hcc.houseCards)));
        const modAHouseCards = allModAHouseCardData.map(([hcid, hcd]) => createHouseCard(hcid, hcd));

        const modBHouseCardContainer = Object.entries(baseGameData.modBHouseCards as {[key: string]: HouseCardContainer});
        const allModBHouseCardData = _.flatMap(modBHouseCardContainer.map(([_hid, hcc]) => Object.entries(hcc.houseCards)));
        const modBHouseCards = allModBHouseCardData.map(([hcid, hcd]) => createHouseCard(hcid, hcd));

        const allHouseCards = _.concat(baseGameHouseCards, adwdHouseCards, ffcHouseCards, modAHouseCards, modBHouseCards);
        game.houseCardsForDrafting = new BetterMap(allHouseCards.map(hc => [hc.id, hc]));

        game.houses.forEach(h => {
            // Reset already assigned house cards
            if (playerHouses.includes(h.id)) {
                h.houseCards = new BetterMap();
            }
        });
    }

    game.maxTurns = entireGame.selectedGameSetup.maxTurns ? entireGame.selectedGameSetup.maxTurns : baseGameData.maxTurns;
    game.structuresCountNeededToWin = entireGame.selectedGameSetup.structuresCountNeededToWin != undefined ? entireGame.selectedGameSetup.structuresCountNeededToWin : baseGameData.structuresCountNeededToWin;
    game.supplyRestrictions = baseGameData.supplyRestrictions;
    game.maxPowerTokens = MAX_POWER_TOKENS;
    game.revealedWesterosCards = gameSettings.cokWesterosPhase ? 3 : 0;

    // Load tracks starting positions
    if (entireGame.selectedGameSetup.tracks != undefined && entireGame.selectedGameSetup.tracks.ironThrone != undefined) {
        game.ironThroneTrack = entireGame.selectedGameSetup.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.ironThroneTrack = baseGameData.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (entireGame.selectedGameSetup.tracks != undefined && entireGame.selectedGameSetup.tracks.fiefdoms != undefined) {
        game.fiefdomsTrack = entireGame.selectedGameSetup.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.fiefdomsTrack = baseGameData.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (entireGame.selectedGameSetup.tracks != undefined && entireGame.selectedGameSetup.tracks.kingsCourt != undefined) {
        game.kingsCourtTrack = entireGame.selectedGameSetup.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.kingsCourtTrack = baseGameData.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    // Remove vassals from the top 3 spaces on each track
    game.ironThroneTrack = getTrackWithAdjustedVassalPositions(game.ironThroneTrack, playerHouses);
    game.fiefdomsTrack = getTrackWithAdjustedVassalPositions(game.fiefdomsTrack, playerHouses);
    game.kingsCourtTrack = getTrackWithAdjustedVassalPositions(game.kingsCourtTrack, playerHouses);

    // Loading Tiled map
    const garrisonsFromGameSetup = entireGame.selectedGameSetup.garrisons ? new BetterMap(Object.entries(entireGame.selectedGameSetup.garrisons)) : null;
    const blockedRegions = entireGame.selectedGameSetup.blockedRegions;

    const regions = new BetterMap(staticWorld.staticRegions.values.map(staticRegion => {
        const blocked = blockedRegions ? blockedRegions.includes(staticRegion.id) : false;
        const garrisonValue = garrisonsFromGameSetup ? garrisonsFromGameSetup.has(staticRegion.id) ? garrisonsFromGameSetup.get(staticRegion.id)
        : staticRegion.startingGarrison
        : staticRegion.startingGarrison;

        return [
            staticRegion.id,
            new Region(
                game,
                staticRegion.id,
                blocked ? 1000 : garrisonValue
            )
        ];
    }));

    game.world = new World(regions);

    // Load Westeros Cards
    game.westerosDecks = baseGameData.westerosCards.map(westerosDeckData => {
        let lastId = 0;

        const cards: WesterosCard[] = [];
        westerosDeckData.forEach(westerosCardData => {
            const westerosCardType = westerosCardTypes.get(westerosCardData.type);
            const quantity = westerosCardData.quantity ? westerosCardData.quantity : 1;
            for (let i = 0;i < quantity;i++) {
                const id = ++lastId;

                cards.push(new WesterosCard(id, westerosCardType));
            }
        });

        return _.shuffle(cards);
    });

    // Load Wildling deck
    let lastId = 0;
    game.wildlingDeck = baseGameData.wildlingCards.map(wildlingCardData => {
        return new WildlingCard(++lastId, wildlingCardTypes.get(wildlingCardData.type));
    });
    // Shuffle the deck
    game.wildlingDeck = _.shuffle(game.wildlingDeck);

    const units = entireGame.selectedGameSetup.units != undefined ? entireGame.selectedGameSetup.units : baseGameData.units;

    // Initialize the starting positions
    Object.entries(units).forEach(([regionId, data]) => {
        data.filter(unitData => housesToCreate.includes(unitData.house)).forEach(unitData => {
            const region = game.world.regions.get(regionId);
            const house = game.houses.get(unitData.house);
            const unitType = unitTypes.get(unitData.unitType);
            const quantity = playerHouses.includes(house.id) ? unitData.quantity : (unitData.quantityVassal ? unitData.quantityVassal : 0);

            // Check if the game setup removed units off this region
            if (entireGame.selectedGameSetup.removedUnits && entireGame.selectedGameSetup.removedUnits.includes(region.id)) {
                return;
            }

            for (let i = 0;i < quantity; i++) {
                const unit = game.createUnit(region, unitType, house);

                region.units.set(unit.id, unit);
            }
        });
    });

    game.starredOrderRestrictions = baseGameData.starredOrderRestrictions[baseGameData.starredOrderRestrictions.findIndex(
        restrictions => game.houses.size <= restrictions.length)];

    game.skipRavenPhase = false; // todo: Remove unused var

    // Apply Power tokens from game setup
    if (entireGame.selectedGameSetup.powerTokensOnBoard != undefined) {
        Object.entries(entireGame.selectedGameSetup.powerTokensOnBoard).forEach(([houseId, regions]) => {
            const house = game.houses.tryGet(houseId, null);
            regions.forEach(r => game.world.regions.get(r).controlPowerToken = house);
        });
    }

    // Init the vassal house cards
    game.vassalHouseCards = new BetterMap(vassalHouseCards.map(hc => [hc.id, hc]));

    return game;
}