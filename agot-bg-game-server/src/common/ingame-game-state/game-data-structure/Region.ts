import RegionType from "./RegionType";
import Unit, {SerializedUnit} from "./Unit";
import Point from "../../../utils/Point";
import House from "./House";
import {observable} from "mobx";
import Game from "./Game";
import regionTypes from "./regionTypes";
import BetterMap from "../../../utils/BetterMap";

export default class Region {
    id: string;
    name: string;
    type: RegionType;
    @observable units: BetterMap<number, Unit>;
    crownIcons: number;
    supplyIcons: number;
    castleLevel: number;
    garrison: number;
    superControlPowerToken: House | null;
    controlPowerToken: House | null;

    // Display attributes
    nameSlot: Point;
    unitSlot: Point;
    orderSlot: Point;
    powerTokenSlot: Point;

    get hasStructure(): boolean {
        return this.castleLevel > 0;
    }

    constructor(
        id: string, name: string, nameSlot: Point, type: RegionType,
        unitSlot: Point, orderSlot: Point, powerTokenSlot: Point, crownIcons: number, supplyIcons: number, castleLevel: number, garrison: number,
        superControlPowerToken: House | null, controlPowerToken: House | null = null, units: BetterMap<number, Unit> = new BetterMap<number, Unit>()
    ) {
        this.id = id;
        this.nameSlot = nameSlot;
        this.name = name;
        this.type = type;
        this.unitSlot = unitSlot;
        this.units = units;
        this.orderSlot = orderSlot;
        this.powerTokenSlot = powerTokenSlot;
        this.castleLevel = castleLevel;
        this.crownIcons = crownIcons;
        this.supplyIcons = supplyIcons;
        this.garrison = garrison;
        this.superControlPowerToken = superControlPowerToken;
        this.controlPowerToken = controlPowerToken;
    }

    getController(): House | null {
        if (this.units.size > 0) {
            // All units of this region should have the same allegiance.
            // Take the allegiance of the first unit and check if all units
            // have the same allegiance.
            const possibleController = this.units.values[0].allegiance;
            if (!this.units.values.every(u => u.allegiance == possibleController)) {
                throw new Error(
                    "getController was called on region \"" + this.id + "\" but multiple units of different allegiance are present in the region"
                );
            }

            return possibleController;
        } else {
            // controlPowerToken supersedes a superControlPowerToken
            if (this.controlPowerToken) {
                return this.controlPowerToken;
            } else {
                return this.superControlPowerToken;
            }
        }
    }

    serializeToClient(): SerializedRegion {
        return {
            id: this.id,
            name: this.name,
            nameSlot: this.nameSlot,
            type: this.type.id,
            unitSlot: this.unitSlot,
            orderSlot: this.orderSlot,
            powerTokenSlot: this.powerTokenSlot,
            castleLevel: this.castleLevel,
            units: this.units.values.map(u => u.serializeToClient()),
            crownIcons: this.crownIcons,
            supplyIcons: this.supplyIcons,
            garrison: this.garrison,
            superControlPowerToken: this.superControlPowerToken ? this.superControlPowerToken.id : null,
            controlPowerToken: this.controlPowerToken ? this.controlPowerToken.id : null
        }
    }

    static deserializeFromServer(game: Game, data: SerializedRegion): Region {
        const units = new BetterMap<number, Unit>(data.units.map(u => [u.id, Unit.deserializeFromServer(game, u)]));

        const region = new Region(
            data.id, data.name, data.nameSlot, regionTypes.get(data.type),
            data.unitSlot, data.orderSlot, data.powerTokenSlot, data.crownIcons, data.supplyIcons, data.castleLevel, data.garrison,
            data.superControlPowerToken ? game.houses.get(data.superControlPowerToken) : null,
            data.controlPowerToken ? game.houses.get(data.controlPowerToken) : null,
            units
        );

        units.values.forEach(u => u.region = region);

        return region;
    }
}

export interface SerializedRegion {
    id: string;
    name: string;
    nameSlot: Point;
    unitSlot: Point;
    orderSlot: Point;
    powerTokenSlot: Point;
    type: string;
    units: SerializedUnit[];
    castleLevel: number;
    crownIcons: number;
    supplyIcons: number;
    garrison: number;
    superControlPowerToken: string | null;
    controlPowerToken: string | null;
}
