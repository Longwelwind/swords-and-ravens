import Region, {SerializedRegion} from "./Region";
import Border, {SerializedBorder} from "./Border";
import Point, {distanceSquared} from "../../../utils/Point";
import Unit from "./Unit";
import House from "./House";
import Game from "./Game";
import BetterMap from "../../../utils/BetterMap";
import {land, port, sea} from "./regionTypes";
import * as _ from "lodash";

export default class World {
    regions: BetterMap<string, Region>;
    borders: Border[];

    constructor(regions: BetterMap<string, Region>, borders: Border[]) {
        this.regions = regions;
        this.borders = borders;
    }

    getBorders(region: Region): Border[] {
        return this.borders.filter(b => b.isPart(region));
    }

    getContinuousBorder(region: Region): Point[] {
        let borders = this.getBorders(region);
        const continuousPoints: Point[] = [];
        continuousPoints.push(...borders[0].polygon);
        borders = borders.slice(1);
        while (borders.length > 0) {
            const end = continuousPoints[continuousPoints.length - 1];

            const {border, reverse} = this.getClosestNextBorder(end, borders);

            borders = _.pull(borders, border);
            continuousPoints.push(...reverse ? border.polygon.slice().reverse() : border.polygon);
        }

        return continuousPoints;
    }

    private getClosestNextBorder(start: Point, borders: Border[]): {border: Border; reverse: boolean} {
        let minDistanceSquared = Number.MAX_VALUE;
        let border: Border | null = null;
        let reverse = false;

        borders.forEach(b => {
            const distanceSquaredBegin = distanceSquared(start, b.polygon[0]);
            if (distanceSquaredBegin < minDistanceSquared) {
                minDistanceSquared = distanceSquaredBegin;
                border = b;
                reverse = false;
            }

            const distanceSquaredEnd = distanceSquared(start, b.polygon[b.polygon.length - 1]);
            if (distanceSquaredEnd < minDistanceSquared) {
                minDistanceSquared = distanceSquaredEnd;
                border = b;
                reverse = true;
            }
        });

        if (!border) {
            throw new Error();
        }

        return {
            border: border,
            reverse: reverse
        }
    }

    getNeighbouringRegions(region: Region): Region[] {
        // There might be multiple borders between the 2 same regions,
        // this is why _.uniq is used.
        return _.uniq(
            this.borders
                .filter(b => b.isPart(region))
                .filter(b => b.to != null)
                .map(b => b.getNeighbour(region) as Region)
        );
    }

    getReachableRegions(startingRegion: Region, house: House, army: Unit[]): Region[] {
        const regionsToCheck: Region[] = this.getNeighbouringRegions(startingRegion);
        const checkedRegions: Region[] = [];
        const reachableRegions: Region[] = [];

        // Check that all units of the army are of the same kind
        const regionKindOfArmy = army[0].type.walksOn;
        if (!army.every(u => u.type.walksOn == regionKindOfArmy)) {
            throw new Error();
        }

        // This is basically a DFS, where some units can act as bridges
        // for other units (i.e. ships for land units).
        while (regionsToCheck.length > 0) {
            const region = regionsToCheck.pop() as Region;

            if (checkedRegions.includes(region)) {
                continue;
            }

            if (region.type.kind == regionKindOfArmy && region != startingRegion) {
                reachableRegions.push(region);
            }

            // Can this region act as a bridge ?
            if (region.getController() == house && region.units.size > 0) {
                if (region.units.values.some(u => u.type.canTransport == regionKindOfArmy)) {
                    regionsToCheck.push(...this.getNeighbouringRegions(region));
                }
            }

            checkedRegions.push(region);
        }

        return reachableRegions;
    }

    getControlledRegions(house: House): Region[] {
        return this.regions.values.filter(r => r.getController() == house);
    }

    getValidRetreatRegions(startingRegion: Region, house: House, army: Unit[]): Region[] {
        return this.getReachableRegions(startingRegion, house, army)
            // A retreat can be done in a port only if the adjacent land area is controlled
            // by the retreater
            .filter(r => !(r.type == port && this.getAdjacentLandOfPort(r).getController() != house))
            // Remove regions with enemy units
            .filter(r => !(r.getController() != house && r.units.size > 0));
    }

    getAdjacentSeaOfPort(region: Region): Region {
        const adjacentSeas = this.getNeighbouringRegions(region).filter(r => r.type == sea);

        if (adjacentSeas.length != 1) {
            throw new Error(`Port "${region.id}" has more than one adjacent sea regions`);
        }

        return adjacentSeas[0];
    }

    getAdjacentLandOfPort(region: Region): Region {
        const adjacentLands = this.getNeighbouringRegions(region).filter(r => r.type == land);

        if (adjacentLands.length != 1) {
            throw new Error(`Port "${region.id}" has more than one adjacent land regions`);
        }

        return adjacentLands[0];
    }

    getUnitsOfHouse(house: House): Unit[] {
        return _.flatMap(this.regions.values.map(r => r.units.values)).filter(u => u.allegiance == house);
    }

    getUnitById(unitId: number): Unit {
        const region = this.regions.values.find(r => r.units.has(unitId));

        if (!region) {
            throw new Error(`Couldn't find region with unit of id ${unitId}`);
        }

        return region.units.get(unitId);
    }

    serializeToClient(): SerializedWorld {
        return {
            regions: this.regions.values.map(r => r.serializeToClient()),
            borders: this.borders.map(b => b.serializeToClient())
        };
    }

    static deserializeFromServer(game: Game, data: SerializedWorld): World {
        const regions = new BetterMap(data.regions.map(r => [r.id, Region.deserializeFromServer(game, r)]));
        const borders = data.borders.map(b => Border.deserializeFromServer(regions, b));

        return new World(regions, borders);
    }
}

export interface SerializedWorld {
    regions: SerializedRegion[];
    borders: SerializedBorder[];
}
