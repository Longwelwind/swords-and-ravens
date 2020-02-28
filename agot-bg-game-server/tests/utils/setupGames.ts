import EntireGame, {SerializedEntireGame} from "../../src/common/EntireGame";
import {SerializedIngameGameState} from "../../src/common/ingame-game-state/IngameGameState";
import {land, sea} from "../../src/common/ingame-game-state/game-data-structure/regionTypes";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import {SerializedRegion} from "../../src/common/ingame-game-state/game-data-structure/Region";
import {SerializedUnit} from "../../src/common/ingame-game-state/game-data-structure/Unit";
import RegionType from "../../src/common/ingame-game-state/game-data-structure/RegionType";
import GlobalContext from "./GlobalContext";
import * as _ from "lodash";
import PartialRecursive from "../../src/utils/PartialRecursive";
import BetterMap from "../../src/utils/BetterMap";
import {
    HouseCardState,
    SerializedHouseCard
} from "../../src/common/ingame-game-state/game-data-structure/house-card/HouseCard";

function setup4PlayersGame(serializedEntireGameChildGameState: SerializedEntireGame["childGameState"]): GlobalContext<any> {
    const serializedEntireGame: SerializedEntireGame = {
        id: "1",
        name: "Test game",
        ownerUserId: "1",
        publicChatRoomId: "1",
        gameSettings: {pbem: false},
        privateChatRoomIds: [],
        users: [
            {
                id: "1",
                name: "1",
                settings: {pbemMode: false}
            },
            {
                id: "2",
                name: "2",
                settings: {pbemMode: false}
            },
            {
                id: "3",
                name: "3",
                settings: {pbemMode: false}
            },
            {
                id: "4",
                name: "4",
                settings: {pbemMode: false}
            }
        ],
        childGameState: serializedEntireGameChildGameState
    };

    const masterEntireGame = EntireGame.deserializeFromServer(serializedEntireGame);
    const users = masterEntireGame.users.values;

    const clientEntireGames = new BetterMap(users.map(u => {
        // The version of the game that will be held by each client and will be updated by
        // the messages sent by the server
        const localEntireGame = EntireGame.deserializeFromServer(masterEntireGame.serializeToClient(u));
        // Route the ClientMessage from this local instance to the master instance
        localEntireGame.onSendClientMessage = (message) => {
            masterEntireGame.onClientMessage(u, message);
        };
        // The local instance should never try to send ServerMessage
        localEntireGame.onSendServerMessage = (user, message) => {
            fail(`Local instance tried to send a Server Message: ${message.type}`);
        };

        return [u.id, localEntireGame];
    }));

    // Route the ServerMessage to the local instance
    masterEntireGame.onSendServerMessage = (users, message) => {
        users.forEach(u => clientEntireGames.get(u.id).onServerMessage(message));
    };
    // The master instance should never try to send ClientMessage
    masterEntireGame.onSendClientMessage = (message) => {
        fail(`Master instance tried to send a client message: ${message.type}`);
    };

    // Return something convenient for the test suite to use
    return new GlobalContext(masterEntireGame, clientEntireGames);
}

function createSerializedRegion(id: string, type: RegionType, crownIcons: number, supplyIcons: number, castleLevels: number, garrison: number, units: SerializedUnit[]): SerializedRegion {
    return {
        id: id,
        name: "Not necessary",
        nameSlot: {x: 0, y: 0},
        unitSlot: {x: 0, y: 0},
        orderSlot: {x: 0, y: 0},
        powerTokenSlot: {x: 0, y: 0},
        type: type.id,
        units: units,
        crownIcons: crownIcons,
        garrison: garrison,
        supplyIcons: supplyIcons,
        castleLevel: castleLevels,
        superControlPowerToken: null,
        controlPowerToken: null
    };
}

function createSerializedHouseCard(
    id: string,
    combatStrength: number,
    swordIcons: number,
    towerIcons: number,
    abilityId: string | null,
    state: HouseCardState
): [string, SerializedHouseCard] {
    return [
        id,
        {
            id: id,
            name: "Not important",
            combatStrength: combatStrength,
            swordIcons: swordIcons,
            towerIcons: towerIcons,
            abilityId: abilityId,
            state: state
        }
    ];
}

