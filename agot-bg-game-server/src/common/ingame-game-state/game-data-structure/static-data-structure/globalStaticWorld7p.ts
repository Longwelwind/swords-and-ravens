import * as westeros7pData from "../../../../../data/westeros-7p.json";
import BetterMap from "../../../../utils/BetterMap";
import Point from "../../../../utils/Point";
import StaticBorder from "./StaticBorder";
import StaticWorld from "./StaticWorld";
import StaticRegion from "./StaticRegion";
import regionTypes from "../regionTypes";
import UnitSlot from "../../../../utils/unitSlot";
import { getTiledProperty, hasTiledProperty, TiledPolygonObject, TiledSquareObject, tryGetTiledProperty } from "./globalStaticWorld";

// Load the regions from the JSON files
const regionsLayer = westeros7pData.layers.find(l => l.name == "Regions");
if (!regionsLayer) {
    throw new Error("No layer named Regions in map file");
}

const bordersLayer = westeros7pData.layers.find(l => l.name == "Borders");
if (!bordersLayer) {
    throw new Error("No layer named Borders in map file");
}

const unitSlotsLayer = westeros7pData.layers.find(l => l.name == "Unit Slots");
if (!unitSlotsLayer) {
    throw new Error("No layer named Unit Slots in map file");
}

const orderSlotsLayer = westeros7pData.layers.find(l => l.name == "Order Slots");
if (!orderSlotsLayer) {
    throw new Error("No layer named Order Slots in map file");
}

const powerTokenSlotsLayer = westeros7pData.layers.find(l => l.name == "Power Token Slots");
if (!powerTokenSlotsLayer) {
    throw new Error("No layer named Power Token Slots in map file");
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

const regions = new BetterMap<string, StaticRegion>((regionsLayer.objects as TiledSquareObject[]).map(regionData => {
    const x = regionData.x + regionData.width / 2;
    const y = regionData.y + regionData.height / 2;
    const id = getTiledProperty(regionData.properties, "id");
    const type = getTiledProperty(regionData.properties, "type");
    const crownIcons = tryGetTiledProperty<number>(regionData.properties, "crownIcons", 0);
    const supplyIcons = tryGetTiledProperty<number>(regionData.properties, "supplyIcons", 0);
    const castleLevel = tryGetTiledProperty<number>(regionData.properties, "castleLevel", 0);
    const garrison = tryGetTiledProperty<number>(regionData.properties, "garrison", 0);
    const superControlPowerTokenHouseId = tryGetTiledProperty<string | null>(regionData.properties, "superController", null);

    const superControlPowerToken = superControlPowerTokenHouseId;

    if (!regionIdToUnitSlots.has(id)) {
        throw new Error("No unit slots for region id: " + id);
    }

    const unitSlot = regionIdToUnitSlots.get(id);
    const orderSlot = regionIdToOrderSlots.get(id);
    const powerTokenSlot = regionIdToPowerTokenSlots.get(id);

    return [
        id,
        new StaticRegion(
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

    return new StaticBorder(from, to, polygon);
});

const staticWorld7p = new StaticWorld(regions, borders);

export default staticWorld7p;
