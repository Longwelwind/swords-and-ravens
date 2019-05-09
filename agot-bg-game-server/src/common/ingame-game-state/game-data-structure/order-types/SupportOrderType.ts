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
}
