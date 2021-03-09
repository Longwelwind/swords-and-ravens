import RegionKind from "../RegionKind";
import OrderType from "./OrderType";

export default class MarchOrderType extends OrderType {
    attackModifier: number;

    constructor(id: string, name: string, starred = false, attackModifier = 0, restrictedTo: RegionKind | null = null) {
        super(id, name, starred);
        this.attackModifier = attackModifier;
        this.restrictedTo = restrictedTo;
    }
}
