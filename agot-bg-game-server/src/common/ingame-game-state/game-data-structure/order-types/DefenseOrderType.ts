import OrderType from "./OrderType";

export default class DefenseOrderType extends OrderType {
    defenseModifier: number;

    constructor(id: string, name: string, starred = false, defenseModifier = 0) {
        super(id, name, starred);
        this.defenseModifier = defenseModifier;
    }

    toString(): string {
        return "D" + (this.defenseModifier > 0 ? "+" + this.defenseModifier : this.defenseModifier < 0 ? this.defenseModifier : "");
    }

}
