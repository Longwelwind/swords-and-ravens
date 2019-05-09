import Region from "./Region";
import Point from "../../../utils/Point";
import BetterMap from "../../../utils/BetterMap";

export default class Border {
    from: Region;
    to: Region | null;
    polygon: Point[];

    constructor(from: Region, to: Region | null, polygon: Point[]) {
        this.from = from;
        this.to = to;
        this.polygon = polygon;
    }

    getNeighbour(one: Region): Region | null {
        if (one == this.from) {
            return this.to;
        } else if (one == this.to) {
            return this.from;
        }  else {
            throw Error("one not this.from nor this.to");
        }
    }

    isPart(region: Region): boolean {
        return this.from == region || this.to == region;
    }

    serializeToClient(): SerializedBorder {
        return {
            fromRegionId: this.from.id,
            toRegionId: this.to ? this.to.id : null,
            polygon: this.polygon
        };
    }

    static deserializeFromServer(regions: BetterMap<string, Region>, data: SerializedBorder): Border {
        return new Border(
            regions.get(data.fromRegionId),
            data.toRegionId ? regions.get(data.toRegionId) : null,
            data.polygon
        );
    }
}

export interface SerializedBorder {
    fromRegionId: string;
    toRegionId: string | null;
    polygon: Point[];
}
