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
import EntireGame from "../../EntireGame";
import staticWorld from "./static-data-structure/globalStaticWorld";

const MAX_POWER_TOKENS = 20;

interface HouseCardData {
    name: string;
    combatStrength?: number;
    swordIcons?: number;
    towerIcons?: number;
    ability?: string;
}

export interface GameSetupContainer {
    name: string;
    playerSetups: GameSetup[];
}

export interface GameSetup {
    playerCount: number;
    houses: string[];
    blockedRegions?: string[];
    removedUnits?: string[];
    tracks?: { ironThrone?: string[]; fiefdoms?: string[]; kingsCourt?: string[] };
}

export default function createGame(entireGame: EntireGame, housesToCreate: string[]): Game {
    const gameSetup = entireGame.getSelectedGameSetup();

    const game = new Game();

    game.houses = new BetterMap(Object.entries(baseGameData.houses)
        .filter(([hid, _]) => housesToCreate.includes(hid))
        .map(([hid, houseData]) => {
            const houseCards = new BetterMap<string, HouseCard>(
                // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                // @ts-ignore The conversion provokes n error in the CI
                // Don't ask me why.
                Object.entries(houseData.houseCards as {[key: string]: HouseCardData})
                    .map(([houseCardId, houseCardData]) => {
                        const houseCard = new HouseCard(
                            houseCardId,
                            houseCardData.name,
                            houseCardData.combatStrength ? houseCardData.combatStrength : 0,
                            houseCardData.swordIcons ? houseCardData.swordIcons : 0,
                            houseCardData.towerIcons ? houseCardData.towerIcons : 0,
                            houseCardData.ability ? houseCardAbilities.get(houseCardData.ability) : null
                        );

                        return [houseCardId, houseCard];
                    })
            );
            const unitLimits = new BetterMap(
                Object.entries(houseData.unitLimits as {[key: string]: number})
                    .map(([unitTypeId, limit]) => [unitTypes.get(unitTypeId), limit])
            );

            const house = new House(hid, houseData.name, houseData.color, houseCards, unitLimits, 5, houseData.supplyLevel);

            return [hid, house];
        })
    );

    game.maxTurns = baseGameData.maxTurns;
    game.structuresCountNeededToWin = baseGameData.structuresCountNeededToWin;
    game.supplyRestrictions = baseGameData.supplyRestrictions;
    game.maxPowerTokens = MAX_POWER_TOKENS;

    game.revealedWesterosCards = entireGame.gameSettings.cokWesterosPhase ? 3 : 0;

    // Load tracks starting positions
    if (gameSetup.tracks && gameSetup.tracks.ironThrone) {
        game.ironThroneTrack = gameSetup.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.ironThroneTrack = baseGameData.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (gameSetup.tracks && gameSetup.tracks.fiefdoms) {
        game.fiefdomsTrack = gameSetup.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.fiefdomsTrack = baseGameData.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (gameSetup.tracks && gameSetup.tracks.kingsCourt) {
        game.kingsCourtTrack = gameSetup.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    } else {
        game.kingsCourtTrack = baseGameData.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    }

    if (game.ironThroneTrack.length != game.houses.size) {
        throw new Error("Size of ironThrone track is not equal to the number of houses");
    }
    if (game.fiefdomsTrack.length != game.houses.size) {
        throw new Error("Size of fiefdoms track is not equal to the number of houses");
    }
    if (game.kingsCourtTrack.length != game.houses.size) {
        throw new Error("Size of kingsCourt track is not equal to the number of houses");
    }

    // Loading Tiled map
    const regions = new BetterMap(staticWorld.staticRegions.values.map(staticRegion => {
        const blocked = gameSetup.blockedRegions ? gameSetup.blockedRegions.includes(staticRegion.id) : false;

        return [
            staticRegion.id,
            new Region(
                game,
                staticRegion.id,
                blocked ? 1000 : staticRegion.startingGarrison
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

    // Initialize the starting positions
    Object.entries(baseGameData.units).forEach(([regionId, data]) => {
        data.filter(unitData => housesToCreate.includes(unitData.house)).forEach(unitData => {
            const region = game.world.regions.get(regionId);
            const house = game.houses.get(unitData.house);
            const unitType = unitTypes.get(unitData.unitType);
            const quantity = unitData.quantity;

            // Check if the game setup removed units off this region
            if (gameSetup.removedUnits && gameSetup.removedUnits.includes(region.id)) {
                return;
            }

            for (let i = 0;i < quantity;i++) {
                const unit = game.createUnit(region, unitType, house);

                region.units.set(unit.id, unit);
            }
        });
    });

    game.starredOrderRestrictions = baseGameData.starredOrderRestrictions[baseGameData.starredOrderRestrictions.findIndex(
        restrictions => game.houses.size <= restrictions.length)];

    game.skipRavenPhase = false;

    return game;
}
