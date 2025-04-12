import Region, { SerializedRegion } from "./Region";
import Point, { distanceSquared } from "../../../utils/Point";
import Unit from "./Unit";
import House from "./House";
import Game from "./Game";
import BetterMap from "../../../utils/BetterMap";
import { land, port, sea } from "./regionTypes";
import * as _ from "lodash";
import StaticBorder from "./static-data-structure/StaticBorder";
import StaticRegion from "./static-data-structure/StaticRegion";
import RegionKind from "./RegionKind";
import getStaticWorld from "./static-data-structure/getStaticWorld";
import { dragon } from "./unitTypes";
import staticWorld7p from "./static-data-structure/globalStaticWorld7p";
import StaticIronBankView from "./static-data-structure/StaticIronBankView";
import { GameSettings } from "../../../common/EntireGame";
import Player from "../Player";
import IRegionSnapshot from "./game-replay/IRegionSnapshot";

export default class World {
  settings: GameSettings;
  regions: BetterMap<string, Region>;

  get borders(): StaticBorder[] {
    return getStaticWorld(this.settings).staticBorders;
  }

  get regionsThatRegainGarrison(): StaticRegion[] {
    return getStaticWorld(this.settings).staticRegions.values.filter(
      (region) => region.canRegainGarrison
    );
  }

  get westerosLandRegionIds(): string[] {
    return staticWorld7p.staticRegions.values
      .filter((r) => r.type == land)
      .map((r) => r.id);
  }

  get westerosLandRegions(): Region[] {
    const westerosLandRegionIds = this.westerosLandRegionIds;
    return this.regions.values.filter((r) =>
      westerosLandRegionIds.includes(r.id)
    );
  }

  get regionsAdjacentToARiver(): Region[] {
    const riverRegionsIds = [
      "winterfell",
      "moat-cailin",
      "greywater-watch",
      "seagard",
      "the-twins",
      "riverrun",
      "the-mountains-of-the-moon",
      "harrenhal",
      "crackclaw-point",
      "three-towers",
      "princes-pass",
      "starfall",
    ];
    return this.regions.values.filter((r) => riverRegionsIds.includes(r.id));
  }

  get ironBankView(): StaticIronBankView | null {
    return getStaticWorld(this.settings).ironBankView;
  }

  constructor(regions: BetterMap<string, Region>, settings: GameSettings) {
    this.regions = regions;
    this.settings = settings;
  }

  getRegion(staticRegion: StaticRegion): Region {
    return this.regions.get(staticRegion.id);
  }

  getBorders(region: Region): StaticBorder[] {
    return this.borders.filter((b) => b.isPart(region.staticRegion));
  }

  getContinuousBorder(region: Region): Point[] {
    let borders = this.getBorders(region);
    const continuousPoints: Point[] = [];
    continuousPoints.push(...borders[0].polygon);
    borders = borders.slice(1);
    while (borders.length > 0) {
      const end = continuousPoints[continuousPoints.length - 1];

      const { border, reverse } = this.getClosestNextBorder(end, borders);

      borders = _.pull(borders, border);
      continuousPoints.push(
        ...(reverse ? border.polygon.slice().reverse() : border.polygon)
      );
    }

    return continuousPoints;
  }

