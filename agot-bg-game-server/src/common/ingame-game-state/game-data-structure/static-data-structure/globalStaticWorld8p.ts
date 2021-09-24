import * as westerosWithEssosData from "../../../../../data/westeros-with-essos.json";
import BetterMap from "../../../../utils/BetterMap";
import Point from "../../../../utils/Point";
import StaticBorder from "./StaticBorder";
import StaticWorld from "./StaticWorld";
import StaticRegion from "./StaticRegion";
import regionTypes from "../regionTypes";
import UnitSlot from "../../../../utils/unitSlot";
import { getTiledProperty, hasTiledProperty, TiledPolygonObject, TiledSquareObject, tryGetTiledProperty } from "./globalStaticWorld";
import StaticIronBankView from "./StaticIronBankView";

// Load the regions from the JSON files
const regionsLayer = westerosWithEssosData.layers.find(l => l.name == "Regions");
if (!regionsLayer) {
    throw new Error("No layer named Regions in map file");
}

const bordersLayer = westerosWithEssosData.layers.find(l => l.name == "Borders");
if (!bordersLayer) {
    throw new Error("No layer named Borders in map file");
}

const unitSlotsLayer = westerosWithEssosData.layers.find(l => l.name == "Unit Slots");
if (!unitSlotsLayer) {
    throw new Error("No layer named Unit Slots in map file");
}

const orderSlotsLayer = westerosWithEssosData.layers.find(l => l.name == "Order Slots");
if (!orderSlotsLayer) {
    throw new Error("No layer named Order Slots in map file");
}

const powerTokenSlotsLayer = westerosWithEssosData.layers.find(l => l.name == "Power Token Slots");
if (!powerTokenSlotsLayer) {
    throw new Error("No layer named Power Token Slots in map file");
}

const ironBankSlotsLayer = westerosWithEssosData.layers.find(l => l.name == "Iron Bank");
if (!ironBankSlotsLayer) {
    throw new Error("No layer named Iron Bank in map file");
}

const improvementSlotsLayer = westerosWithEssosData.layers.find(l => l.name == "Improvement Slots");
if (!improvementSlotsLayer) {
    throw new Error("No layer named Improvement Slots in map file");
}

const castleSlotsLayer = westerosWithEssosData.layers.find(l => l.name == "Castle Slots");
if (!castleSlotsLayer) {
    throw new Error("No layer named Castle Slots in map file");
}

const regionIdToUnitSlots = new BetterMap<string, UnitSlot>();
(unitSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
    const regionId = getTiledProperty(o.properties, "region");

    if (regionIdToUnitSlots.has(regionId)) {
        throw new Error("Two unit slots share the same regionId: " + regionId);
    }

    regionIdToUnitSlots.set(regionId, {
        point: {
            x: o.x + o.width / 2,
            y: o.y + o.height / 2
        },
        width: o.width
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

const regionIdToImprovementSlots = new BetterMap<string, UnitSlot>();
(improvementSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
    const regionId = getTiledProperty(o.properties, "region");

    if (regionIdToImprovementSlots.has(regionId)) {
        throw new Error("Two improvement slots share the same regionId: " + regionId);
    }

    regionIdToImprovementSlots.set(regionId, {
        point: {
            x: o.x + o.width / 2,
            y: o.y + o.height / 2
        },
        width: o.width
    });
});


const regionIdToCastleSlots = new BetterMap<string, Point>();
(castleSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
    const regionId = getTiledProperty(o.properties, "region");

    if (regionIdToCastleSlots.has(regionId)) {
        throw new Error("Two castle slots share the same regionId: " + regionId);
    }

    regionIdToCastleSlots.set(regionId, {
        x: o.x + o.width / 2,
        y: o.y + o.height / 2
    });
});

const regions = new BetterMap<string, StaticRegion>((regionsLayer.objects as TiledSquareObject[]).map(regionData => {
    const x = regionData.x + regionData.width / 2;
    const y = regionData.y + regionData.height / 2;
    const id = getTiledProperty(regionData.properties, "id");
    const type = getTiledProperty(regionData.properties, "type");
    const crownIcons = tryGetTiledProperty<number>(regionData.properties, "crownIcons", 0);
    const supplyIcons = tryGetTiledProperty<number>(regionData.properties, "supplyIcons", 0);
    const castleLevel = tryGetTiledProperty<number>(regionData.properties, "castleLevel", 0);
    const garrison = tryGetTiledProperty<number>(regionData.properties, "garrison", 0);
    const superControlPowerToken = tryGetTiledProperty<string | null>(regionData.properties, "superController", null);
    const superLoyaltyToken = tryGetTiledProperty<boolean>(regionData.properties, "superLoyaltyToken", false);
    const canRegainGarrison = tryGetTiledProperty<boolean>(regionData.properties, "canRegainGarrison", false);

    if (!regionIdToUnitSlots.has(id)) {
        throw new Error("No unit slot for region id: " + id);
    }

    if (!regionIdToOrderSlots.has(id)) {
        throw new Error("No order slot for region id: " + id);
    }

    if (!regionIdToPowerTokenSlots.has(id)) {
        throw new Error("No power token slot for region id: " + id);
    }

    if (!regionIdToImprovementSlots.has(id)) {
        throw new Error("No improvement slot for region id: " + id);
    }

    const unitSlot = regionIdToUnitSlots.get(id);
    const orderSlot = regionIdToOrderSlots.get(id);
    const powerTokenSlot = regionIdToPowerTokenSlots.get(id);
    const improvementSlot = regionIdToImprovementSlots.get(id);
    const castleSlot = regionIdToCastleSlots.has(id) ? regionIdToCastleSlots.get(id) : {x: 50, y: 50};

    return [
        id,
        new StaticRegion(
            id, regionData.name, {x, y}, regionTypes.get(type), unitSlot, orderSlot, powerTokenSlot, crownIcons,
            supplyIcons, castleLevel, garrison, superControlPowerToken, superLoyaltyToken, canRegainGarrison,
            improvementSlot, castleSlot
        )
    ];
}));

const borders = (bordersLayer.objects as TiledPolygonObject[]).map(borderData => {
    const from = regions.get(getTiledProperty(borderData.properties, "from"));
    const to = hasTiledProperty(borderData.properties, "to")
        ? regions.get(getTiledProperty(borderData.properties, "to"))
        : null;

    const polygon = borderData.polygon.map(pos => ({x: pos.x + borderData.x, y: pos.y + borderData.y}));

    return new StaticBorder(from, to, polygon);
});

const ironBankSlots = new StaticIronBankView();
(ironBankSlotsLayer.objects as TiledSquareObject[]).forEach(o => {
    const type = getTiledProperty(o.properties, "type");
    const index = hasTiledProperty(o.properties, "index") ? getTiledProperty<number>(o.properties, "index") : null;
    if (type == "loan-card" && index != null) {
        if (index == -1) {
            ironBankSlots.deckSlot = { point: {
                x: o.x + o.width / 2, y: o.y + o.height / 2
            }, width: o.width, height: o.height };
        } else {
            ironBankSlots.loanSlots[index] = { point: {
                x: o.x + o.width / 2, y: o.y + o.height / 2
            }, width: o.width, height: o.height };
        }
    } else if (type == "iron-bank-infos") {
        ironBankSlots.infoComponentSlot = { point: {
            x: o.x, y: o.y
        }, width: o.width, height: o.height };
    }
});

const staticWorld8p = new StaticWorld(regions, borders, ironBankSlots);

export default staticWorld8p;