function setup4PlayersGameIngame(
    serializedIngameChildGameState: SerializedIngameGameState["childGameState"],
    userSetupOptions: PartialRecursive<SetupOptions>
): GlobalContext<any> {
    const setupOptions: SetupOptions = _.defaultsDeep(userSetupOptions, {
        houses: {
            stark: {powerTokens: 5, supplyLevel: 1, houseCards: []},
            baratheon: {powerTokens: 5, supplyLevel: 1, houseCards: []},
            greyjoy: {powerTokens: 5, supplyLevel: 1, houseCards: []},
            lannister: {powerTokens: 5, supplyLevel: 1, houseCards: []},
        },
        regions: {
            "the-reach": {garrison: 0},
            "blackwater": {garrison: 0},
            "kings-landing": {garrison: 0},
            "blackwater-bay": {garrison: 0},
            "shipbreaker-bay": {garrison: 0},
            "dragonstone": {garrison: 0}
        },
        units: {},
        ironThroneTrack: ["lannister", "stark", "baratheon", "greyjoy"],
        fiefdomsTrack: ["lannister", "stark", "baratheon", "greyjoy"],
        kingsCourtTrack: ["lannister", "stark", "baratheon", "greyjoy"],
        firstWesterosDeck: [{type: "last-days-of-summer"}],
        secondWesterosDeck: [{type: "last-days-of-summer"}],
        thirdWesterosDeck: [{type: "last-days-of-summer"}],
        wildlingStrength: 2,
        wildlingDeck: [{type: "silence-at-the-wall"}],
        // By default, deactivate the raven phase because it's annoying
        // to handle in each test suite when it begins from the planning phase.
        skipRavenPhase: true
    });

    let lastUnitId = -1;
    const createUnits = (regionId: string) => {
        if (setupOptions.units.hasOwnProperty(regionId)) {
            return setupOptions.units[regionId].map(u => ({
                id: ++lastUnitId,
                type: u.type,
                allegiance: u.allegiance,
                wounded: u.wounded != undefined ? u.wounded : false
            }));
        } else {
            return [];
        }
    };

    let lastWesterosCardId = -1;
    const createWesterosDeck = (deck: {type: string}[]) => {
        return deck.map(c => ({id: ++lastWesterosCardId, typeId: c.type, discarded: false}))
    };

    let lastWildlingCardId = -1;

    const createSerializedHouse = (id: string, name: string) => {
        if (!_.has(setupOptions.houses, id)) {
            throw new Error(`setupOptions.houses doesn't have id ${id}`);
        }

        const houseObject = setupOptions.houses[id];

        return {
            id: id,
            name: name,
            color: "not important",
            powerTokens: houseObject.powerTokens,
            supplyLevel: houseObject.supplyLevel,
            houseCards: houseObject.houseCards.map(hco =>
                createSerializedHouseCard(
                    hco.id, hco.combatStrength ? hco.combatStrength : 0, hco.swordIcons ? hco.swordIcons : 0,
                    hco.towerIcons ? hco.towerIcons : 0, hco.abilityId ? hco.abilityId : null,
                    hco.state ? hco.state : HouseCardState.AVAILABLE
                )
            ),
            unitLimits: [
                ["footman", 10],
                ["knight", 5],
                ["ship", 6],
                ["siege-engine", 2]
            ] as [string, number][]
        };
    };

    const serializedIngame: SerializedIngameGameState = {
        type: "ingame",
        players: [
            {
                userId: "1",
                houseId: "lannister"
            },
            {
                userId: "2",
                houseId: "stark"
            },
            {
                userId: "3",
                houseId: "baratheon"
            },
            {
                userId: "4",
                houseId: "greyjoy"
            }
        ],
        game: {
            maxTurns: 10,
            structuresCountNeededToWin: 7,
            lastUnitId: -1,
            wildlingStrength: setupOptions.wildlingStrength,
            wildlingDeck: setupOptions.wildlingDeck.map(c => ({id: ++lastWildlingCardId, type: c.type})),
            starredOrderRestrictions: [3, 3, 2, 1],
            houses: [
                createSerializedHouse("lannister", "Lannister"),
                createSerializedHouse("stark", "Stark"),
                createSerializedHouse("baratheon", "Baratheon"),
                createSerializedHouse("greyjoy", "Greyjoy"),
            ],
            supplyRestrictions: [
                [2, 2],
                [3, 2],
                [3, 2, 2],
                [3, 2, 2, 2],
                [3, 3, 2, 2],
                [4, 3, 2, 2],
                [4, 3, 2, 2, 2]
            ],
            world: {
                regions: [
                    createSerializedRegion("the-reach", land, 0, 2, 0, setupOptions.regions["the-reach"].garrison, createUnits("the-reach")),
                    createSerializedRegion("blackwater", land, 0, 0, 0, setupOptions.regions["blackwater"].garrison, createUnits("blackwater")),
                    createSerializedRegion("kings-landing", land, 2, 0, 2, setupOptions.regions["kings-landing"].garrison, createUnits("kings-landing")),
                    createSerializedRegion("blackwater-bay", sea, 0, 0, 0, setupOptions.regions["blackwater-bay"].garrison, createUnits("blackwater-bay")),
                    createSerializedRegion("shipbreaker-bay", sea, 0, 0, 0, setupOptions.regions["shipbreaker-bay"].garrison, createUnits("shipbreaker-bay")),
                    createSerializedRegion("dragonstone", land, 0, 0, 2, setupOptions.regions["dragonstone"].garrison, createUnits("dragonstone")),
                ],
                borders: [
                    {fromRegionId: "the-reach", toRegionId: "blackwater", polygon: []},
                    {fromRegionId: "blackwater", toRegionId: "kings-landing", polygon: []},
                    {fromRegionId: "kings-landing", toRegionId: "blackwater", polygon: []},
                    {fromRegionId: "blackwater-bay", toRegionId: "kings-landing", polygon: []},
                    {fromRegionId: "the-reach", toRegionId: "kings-landing", polygon: []},
                    {fromRegionId: "dragonstone", toRegionId: "shipbreaker-bay", polygon: []},
                    {fromRegionId: "shipbreaker-bay", toRegionId: "blackwater-bay", polygon: []}
                ]
            },
            turn: 1,
            ironThroneTrack: setupOptions.ironThroneTrack,
            fiefdomsTrack: setupOptions.fiefdomsTrack,
            kingsCourtTrack: setupOptions.kingsCourtTrack,
            westerosDecks: [
                createWesterosDeck(setupOptions.firstWesterosDeck),
                createWesterosDeck(setupOptions.secondWesterosDeck),
                createWesterosDeck(setupOptions.thirdWesterosDeck)
            ],
            skipRavenPhase: setupOptions.skipRavenPhase
        },
        gameLogManager: {
            logs: []
        },
        childGameState: serializedIngameChildGameState
    };
    serializedIngame.game.lastUnitId = lastUnitId;

    return setup4PlayersGame(serializedIngame);
}

