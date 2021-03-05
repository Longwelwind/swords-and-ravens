import UnitType from "./UnitType";
import House from "./House";
import unitTypes from "./unitTypes";
import Game from "./Game";
import Region from "./Region";
import { observable } from "mobx";

export default class Unit {
    id: number;
    region: Region;
    type: UnitType;
    wounded = false;
    allegiance: House;

    // Client-side only to support live update of planned musterings
    @observable upgradedType?: UnitType;

    constructor(id: number, type: UnitType, allegiance: House) {
        this.id = id;
        this.type = type;
        this.allegiance = allegiance;
    }

    getCombatStrength(attackingAStructure: boolean): number {
        if (this.type.combatStrength) {
            return this.type.combatStrength;
        }

        if (attackingAStructure && this.type.combatStrengthOnAttackStructure) {
            return this.type.combatStrengthOnAttackStructure;
        }

        return 0;
    }

    serializeToClient(): SerializedUnit {
        return {
            id: this.id,
            type: this.type.id,
            wounded: this.wounded,
            allegiance: this.allegiance.id
        }
    }

    static deserializeFromServer(game: Game, data: SerializedUnit): Unit {
        const type = unitTypes.get(data.type);
        const allegiance = game.houses.get(data.allegiance);

        const unit = new Unit(data.id, type, allegiance);

        unit.wounded = data.wounded;

        return unit;
    }
}

export interface SerializedUnit {
    id: number;
    type: string;
    wounded: boolean;
    allegiance: string;
}
