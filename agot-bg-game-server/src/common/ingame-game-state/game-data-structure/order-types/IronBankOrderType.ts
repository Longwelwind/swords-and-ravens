import RegionKind from "../RegionKind";
import ConsolidatePowerOrderType from "./ConsolidatePowerOrderType";

export default class IronBankOrderType extends ConsolidatePowerOrderType {

    constructor() {
        super("sea-iron-bank", "Iron Bank", false);
        this.restrictedTo = RegionKind.SEA;
    }
}
