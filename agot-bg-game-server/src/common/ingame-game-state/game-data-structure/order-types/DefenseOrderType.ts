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

    tooltipText(): string {
        return "Defense Orders grant combat strength if attacked. This bonus applies to any number of attacks against the assigned area during the same game round. Defense orders may be removed by Special Raid Orders. Adds " + this.defenseModifier + " combat strength if attacked.";
    }
}
