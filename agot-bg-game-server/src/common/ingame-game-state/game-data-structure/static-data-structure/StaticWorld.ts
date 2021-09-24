import StaticRegion from "./StaticRegion";
import BetterMap from "../../../../utils/BetterMap";
import StaticBorder from "./StaticBorder";
import StaticIronBankView from "./StaticIronBankView";

export default class StaticWorld {
    staticRegions: BetterMap<string, StaticRegion>;
    staticBorders: StaticBorder[];
    ironBankView: StaticIronBankView | null;

    constructor(staticRegions: BetterMap<string, StaticRegion>, staticBorders: StaticBorder[], ironBankView: StaticIronBankView | null = null) {
        this.staticRegions = staticRegions;
        this.staticBorders = staticBorders;
        this.ironBankView = ironBankView;
    }
}