export function setupAtPlanningGameState(
    userSetupOptions: PartialRecursive<SetupOptions>
): GlobalContext<PlanningGameState> {
    return setup4PlayersGameIngame({
        type: "planning",
        placedOrders: [],
        readyPlayers: [],
        planningRestrictions: [],
        bypassCanReady: true
    }, userSetupOptions).expectGameState<PlanningGameState>(PlanningGameState);
}

export interface SetupOptions {
    houses: {[houseId: string]: SetupOptionsHouse};
    units: {[regionId: string]: {type: string; allegiance: string; wounded?: boolean}[]};
    regions: {[regionId: string]: SetupOptionsRegion};
    ironThroneTrack: string[];
    fiefdomsTrack: string[];
    kingsCourtTrack: string[];
    firstWesterosDeck: {type: string}[];
    secondWesterosDeck: {type: string}[];
    thirdWesterosDeck: {type: string}[];
    wildlingStrength: number;
    wildlingDeck: {type: string}[];
    skipRavenPhase: boolean;
}

interface SetupOptionsHouse {
    supplyLevel: number;
    powerTokens: number;
    houseCards: SetupOptionsHouseCard[];
}

interface SetupOptionsRegion {
    garrison: number;
}

interface SetupOptionsHouseCard {
    id: string;
    combatStrength?: number;
    swordIcons?: number;
    towerIcons?: number;
    abilityId?: string;
    state: HouseCardState;
}
