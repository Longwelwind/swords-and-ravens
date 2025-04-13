import { observable } from "mobx";
import GameSnapshot from "./GameSnapshot";
import HouseSnapshot from "./HouseSnapshot";
import IEntireGameSnapshot from "./IEntireGameSnapshot";
import RegionSnapshot from "./RegionSnapshot";
import BetterMap from "../../../../utils/BetterMap";

export default class EntireGameSnapshot implements IEntireGameSnapshot {
  @observable worldSnapshot: RegionSnapshot[];
  @observable gameSnapshot?: GameSnapshot;

  private _regionMap = new BetterMap<string, RegionSnapshot>();
  private _houseMap = new BetterMap<string, HouseSnapshot>();

  constructor(data: IEntireGameSnapshot) {
    this.worldSnapshot = data.worldSnapshot.map(
      (rsnap) => new RegionSnapshot(rsnap)
    );
    this.gameSnapshot = data.gameSnapshot
      ? new GameSnapshot(data.gameSnapshot)
      : undefined;

    this.worldSnapshot.forEach((region) => {
      this._regionMap.set(region.id, region);
    });

    this.gameSnapshot?.housesOnVictoryTrack.forEach((house) => {
      this._houseMap.set(house.id, house);
    });
  }

  getHouse(id: string): HouseSnapshot {
    if (!this._houseMap.has(id)) {
      const house = new HouseSnapshot({
        id,
        houseCards: [],
        supply: 0,
        powerTokens: 0,
        landAreaCount: 0,
        victoryPoints: 0,
      });
      this._houseMap.set(id, house);
      if (
        this.gameSnapshot &&
        !this.gameSnapshot.housesOnVictoryTrack.includes(house)
      ) {
        this.gameSnapshot.housesOnVictoryTrack.push(house);
      }
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

  removeOrderFromRegion(regionId: string): void {
    const region = this.getRegion(regionId);
    if (region) {
    }
  }

  getInfluenceTrack(id: number): string[] {
    if (!this.gameSnapshot) return [];
    if (id == 0) return this.gameSnapshot.ironThroneTrack;
    if (id == 1) return this.gameSnapshot.fiefdomsTrack;
    if (id == 2) return this.gameSnapshot.kingsCourtTrack;
    return [];
  }

  removeUnits(units: [string, string[]][]): void {
    units.forEach(([rid, _units]) => {
      const region = this.getRegion(rid);
      _units.forEach((u) => {
        region.removeUnit(u);
      });
    });
  }

  changeSupply(
    house: string,
    delta: number,
    supplyRestrictions: number[][]
  ): number {
    if (!this.gameSnapshot) return 0;
    const h = this.getHouse(house);
    if (!h) return 0;
    const oldValue = h.supply;
    h.supply = Math.max(
      0,
      Math.min(h.supply + delta, supplyRestrictions.length - 1)
    );
    return h.supply - oldValue;
  }
}
