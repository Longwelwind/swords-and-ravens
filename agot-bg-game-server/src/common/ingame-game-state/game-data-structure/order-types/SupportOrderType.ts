import RegionKind from "../RegionKind";
import OrderType from "./OrderType";

export default class SupportOrderType extends OrderType {
    supportModifier: number;

    constructor(id: string, name: string, starred = false, supportModifier = 0, restrictedTo: RegionKind | null = null) {
        super(id, name, starred);
        this.supportModifier = supportModifier;
        this.restrictedTo = restrictedTo;
    }
}
