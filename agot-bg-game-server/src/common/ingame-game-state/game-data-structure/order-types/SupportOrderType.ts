import OrderType from "./OrderType";

export default class SupportOrderType extends OrderType {
    supportModifier: number;

    constructor(id: string, name: string, starred = false, supportModifier = 0) {
        super(id, name, starred);
        this.supportModifier = supportModifier;
    }

    toString(): string {
        return "S" + (this.supportModifier != 0 ? "+" + this.supportModifier : "");
    }

    tooltipText(): string {
        let tooltip = "Support Orders can provide combat strength to one combatant in an adjacent territory (even if your units are not directly involved). Support Orders may support multiple combats in the same round. Ships may support land areas. Support Orders may be removed by Raid Orders.";
        if (this.supportModifier > 0) {
            tooltip += " Adds " + this.supportModifier + " combat strength when supporting.";
        }
        return tooltip;
    }
}
