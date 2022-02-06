import RegionType from "./RegionType";
import Unit, {SerializedUnit} from "./Unit";
import House from "./House";
import {observable} from "mobx";
import Game from "./Game";
import BetterMap from "../../../utils/BetterMap";
import StaticRegion from "./static-data-structure/StaticRegion";
import Point from "../../../utils/Point";
import UnitSlot from "../../../utils/unitSlot";
import _ from "lodash";
import getStaticWorld from "./static-data-structure/getStaticWorld";
import { port } from "./regionTypes";

export default class Region {
    game: Game;

    id: string;
    @observable units: BetterMap<number, Unit>;
    @observable garrison: number;
    @observable controlPowerToken: House | null;
    @observable loyaltyTokens: number;
    @observable castleModifier: number;
    @observable barrelModifier: number;
    @observable crownModifier: number;
    overwrittenSuperControlPowerToken: House | null;

    // Client-side only to support live update of planned musterings
    @observable newUnits: Unit[];
    @observable removedUnits: Unit[];


    get staticRegion(): StaticRegion {
        return getStaticWorld(this.game.ingame.entireGame.gameSettings).staticRegions.get(this.id);
    }

    get hasStructure(): boolean {
        return this.staticRegion.hasStructure;
    }

    get superControlPowerToken(): House | null {
        if (this.overwrittenSuperControlPowerToken) {
            return this.overwrittenSuperControlPowerToken;
        }

        return this.staticRegion.superControlPowerToken
            ? this.game.houses.tryGet(this.staticRegion.superControlPowerToken, null)
            : null;
    }

    get name(): string {
        return this.staticRegion.name;
    }

    get castleLevel(): number {
        return this.staticRegion.castleLevel + this.castleModifier;
    }

    get crownIcons(): number {
        return this.staticRegion.crownIcons + this.crownModifier;
    }

    get type(): RegionType {
        return this.staticRegion.type;
    }

    get supplyIcons(): number {
        return this.staticRegion.supplyIcons + this.barrelModifier;
    }

    get unitSlot(): UnitSlot {
        return this.staticRegion.unitSlot;
    }

    get orderSlot(): Point {
        return this.staticRegion.orderSlot;
    }

    get powerTokenSlot(): Point {
        return this.staticRegion.powerTokenSlot;
    }

    get castleSlot(): Point {
        return this.staticRegion.castleSlot
    }

    get improvementSlot(): UnitSlot {
        return this.staticRegion.improvementSlot;
    }

    get superLoyaltyToken(): boolean {
        return this.staticRegion.superLoyaltyToken;
    }

    get allUnits(): Unit[] {
        return _.difference(_.concat(this.units.values, this.newUnits), this.removedUnits);
    }

    constructor(
        game: Game, id: string, garrison: number, overwrittenSuperControlPowerToken: House | null, controlPowerToken: House | null = null, units: BetterMap<number, Unit> = new BetterMap<number, Unit>(),
        loyaltyTokens = 0, castleModifier = 0, barrelModifier = 0, crownModifier = 0) {
        this.game = game;
        this.id = id;
        this.units = units;
        this.garrison = garrison;
        this.controlPowerToken = controlPowerToken;
        this.loyaltyTokens = loyaltyTokens;
        this.castleModifier = castleModifier;
        this.barrelModifier = barrelModifier;
        this.crownModifier = crownModifier;
        this.overwrittenSuperControlPowerToken = overwrittenSuperControlPowerToken;
        this.newUnits = [];
        this.removedUnits = [];
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
        } else if (this.type == port) {
            // A port is controlled by the controller of the adjacent castle
            return this.game.world.getAdjacentLandOfPort(this).getController();
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
            units: this.units.values.map(u => u.serializeToClient()),
            garrison: this.garrison,
            controlPowerToken: this.controlPowerToken ? this.controlPowerToken.id : null,
            loyaltyTokens: this.loyaltyTokens,
            castleModifier: this.castleModifier,
            barrelModifier: this.barrelModifier,
            crownModifier: this.crownModifier,
            overwrittenSuperControlPowerToken: this.overwrittenSuperControlPowerToken ? this.overwrittenSuperControlPowerToken.id : null
        }
    }

    static deserializeFromServer(game: Game, data: SerializedRegion): Region {
        const units = new BetterMap<number, Unit>(data.units.map(u => [u.id, Unit.deserializeFromServer(game, u)]));

        const region = new Region(
            game, data.id, data.garrison,
            data.overwrittenSuperControlPowerToken ? game.houses.get(data.overwrittenSuperControlPowerToken) : null,
            data.controlPowerToken ? game.houses.get(data.controlPowerToken) : null,
            units,
            data.loyaltyTokens,
            data.castleModifier,
            data.barrelModifier,
            data.crownModifier
        );

        units.values.forEach(u => u.region = region);

        return region;
    }
}

export interface SerializedRegion {
    id: string;
    units: SerializedUnit[];
    garrison: number;
    controlPowerToken: string | null;
    loyaltyTokens: number;
    castleModifier: number;
    barrelModifier: number;
    crownModifier: number;
    overwrittenSuperControlPowerToken: string | null;
}
