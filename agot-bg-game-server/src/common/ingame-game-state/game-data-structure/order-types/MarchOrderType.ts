import OrderType from "./OrderType";

export default class MarchOrderType extends OrderType {
    attackModifier: number;

    constructor(id: string, name: string, starred = false, attackModifier = 0) {
        super(id, name, starred);
        this.attackModifier = attackModifier;
    }
}