  private getClosestNextBorder(
    start: Point,
    borders: StaticBorder[]
  ): { border: StaticBorder; reverse: boolean } {
    let minDistanceSquared = Number.MAX_VALUE;
    let border: StaticBorder | null = null;
    let reverse = false;

    borders.forEach((b) => {
      const distanceSquaredBegin = distanceSquared(start, b.polygon[0]);
      if (distanceSquaredBegin < minDistanceSquared) {
        minDistanceSquared = distanceSquaredBegin;
        border = b;
        reverse = false;
      }

      const distanceSquaredEnd = distanceSquared(
        start,
        b.polygon[b.polygon.length - 1]
      );
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
      reverse: reverse,
    };
  }

  getNeighbouringRegions(region: Region): Region[] {
    // There might be multiple borders between the 2 same regions,
    // this is why _.uniq is used.
    return _.uniq(
      this.borders
        .filter((b) => b.isPart(region.staticRegion))
        .filter((b) => b.to != null)
        .map((b) => b.getNeighbour(region.staticRegion) as StaticRegion)
        .map((sr) => this.getRegion(sr))
    );
  }

  getReachableRegions(
    startingRegion: Region,
    house: House,
    army: Unit[],
    viaTransportOnly = false,
    retreat = false
  ): Region[] {
    if (army.length == 0) {
      return [];
    }
    let regionsToCheck: Region[] = this.getNeighbouringRegions(startingRegion);
    const checkedRegions: Region[] = [];
    const reachableRegions: Region[] = [];

    // Check that all units of the army are of the same kind
    const regionKindOfArmy = army[0].type.walksOn;
    if (!army.every((u) => u.type.walksOn == regionKindOfArmy)) {
      throw new Error(
        `Different walksOn unit types present in '${startingRegion.name}'`
      );
    }

    if (army.every((u) => u.type == dragon) && !retreat && !viaTransportOnly) {
      return this.regions.values.filter(
        (r) => r != startingRegion && r.type == land
      );
    }

    if (viaTransportOnly) {
      regionsToCheck = regionsToCheck.filter((r) =>
        this.canActAsBridge(r, house, regionKindOfArmy)
      );
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
      if (this.canActAsBridge(region, house, regionKindOfArmy)) {
        regionsToCheck.push(...this.getNeighbouringRegions(region));
      }

      checkedRegions.push(region);
    }

    return reachableRegions;
  }

  canActAsBridge(
    region: Region,
    house: House,
    regionKindOfArmy: RegionKind
  ): boolean {
    return (
      region.getController() == house &&
      region.units.values.some((u) => u.type.canTransport == regionKindOfArmy)
    );
  }

  getControlledRegions(house: House): Region[] {
    return this.regions.values.filter((r) => r.getController() == house);
  }

  getAllRegionsWithControllers(): [Region, House | null][] {
    return this.regions.values.map((r) => [r, r.getController()]);
  }

  getValidRetreatRegions(
    startingRegion: Region,
    house: House,
    army: Unit[]
  ): Region[] {
    return (
      this.getReachableRegions(startingRegion, house, army, false, true)
        // A retreat can be done in a port only if the adjacent land area is controlled
        // by the retreater
        .filter(
          (r) =>
            !(
              r.type == port &&
              this.getAdjacentLandOfPort(r).getController() != house
            )
        )
        // Remove regions with enemy units
        .filter(
          (r) => !(r.getController() != null && r.getController() != house)
        )
        // Remove regions with neutral forces
        .filter((r) => !(r.garrison > 0 && r.getController() == null))
    );
  }

  getAdjacentSeaOfPort(region: Region): Region {
    const adjacentSeas = this.getNeighbouringRegions(region).filter(
      (r) => r.type == sea
    );

    if (adjacentSeas.length != 1) {
      throw new Error(
        `Port "${region.id}" has more than one adjacent sea regions`
      );
    }

    return adjacentSeas[0];
  }

  getAdjacentLandOfPort(region: Region): Region {
    const adjacentLands = this.getNeighbouringRegions(region).filter(
      (r) => r.type == land
    );

    if (adjacentLands.length != 1) {
      throw new Error(
        `Port "${region.id}" has more than one adjacent land regions`
      );
    }

    return adjacentLands[0];
  }

  getAdjacentPortOfCastle(region: Region | null): Region | null {
    if (!region || !region.hasStructure) {
      return null;
    }

    const adjacentPorts = this.getNeighbouringRegions(region).filter(
      (r) => r.type == port
    );

    if (adjacentPorts.length == 0) {
      return null;
    } else if (adjacentPorts.length == 1) {
      return adjacentPorts[0];
    }

    throw new Error(`${region.id} has more than one adjacent ports`);
  }

  getUnitsOfHouse(house: House): Unit[] {
    return _.flatMap(this.regions.values.map((r) => r.units.values)).filter(
      (u) => u.allegiance == house
    );
  }

  getUnitById(unitId: number): Unit {
    const region = this.regions.values.find((r) => r.units.has(unitId));

    if (!region) {
      throw new Error(`Couldn't find region with unit of id ${unitId}`);
    }

    return region.units.get(unitId);
  }

  getCapitalOfHouse(house: House): Region {
    const capital = this.regions.values.filter(
      (r) => r.superControlPowerToken == house
    );
    if (capital.length != 1) {
      throw new Error("Every house must have exactly one capital");
    }
    return capital[0];
  }

  getSnapshot(): IRegionSnapshot[] {
    return this.regions.values.map((r) => r.getSnapshot());
  }

  serializeToClient(admin: boolean, player: Player | null): SerializedWorld {
    return {
      regions: this.regions.values.map((r) =>
        r.serializeToClient(admin, player)
      ),
      settings: this.settings,
    };
  }

  static deserializeFromServer(game: Game, data: SerializedWorld): World {
    const regions = new BetterMap(
      data.regions.map((r) => [r.id, Region.deserializeFromServer(game, r)])
    );

    return new World(regions, data.settings);
  }
}

export interface SerializedWorld {
  regions: SerializedRegion[];
  settings: GameSettings;
}
