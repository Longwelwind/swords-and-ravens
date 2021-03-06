import OrderType from "./OrderType";

export default class DefenseMusterOrderType extends OrderType {
    defenseModifier: number;

    constructor(id: string, name: string, starred = false, defenseModifier = 0) {
        super(id, name, starred);
        this.defenseModifier = defenseModifier;
    }
}
