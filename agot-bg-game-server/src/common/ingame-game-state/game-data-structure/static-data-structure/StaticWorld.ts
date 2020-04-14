import StaticRegion from "./StaticRegion";
import BetterMap from "../../../../utils/BetterMap";
import StaticBorder from "./StaticBorder";

export default class StaticWorld {
    staticRegions: BetterMap<string, StaticRegion>;
    staticBorders: StaticBorder[];

    constructor(staticRegions: BetterMap<string, StaticRegion>, staticBorders: StaticBorder[]) {
        this.staticRegions = staticRegions;
        this.staticBorders = staticBorders;
    }
}