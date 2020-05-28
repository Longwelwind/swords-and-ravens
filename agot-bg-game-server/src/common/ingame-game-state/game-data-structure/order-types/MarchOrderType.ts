import OrderType from "./OrderType";

export default class MarchOrderType extends OrderType {
    attackModifier: number;

    constructor(id: string, name: string, starred = false, attackModifier = 0) {
        super(id, name, starred);
        this.attackModifier = attackModifier;
    }

    toString(): string {
        return "M" + (this.attackModifier > 0 ? "+" + this.attackModifier : this.attackModifier < 0 ? this.attackModifier : "");
    }

    tooltipText(): string {
        return "March Orders allow for the movement of troops and ships. Units may move into multiple adjacent areas, but only one combat may be initiated by a single march order. If moving into an enemy territory, it will trigger combat. Adds " + this.attackModifier + " combat strength.";
    }
}
