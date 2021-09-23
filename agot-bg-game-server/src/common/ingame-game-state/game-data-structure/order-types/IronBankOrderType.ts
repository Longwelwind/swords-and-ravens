import RegionKind from "../RegionKind";
import OrderType from "./OrderType";

export default class IronBankOrderType extends OrderType {
    constructor() {
        super("sea-iron-bank", "Iron Bank", false);
        this.restrictedTo = RegionKind.SEA;
    }
}
