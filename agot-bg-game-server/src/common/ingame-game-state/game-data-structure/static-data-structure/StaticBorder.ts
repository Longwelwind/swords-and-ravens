import Point from "../../../../utils/Point";
import StaticRegion from "./StaticRegion";

export default class StaticBorder {
    from: StaticRegion;
    to: StaticRegion | null;
    polygon: Point[];

    constructor(from: StaticRegion, to: StaticRegion | null, polygon: Point[]) {
        this.from = from;
        this.to = to;
        this.polygon = polygon;
    }

    getNeighbour(one: StaticRegion): StaticRegion | null {
        if (one == this.from) {
            return this.to;
        } else if (one == this.to) {
            return this.from;
        }  else {
            throw Error("one not this.from nor this.to");
        }
    }

    isPart(region: StaticRegion): boolean {
        return this.from == region || this.to == region;
    }
}