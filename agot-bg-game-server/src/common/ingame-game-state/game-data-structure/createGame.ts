import * as baseGameData from "../../../../data/baseGameData.json";
import HouseCard from "./house-card/HouseCard";
import House from "./House";
import * as westerosData from "../../../../data/westeros.json";
import Point from "../../../utils/Point";
import Region from "./Region";
import regionTypes from "./regionTypes";
import Border from "./Border";
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

interface TiledSquareObject {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties: TiledProperty[];

}

interface TiledPolygonObject {
    name: string;
    polygon: {x: number; y: number}[];
    x: number;
    y: number;
    properties: TiledProperty[];
}

interface TiledProperty {
    name: string;
    value: any;
    type: string;
}

function hasTiledProperty(properties: TiledProperty[], name: string): boolean {
    return properties.find(p => p.name == name) != null;
}

function getTiledProperty<E = string>(properties: TiledProperty[], name: string): E {
    const property = properties.find(p => p.name == name);
    if (!property) {
        throw new Error("No property with name " + name + " found");
    }

    return property.value as E;
}

function tryGetTiledProperty<E = string>(properties: TiledProperty[], name: string, defaultValue: E): E {
    const property = properties.find(p => p.name == name);
    if (!property) {
        return defaultValue;
    }

    return property.value as E;
}

interface HouseCardData {
    name: string;
    combatStrength?: number;
    swordIcons?: number;
    towerIcons?: number;
    ability?: string;
}

export default function createGame(housesToCreate: string[]): Game {
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

            const house = new House(hid, houseData.name, houseData.color, houseCards, 5, houseData.supplyLevel);

            return [hid, house];
        })
    );

    game.supplyRestrictions = baseGameData.supplyRestrictions;

    // Load tracks starting positions
    game.ironThroneTrack = baseGameData.tracks.ironThrone.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    game.fiefdomsTrack = baseGameData.tracks.fiefdoms.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));
    game.kingsCourtTrack = baseGameData.tracks.kingsCourt.filter(hid => housesToCreate.includes(hid)).map(hid => game.houses.get(hid));

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
    const regionsLayer = westerosData.layers.find(l => l.name == "Regions");
    if (!regionsLayer) {
        throw new Error("No layer named Regions in map file");
    }

    const bordersLayer = westerosData.layers.find(l => l.name == "Borders");
    if (!bordersLayer) {
        throw new Error("No layer named Borders in map file");
    }

    const unitSlotsLayer = westerosData.layers.find(l => l.name == "Unit Slots");
    if (!unitSlotsLayer) {
        throw new Error("No layer named Unit Slots in map file");
    }

    const orderSlotsLayer = westerosData.layers.find(l => l.name == "Order Slots");
    if (!orderSlotsLayer) {
        throw new Error("No layer named Order Slots in map file");
    }

    const powerTokenSlotsLayer = westerosData.layers.find(l => l.name == "Power Token Slots");
    if (!powerTokenSlotsLayer) {
        throw new Error("No layer named Power Token Slots in map file");
    }

    const regionIdToUnitSlots = new BetterMap<string, Point>();
    (unitSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
        const regionId = getTiledProperty(o.properties, "region");

        if (regionIdToUnitSlots.has(regionId)) {
            throw new Error("Two unit slots share the same regionId: " + regionId);
        }

        regionIdToUnitSlots.set(regionId, {
            x: o.x + o.width / 2,
            y: o.y + o.height / 2
        });
    });

    const regionIdToOrderSlots = new BetterMap<string, Point>();
    (orderSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
        const regionId = getTiledProperty(o.properties, "region");

        if (regionIdToOrderSlots.has(regionId)) {
            throw new Error("Two order slots share the same regionId: " + regionId);
        }

        regionIdToOrderSlots.set(regionId, {
            x: o.x + o.width / 2,
            y: o.y + o.height / 2
        });
    });

    const regionIdToPowerTokenSlots = new BetterMap<string, Point>();
    (powerTokenSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
        const regionId = getTiledProperty(o.properties, "region");

        if (regionIdToPowerTokenSlots.has(regionId)) {
            throw new Error("Two power token slots share the same regionId: " + regionId);
        }

        regionIdToPowerTokenSlots.set(regionId, {
            x: o.x + o.width / 2,
            y: o.y + o.height / 2
        });
    });

    const regions = new BetterMap<string, Region>((regionsLayer.objects as TiledSquareObject[]).map(regionData => {
        const x = regionData.x + regionData.width / 2;
        const y = regionData.y + regionData.height / 2;
        const id = getTiledProperty(regionData.properties, "id");
        const type = getTiledProperty(regionData.properties, "type");
        const crownIcons = tryGetTiledProperty<number>(regionData.properties, "crownIcons", 0);
        const supplyIcons = tryGetTiledProperty<number>(regionData.properties, "supplyIcons", 0);
        const castleLevel = tryGetTiledProperty<number>(regionData.properties, "castleLevel", 0);
        const garrison = tryGetTiledProperty<number>(regionData.properties, "garrison", 0);
        const superControlPowerTokenHouseId = tryGetTiledProperty<string | null>(regionData.properties, "superController", null);

        const superControlPowerToken = superControlPowerTokenHouseId && housesToCreate.includes(superControlPowerTokenHouseId)
            ? game.houses.get(superControlPowerTokenHouseId)
            : null;

        if (!regionIdToUnitSlots.has(id)) {
            throw new Error("No unit slots for region id: " + id);
        }

        const unitSlot = regionIdToUnitSlots.get(id);
        const orderSlot = regionIdToOrderSlots.get(id);
        const powerTokenSlot = regionIdToPowerTokenSlots.get(id);

        return [
            id,
            new Region(
                id, regionData.name, {x, y}, regionTypes.get(type), unitSlot, orderSlot, powerTokenSlot, crownIcons,
                supplyIcons, castleLevel, garrison, superControlPowerToken
            )
        ];
    }));

    const borders = (bordersLayer.objects as TiledPolygonObject[]).map(borderData => {
        const from = regions.get(getTiledProperty(borderData.properties, "from"));
        const to = hasTiledProperty(borderData.properties, "to")
            ? regions.get(getTiledProperty(borderData.properties, "to"))
            : null;

        const polygon = borderData.polygon.map(pos => ({x: pos.x + borderData.x, y: pos.y + borderData.y}));

        return new Border(from, to, polygon);
    });

    game.world = new World(regions, borders);

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

            for (let i = 0;i < quantity;i++) {
                const unit = game.createUnit(unitType, house);

                region.units.set(unit.id, unit);
            }
        });
    });

    game.starredOrderRestrictions = baseGameData.starredOrderRestrictions;

    game.skipRavenPhase = false;

    return game;
}
