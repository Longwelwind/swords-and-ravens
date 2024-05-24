import * as baseGameData from "../../../../data/baseGameData.json";
import HouseCard from "./house-card/HouseCard";
import House from "./House";
import Region from "./Region";
import World from "./World";
import WesterosCard from "./westeros-card/WesterosCard";
import {fireMadeFlesh, westerosCardTypes} from "./westeros-card/westerosCardTypes";
import unitTypes, { ship } from "./unitTypes";
import Game from "./Game";
import WildlingCard from "./wildling-card/WildlingCard";
import wildlingCardTypes from "./wildling-card/wildlingCardTypes";
import BetterMap from "../../../utils/BetterMap";
import * as _ from "lodash";
import houseCardAbilities from "./house-card/houseCardAbilities";
import IngameGameState from "../IngameGameState";
import { vassalHouseCards } from "./static-data-structure/vassalHouseCards";
import getStaticWorld from "./static-data-structure/getStaticWorld";
import shuffleInPlace from "../../../utils/shuffleInPlace";
import IronBank from "./IronBank";
import loanCardTypes from "./loan-card/loanCardTypes";
import LoanCard from "./loan-card/LoanCard";
import { specialObjectiveCards } from "./static-data-structure/objectiveCards";
import popRandom from "../../../utils/popRandom";
import { HouseCardDecks } from "../../../common/EntireGame";

interface HouseCardContainer {
    houseCards: {[key: string]: HouseCardData};
}

interface WesterosCardData {
    type: string;
    quantity?: number;
    loyaltyTokens?: string[];
}

interface HouseData {
    name: string;
    color: string;
    unitLimits: {[key: string]: number};
    houseCards: {[key: string]: HouseCardData};
    laterHouseCards?: {[key: string]: HouseCardData};
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
    maxTurns?: number;
    supplyLevels?: {[key: string]: number};
    powerTokensOnBoard?: {[key: string]: string[]};
    garrisons?: {[key: string]: number};
    loyaltyTokens?: {[key: string]: number};
    westerosCards?: WesterosCardData[][];
    maxPowerTokens?: {[key: string]: number};
    superPowerTokens?: {[key: string]: string};
    dragonStrengthTokens?: number[];
    alternateDragonStrengthTokens?: number[];
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
        const vassalsAndTargaryen = track.filter(h => !playerHouses.includes(h.id) || h.id == "targaryen");
        const newTrack = _.difference(track, vassalsAndTargaryen);
        newTrack.push(...vassalsAndTargaryen);
        return newTrack;
    }

    return track;
}

function createHouseCard(id: string, houseCardData: HouseCardData, houseId: string): HouseCard {
    return new HouseCard(
        id,
        houseCardData.name,
        houseCardData.combatStrength ? houseCardData.combatStrength : 0,
        houseCardData.swordIcons ? houseCardData.swordIcons : 0,
        houseCardData.towerIcons ? houseCardData.towerIcons : 0,
        houseCardData.ability ? houseCardAbilities.get(houseCardData.ability) : null,
        houseId
    );
}

function getHouseCardSet(container: {[key: string]: HouseCardContainer}): HouseCard[] {
    const houseDatas = new BetterMap(Object.entries(container));
    const houseCardDatasMap = new BetterMap(houseDatas.entries.map(([hid, hcc]) => [hid, Object.entries(hcc.houseCards)] as [string, [string, HouseCardData][]]));
    const set: HouseCard[] = [];
    houseCardDatasMap.keys.forEach(houseId => {
        const houseCardsData = houseCardDatasMap.get(houseId);
        set.push(...houseCardsData.map(([hcid, hcd]) => createHouseCard(hcid, hcd, houseId)));
    });
    return set;
}

