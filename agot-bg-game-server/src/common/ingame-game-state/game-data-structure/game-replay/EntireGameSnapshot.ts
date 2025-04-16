import { observable } from "mobx";
import GameSnapshot from "./GameSnapshot";
import HouseSnapshot from "./HouseSnapshot";
import IEntireGameSnapshot from "./IEntireGameSnapshot";
import RegionSnapshot from "./RegionSnapshot";
import BetterMap from "../../../../utils/BetterMap";
import IngameGameState from "../../IngameGameState";
import _ from "lodash";

export default class EntireGameSnapshot implements IEntireGameSnapshot {
  @observable worldSnapshot: RegionSnapshot[];
  @observable gameSnapshot?: GameSnapshot;

  private ingame: IngameGameState;
  private _regionMap = new BetterMap<string, RegionSnapshot>();
  private _houseMap = new BetterMap<string, HouseSnapshot>();
  private _controllerMap = new BetterMap<
    RegionSnapshot,
    HouseSnapshot | null
  >();

  constructor(data: IEntireGameSnapshot, ingame: IngameGameState) {
    this.ingame = ingame;

    this.worldSnapshot = data.worldSnapshot.map(
      (rsnap) => new RegionSnapshot(rsnap)
    );
    this.gameSnapshot = data.gameSnapshot
      ? new GameSnapshot(data.gameSnapshot)
      : undefined;
    this.worldSnapshot.forEach((region) => {
      this._regionMap.set(region.id, region);
    });
    this.gameSnapshot?.housesOnVictoryTrack.forEach((HouseSnapshot) => {
      this._houseMap.set(HouseSnapshot.id, HouseSnapshot);
    });

    this.loadHouseDataFromGame();
  }

  getCopy(): EntireGameSnapshot {
    return new EntireGameSnapshot(this, this.ingame);
  }

  calculateControllersPerRegion(): void {
    if (!this.gameSnapshot) return;
    this.worldSnapshot.forEach((region) => {
      const hid = this.determineController(region.id);
      const controller = hid ? this._houseMap.get(hid) : null;
      this._controllerMap.set(region, controller);
    });
  }

  getController(regionId: string): HouseSnapshot | null {
    const region = this.getRegion(regionId);
    return this._controllerMap.tryGet(region, null);
  }

  getHouse(id: string): HouseSnapshot {
    if (!this._houseMap.has(id)) {
      throw new Error(`HouseSnapshot ${id} not found in snapshot houses map`);
    }
    return this._houseMap.get(id);
  }

  getRegion(id: string): RegionSnapshot {
    if (!this._regionMap.has(id)) {
      this._regionMap.set(id, new RegionSnapshot({ id }));
      this.worldSnapshot.push(this._regionMap.get(id));
    }
    return this._regionMap.get(id);
  }

  setOrderToRegion(regionId: string, orderType: string): void {
    const region = this.getRegion(regionId);
    if (region) {
      region.setOrder(orderType);
    }
  }

  getInfluenceTrack(id: number): string[] {
    if (!this.gameSnapshot) return [];
    if (id == 0) return this.gameSnapshot.ironThroneTrack;
    if (id == 1) return this.gameSnapshot.fiefdomsTrack;
    if (id == 2) return this.gameSnapshot.kingsCourtTrack;
    return [];
  }

  removeUnits(units: [string, string[]][], HouseSnapshot: string): void {
    units.forEach(([rid, _units]) => {
      const region = this.getRegion(rid);
      _units.forEach((u) => {
        region.removeUnit(u, HouseSnapshot);
      });
    });
  }

  changeSupply(
    HouseSnapshot: string,
    delta: number,
    supplyRestrictions: number[][]
  ): number {
    if (!this.gameSnapshot) return 0;
    const h = this.getHouse(HouseSnapshot);
    if (!h) return 0;
    const oldValue = h.supply;
    h.supply = Math.max(
      0,
      Math.min(h.supply + delta, supplyRestrictions.length - 1)
    );
    return h.supply - oldValue;
  }