export const baseHouseCardsData = getHouseCardData(baseGameData.houses);
export const adwdHouseCardsData = getHouseCardData(baseGameData.adwdHouseCards);
export const ffcHouseCardsData = getHouseCardData(baseGameData.ffcHouseCards);
export const modBHouseCardsData = getHouseCardData(baseGameData.modBHouseCards);
export const asosHouseCardsData = getHouseCardData(baseGameData.asosHouseCards);

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

    const selectedGameSetup = entireGame.selectedGameSetup;

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

    const startingPositionsMap = new BetterMap(baseGameHousesToCreate.keys.filter(hid => hid != "targaryen").map(hid => [hid, hid]));
    if (gameSettings.randomStartPositions) {
        const randomizedList = shuffleInPlace(startingPositionsMap.values);
        startingPositionsMap.keys.forEach((hid, i) => startingPositionsMap.set(hid, randomizedList[i]));
    }

    // Overwrite house cards
    if (entireGame.isFeastForCrows) {
        const ffcHouseCards = new BetterMap(Object.entries(baseGameData.ffcHouseCards as {[key: string]: HouseCardContainer}));
        ffcHouseCards.keys.forEach(hid => {
            // Arryn must be part of baseGameHousesToCreate in Feast for Crows, so no need for a filter here!
            const newHouseData = baseGameHousesToCreate.get(hid);
            newHouseData.houseCards = ffcHouseCards.get(hid).houseCards;
            baseGameHousesToCreate.set(hid, newHouseData);
        });
    }

    if (gameSettings.adwdHouseCards || gameSettings.houseCardsEvolution) {
        const adwdHouseCards = baseGameData.adwdHouseCards as {[key: string]: HouseCardContainer};
        const ffcHouseCards = baseGameData.ffcHouseCards as {[key: string]: HouseCardContainer};
        const modBHouseCards = baseGameData.modBHouseCards as {[key: string]: HouseCardContainer};
        const newHouseCards = new BetterMap(
            _.concat(Object.entries(adwdHouseCards), Object.entries(ffcHouseCards), Object.entries(modBHouseCards))
            .filter(([hid, _]) => housesToCreate.includes(hid)));

        if (gameSettings.adwdHouseCards) {
            newHouseCards.keys.forEach(hid => {
                const newHouseData = baseGameHousesToCreate.get(hid);
                newHouseData.houseCards = newHouseCards.get(hid).houseCards;
                baseGameHousesToCreate.set(hid, newHouseData);
            });
        } else if (gameSettings.houseCardsEvolution) {
            newHouseCards.keys.forEach(hid => {
                const newHouseData = baseGameHousesToCreate.get(hid);
                newHouseData.laterHouseCards = newHouseCards.get(hid).houseCards;
                baseGameHousesToCreate.set(hid, newHouseData);
            });
        }
    }

    if (gameSettings.asosHouseCards) {
        const asosHouseCards = new BetterMap(Object.entries(baseGameData.asosHouseCards as {[key: string]: HouseCardContainer}));
        asosHouseCards.keys.filter(hid => housesToCreate.includes(hid)).forEach(hid => {
            const newHouseData = baseGameHousesToCreate.get(hid);
            newHouseData.houseCards = asosHouseCards.get(hid).houseCards;
            baseGameHousesToCreate.set(hid, newHouseData);
        });
    }

    // Overwrite supply levels
    if (selectedGameSetup.supplyLevels !== undefined) {
        Object.entries(selectedGameSetup.supplyLevels)
            .filter(([hid, _]) => housesToCreate.includes(hid))
            .forEach(([hid, level]) => {
                const newHouseData = baseGameHousesToCreate.get(hid);
                newHouseData.supplyLevel = level;
                baseGameHousesToCreate.set(hid, newHouseData);
        });
    }

    // Another very strange behavior I cannot explain:
    // I tried to allow defining maxPowerTokens in a generic way like I do with the overwritten super control power token
    // But for max power tokens it just doesn't work though I verified selectedGameSetup contains the maxPowerTokens node with
    // console.log(JSON.stringify(selectedGameSetup, null, 2));

    // const maxPowerTokensPerHouse = new BetterMap(selectedGameSetup.maxPowerTokens !== undefined ? Object.entries(selectedGameSetup.maxPowerTokens) : []);

    // So for now the only work around is to hard code it:
    const maxPowerTokensPerHouse = new BetterMap(entireGame.isFeastForCrows ? [["arryn", 19]] : []);

    game.houses = new BetterMap(
        baseGameHousesToCreate.entries
        .map(([hid, houseData]) => {
            const houseCards: BetterMap<string, HouseCard> = playerHouses.includes(hid)
                ? new BetterMap<string, HouseCard>(
                    Object.entries(houseData.houseCards)
                        .map(([houseCardId, houseCardData]) => {
                            const houseCard = createHouseCard(houseCardId, houseCardData, hid);
                            return [houseCardId, houseCard];
                        }))
                // Vassals have no own house cards
                : new BetterMap<string, HouseCard>();

            const laterHouseCards = playerHouses.includes(hid) && houseData.laterHouseCards
                ? new BetterMap<string, HouseCard>(
                    Object.entries(houseData.laterHouseCards)
                        .map(([houseCardId, houseCardData]) => {
                            const houseCard = createHouseCard(houseCardId, houseCardData, hid);
                            return [houseCardId, houseCard];
                        })
                )
                // Vassals have no house cards
                : null;

            const unitLimits = new BetterMap(
                Object.entries(houseData.unitLimits as {[key: string]: number})
                    .map(([unitTypeId, limit]) => [unitTypes.get(unitTypeId), limit])
            );

            // Vassals always start with a supply of 4
            const supplyLevel = playerHouses.includes(hid) ? houseData.supplyLevel : 4;

            const maxPowerTokens = maxPowerTokensPerHouse.has(hid) ? maxPowerTokensPerHouse.get(hid) : baseGameData.maxPowerTokens;

            const house = new House(hid, houseData.name, houseData.color, unitLimits,
                gameSettings.ironBank ? 7 : 5, maxPowerTokens, supplyLevel, houseCards, laterHouseCards);

            if (entireGame.isFeastForCrows) {
                const soc = specialObjectiveCards.values.find(soc => soc.houseId == house.id);
                if (!soc) {
                    throw new Error(`Special objective not found for house ${house.id}`);
                }
                house.specialObjective = soc;
            }

            return [hid, house];
        })
    );

    game.maxTurns = selectedGameSetup.maxTurns ? selectedGameSetup.maxTurns : baseGameData.maxTurns;

    if (gameSettings.endless) {
        game.maxTurns = 1000;
    }

    game.victoryPointsCountNeededToWin = gameSettings.victoryPointsCountNeededToWin;
    game.loyaltyTokenCountNeededToWin = gameSettings.loyaltyTokenCountNeededToWin;

    game.supplyRestrictions = baseGameData.supplyRestrictions;
    game.revealedWesterosCards = gameSettings.cokWesterosPhase ? 3 : 0;

    // Load tracks starting positions
    if (selectedGameSetup.tracks !== undefined && selectedGameSetup.tracks.ironThrone !== undefined) {
        game.ironThroneTrack = selectedGameSetup.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.ironThroneTrack = baseGameData.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (selectedGameSetup.tracks !== undefined && selectedGameSetup.tracks.fiefdoms !== undefined) {
        game.fiefdomsTrack = selectedGameSetup.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.fiefdomsTrack = baseGameData.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (selectedGameSetup.tracks !== undefined && selectedGameSetup.tracks.kingsCourt !== undefined) {
        game.kingsCourtTrack = selectedGameSetup.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.kingsCourtTrack = baseGameData.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    // Remove vassals from the top 3 spaces on each track
    game.ironThroneTrack = getTrackWithAdjustedVassalPositions(game.ironThroneTrack, playerHouses);
    game.fiefdomsTrack = getTrackWithAdjustedVassalPositions(game.fiefdomsTrack, playerHouses);
    game.kingsCourtTrack = getTrackWithAdjustedVassalPositions(game.kingsCourtTrack, playerHouses);

    if (gameSettings.draftHouseCards) {
        const baseGameHouseCards = getHouseCardSet(baseGameData.houses);
        const adwdHouseCards = getHouseCardSet(baseGameData.adwdHouseCards);
        const ffcHouseCards = getHouseCardSet(baseGameData.ffcHouseCards);
        const modBHouseCards = getHouseCardSet(baseGameData.modBHouseCards);
        const asosHouseCards = getHouseCardSet(baseGameData.asosHouseCards);

        const selectedHouseCards = new BetterMap<string, HouseCard>();

        if ((gameSettings.selectedDraftDecks & HouseCardDecks.BaseAndModA) == HouseCardDecks.BaseAndModA) {
            baseGameHouseCards.forEach(hc => selectedHouseCards.set(hc.id, hc));
        }

        if ((gameSettings.selectedDraftDecks & HouseCardDecks.DwdFfcModB) == HouseCardDecks.DwdFfcModB) {
            adwdHouseCards.forEach(hc => selectedHouseCards.set(hc.id, hc));
            ffcHouseCards.forEach(hc => selectedHouseCards.set(hc.id, hc));
            modBHouseCards.forEach(hc => selectedHouseCards.set(hc.id, hc));
        }

        if ((gameSettings.selectedDraftDecks & HouseCardDecks.StormOfSwords) == HouseCardDecks.StormOfSwords) {
            asosHouseCards.forEach(hc => selectedHouseCards.set(hc.id, hc));
            baseGameHouseCards.filter(hc => hc.houseId == "arryn" || hc.houseId == "targaryen").forEach(hc => selectedHouseCards.set(hc.id, hc));
        }

        if (gameSettings.limitedDraft) {
            const limited = selectedHouseCards.values.filter(hc => {
                if (!hc.houseId) {
                    return false;
                }
                return housesToCreate.includes(hc.houseId);
            });
            game.draftableHouseCards = new BetterMap(limited.map(hc => [hc.id, hc]));
        } else {
            game.draftableHouseCards = selectedHouseCards;
        }

        game.houses.forEach(h => {
            // Reset already assigned house cards
            if (playerHouses.includes(h.id)) {
                h.houseCards = new BetterMap();
            }
        });

        if (!gameSettings.thematicDraft) {
            // Remove player houses but not Targaryen from the influence tracks allowing to draft the tracks as well
            game.ironThroneTrack = game.ironThroneTrack.filter(h => !playerHouses.includes(h.id) || h.id == "targaryen");
            game.fiefdomsTrack = game.fiefdomsTrack.filter(h => !playerHouses.includes(h.id) || h.id == "targaryen");
            game.kingsCourtTrack = game.kingsCourtTrack.filter(h => !playerHouses.includes(h.id) || h.id == "targaryen");
        }
    }

    // Loading Tiled map
    const garrisonsFromGameSetup = selectedGameSetup.garrisons ? new BetterMap(Object.entries(selectedGameSetup.garrisons)) : null;
    const blockedRegions = selectedGameSetup.blockedRegions;

    const overwrittenSuperControlPowerToken = new BetterMap(selectedGameSetup.superPowerTokens !== undefined ? Object.entries(selectedGameSetup.superPowerTokens) : []);

    const regions = new BetterMap(getStaticWorld(gameSettings).staticRegions.values.map(staticRegion => {
        const blocked = blockedRegions ? blockedRegions.includes(staticRegion.id) : false;
        const garrisonValue = garrisonsFromGameSetup && garrisonsFromGameSetup.has(staticRegion.id)
            ? garrisonsFromGameSetup.get(staticRegion.id)
            : staticRegion.startingGarrison;

        let superPowerToken = overwrittenSuperControlPowerToken.has(staticRegion.id) ? game.houses.get(overwrittenSuperControlPowerToken.get(staticRegion.id)) : null;

        if (gameSettings.randomStartPositions && staticRegion.superControlPowerToken && startingPositionsMap.has(staticRegion.superControlPowerToken)) {
            const newCapitalOwner = startingPositionsMap.get(staticRegion.superControlPowerToken);
            superPowerToken = game.houses.get(newCapitalOwner);
        }

        return [
            staticRegion.id,
            new Region(
                game,
                staticRegion.id,
                blocked ? 1000 : garrisonValue,
                superPowerToken
            )
        ];
    }));

    game.world = new World(regions, gameSettings);

    // Load Westeros Cards
    let lastWesterosCardId = 0;
    game.westerosDecks = baseGameData.westerosCards.map(westerosDeckData => {
        const cards: WesterosCard[] = [];
        westerosDeckData.forEach((westerosCardData: WesterosCardData) => {
            const westerosCardType = westerosCardTypes.get(westerosCardData.type);
            const quantity = westerosCardData.quantity ? westerosCardData.quantity : 1;
            for (let i = 0;i < quantity;i++) {
                const id = ++lastWesterosCardId;

                cards.push(new WesterosCard(id, westerosCardType));
            }
        });

        return shuffleInPlace(cards);
    });

    // Apply Westeros deck changes
    if (selectedGameSetup.westerosCards !== undefined) {
        const westerosCards = selectedGameSetup.westerosCards;

        for (let i=0; i< westerosCards.length; i++) {
            if (westerosCards[i] != null) {
                const cards: WesterosCard[] = [];
                westerosCards[i].forEach((westerosCardData: WesterosCardData) => {
                    const westerosCardType = westerosCardTypes.get(westerosCardData.type);
                    const quantity = westerosCardData.quantity ? westerosCardData.quantity : 1;
                    for (let j = 0;j < quantity;j++) {
                        const id = ++lastWesterosCardId;

                        cards.push(new WesterosCard(id, westerosCardType));
                    }
                });

                shuffleInPlace(cards);

                if (game.westerosDecks[i] == undefined) {
                    game.westerosDecks.push(cards);
                } else {
                    game.westerosDecks[i] = cards;
                }
            }
        }
    }

    if (gameSettings.mixedWesterosDeck1) {
        const westerosCards = baseGameData.mixedWesterosDeck1;
        const cards: WesterosCard[] = [];
        westerosCards.forEach((westerosCardData: WesterosCardData) => {
            const westerosCardType = westerosCardTypes.get(westerosCardData.type);
            const quantity = westerosCardData.quantity ? westerosCardData.quantity : 1;
            for (let i = 0;i < quantity;i++) {
                const id = ++lastWesterosCardId;

                cards.push(new WesterosCard(id, westerosCardType));
            }
        });

        shuffleInPlace(cards);
        game.westerosDecks[0] = cards;
    }

    game.winterIsComingHappened = [];
    game.westerosDecks.forEach(_wd => game.winterIsComingHappened.push(false));

    // Load Wildling deck
    let lastWildlingCardId = 0;
    game.wildlingDeck = baseGameData.wildlingCards.map(wildlingCardData => {
        return new WildlingCard(++lastWildlingCardId, wildlingCardTypes.get(wildlingCardData.type));
    });
    // Shuffle the deck
    game.wildlingDeck = shuffleInPlace(game.wildlingDeck);

    const units = selectedGameSetup.units !== undefined ? selectedGameSetup.units : baseGameData.units;

    // Initialize the starting positions
    Object.entries(units).forEach(([regionId, data]) => {
        data.filter(unitData => housesToCreate.includes(unitData.house)).forEach(unitData => {
            const region = game.world.regions.get(regionId);
            const house = game.houses.get(gameSettings.randomStartPositions && startingPositionsMap.has(unitData.house) ? startingPositionsMap.get(unitData.house) : unitData.house);
            const unitType = unitTypes.get(unitData.unitType);
            const quantity = (!playerHouses.includes(house.id) || gameSettings.useVassalPositions) ? (unitData.quantityVassal ?? 0) : unitData.quantity;

            // Check if the game setup removed units off this region
            if (selectedGameSetup.removedUnits?.includes(region.id) || region.garrison == 1000) {
                return;
            }

            for (let i = 0;i < quantity; i++) {
                const unit = game.createUnit(region, unitType, house);
                region.units.set(unit.id, unit);
            }
        });
    });

    // Apply dragon strength tokens
    game.dragonStrengthTokens = gameSettings.customBalancing && selectedGameSetup.alternateDragonStrengthTokens !== undefined
        ? selectedGameSetup.alternateDragonStrengthTokens
        : selectedGameSetup.dragonStrengthTokens !== undefined
            ? selectedGameSetup.dragonStrengthTokens
            : [];

    if (gameSettings.customBalancing && gameSettings.setupId == "mother-of-dragons" && gameSettings.playerCount == 8) {
        // Apply the new starting positions
        Object.entries(baseGameData.customModBalancing as {[key: string]: UnitData[]}).forEach(([regionId, data]) => {
            data.filter(unitData => housesToCreate.includes(unitData.house)).forEach(unitData => {
                const region = game.world.regions.get(regionId);
                const house = game.houses.get(gameSettings.randomStartPositions && startingPositionsMap.has(unitData.house) ? startingPositionsMap.get(unitData.house) : unitData.house);
                const unitType = unitTypes.get(unitData.unitType);
                const quantity = (!playerHouses.includes(house.id) || gameSettings.useVassalPositions) ? (unitData.quantityVassal ?? 0) : unitData.quantity;

                // Remove already created units
                region.units.clear();

                for (let i = 0;i < quantity; i++) {
                    const unit = game.createUnit(region, unitType, house);
                    region.units.set(unit.id, unit);
                }
            });
        });
    } else if (gameSettings.customBalancing && gameSettings.setupId == "base-game" && gameSettings.playerCount == 6) {
        const redwyneStraights = game.world.regions.get("redwyne-straights");
        const house = redwyneStraights.units.size > 0 ? redwyneStraights.units.values[0].allegiance : null;
        if (house && playerHouses.includes(house.id)) {
            const newShip = game.createUnit(redwyneStraights, ship, house);
            redwyneStraights.units.set(newShip.id, newShip);
        }
    }

    game.starredOrderRestrictions = baseGameData.starredOrderRestrictions[baseGameData.starredOrderRestrictions.findIndex(
        restrictions => game.houses.size <= restrictions.length)];

    // Apply Power tokens from game setup
    if (selectedGameSetup.powerTokensOnBoard !== undefined) {
        Object.entries(selectedGameSetup.powerTokensOnBoard).forEach(([houseId, regions]) => {
            const house = gameSettings.randomStartPositions && startingPositionsMap.has(houseId) ? game.houses.tryGet(startingPositionsMap.get(houseId), null) : game.houses.tryGet(houseId, null);
            regions.forEach(r => game.world.regions.get(r).controlPowerToken = house);
        });
    }

    // Apply loyalty tokens
    if (selectedGameSetup.loyaltyTokens !== undefined) {
        const loyaltyTokens = new BetterMap(Object.entries(selectedGameSetup.loyaltyTokens));
        loyaltyTokens.entries.forEach(([regionId, count]) => {
            regions.get(regionId).loyaltyTokens = count;
        });
    }

    // Init the vassal house cards
    game.vassalHouseCards = new BetterMap(vassalHouseCards.map(hc => [hc.id, hc]));

    // Init the Iron Bank
    if (gameSettings.ironBank) {
        game.ironBank = new IronBank(game);

        // Load the Loan card deck
        game.ironBank.loanCardDeck = shuffleInPlace(loanCardTypes.values.map((lct, i) => new LoanCard(i, lct)));
    } else {
        game.ironBank = null;
    }

    if (gameSettings.adwdHouseCards) {
        const boltons = game.houses.tryGet("stark", null);
        if (boltons) {
            boltons.name = "Bolton";
            boltons.color = "#c59699"
        }
    }

    return game;
}

export function applyChangesForDanceWithMotherOfDragons(ingame: IngameGameState): void {
    const game = ingame.game;
    const lannister = game.houses.tryGet("lannister", null);
    if (!game.targaryen || !game.ironBank || !lannister) {
        throw new Error("Targaryen, Lannister and the Iron Bank must be present in Dance with Mother of Dragons variant");
    }
    game.targaryen.powerTokens = 9;
    game.ironBank.drawNewLoanCard();

    if (!ingame.isVassalHouse(lannister)) {
        const initialLoanForLannister = popRandom(game.ironBank.loanCardDeck) as LoanCard;
        game.ironBank.purchasedLoans.push(initialLoanForLannister);
        initialLoanForLannister.purchasedBy = lannister;
    }

    // Reshuffle WD 4 deck as long as necessary, so Fire Made Flesh is not in the top 2 cards
    // to allow revealing and resolving the top 2 cards
    while (_.some(_.take(game.westerosDecks[3], 2), wc => wc.type == fireMadeFlesh)) {
        shuffleInPlace(game.westerosDecks[3]);
    }
}