  getVictoryTrack(): HouseSnapshot[] {
    if (!this.gameSnapshot) return [];
    const victoryConditions = this.getVictoryConditions(
      this.gameSnapshot.round !== this.ingame.game.maxTurns
    );
    const sorted = _.sortBy(this._houseMap.values, victoryConditions);
    sorted.forEach((house) => {
      house.victoryPointsUI = this.getVictoryPoints(house.id);
      house.landAreaCount = this.getLandRegionCount(house.id);
    });
    return sorted;
  }

  private getVictoryPoints(house: string): number {
    return this.ingame.entireGame.isFeastForCrows || house == "targaryen"
      ? this._houseMap.get(house).victoryPoints
      : this.getCastleCount(house);
  }

  private getCastleCount(houseId: string): number {
    return this.ingame.replayManager.castleRegions.keys.reduce((count, rid) => {
      const staticRegion = this.ingame.replayManager.castleRegions.get(rid);
      const regionSnapshot = this._regionMap.tryGet(rid, null);
      const hasCastle =
        (staticRegion.castleLevel ?? 0) +
          (regionSnapshot?.castleModifier ?? 0) >
        0;

      return hasCastle && this.getController(rid)?.id === houseId
        ? count + 1
        : count;
    }, 0);
  }

  private getLandRegionCount(houseId: string): number {
    return this.ingame.replayManager.landRegions.keys.filter(
      (rid) => this.getController(rid)?.id == houseId
    ).length;
  }

  private getVictoryConditions(
    isLastRound: boolean
  ): ((h: HouseSnapshot) => number)[] {
    let victoryConditions: ((h: HouseSnapshot) => number)[] = [];

    if (!this.ingame.entireGame.isFeastForCrows) {
      victoryConditions = [
        (h: HouseSnapshot) => (h.isVassal ? 1 : -1),
        (h: HouseSnapshot) => -this.getVictoryPoints(h.id),
        (h: HouseSnapshot) => -this.getLandRegionCount(h.id),
        (h: HouseSnapshot) => -h.supply,
        (h: HouseSnapshot) =>
          this.gameSnapshot?.ironThroneTrack.indexOf(h.id) ?? -1,
      ];
    } else if (!isLastRound) {
      victoryConditions = [
        (h: HouseSnapshot) => (h.isVassal ? 1 : -1),
        (h: HouseSnapshot) => -this.getVictoryPoints(h.id),
        (h: HouseSnapshot) => -this.getLandRegionCount(h.id),
        (h: HouseSnapshot) =>
          this.gameSnapshot?.ironThroneTrack.indexOf(h.id) ?? -1,
      ];
    } else {
      victoryConditions = [
        (h: HouseSnapshot) => (h.isVassal ? 1 : -1),
        (h: HouseSnapshot) => -this.getVictoryPoints(h.id),
        (h: HouseSnapshot) =>
          this.gameSnapshot?.ironThroneTrack.indexOf(h.id) ?? -1,
      ];
    }
    return victoryConditions;
  }

  private loadHouseDataFromGame(): void {
    this._houseMap.keys.forEach((houseId) => {
      const houseSnap = this._houseMap.get(houseId);
      const house = this.ingame.game.houses.get(houseId);
      houseSnap.name = house.name;
      houseSnap.color = house.id != "greyjoy" ? house.color : "black";
    });
  }

  private determineController(regionId: string): string | null {
    const region = this.getRegion(regionId);

    if (region.units?.length ?? -1 > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return region.units![0].house;
    }

    if (region.controlPowerToken) {
      return region.controlPowerToken;
    }

    const liveRegion = this.ingame.game.world.regions.get(regionId);
    if (liveRegion.type.id == "port") {
      const portCastle = this.ingame.world.getAdjacentLandOfPort(liveRegion);
      if (portCastle) {
        return this.determineController(portCastle.id);
      }
    }

    if (liveRegion.superControlPowerToken) {
      return liveRegion.superControlPowerToken.id;
    }

    return null;
  }
}
