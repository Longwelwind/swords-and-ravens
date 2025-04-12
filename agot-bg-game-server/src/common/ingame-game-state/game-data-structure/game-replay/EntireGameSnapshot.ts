import { observable } from "mobx";
import GameSnapshot from "./GameSnapshot";
import HouseSnapshot from "./HouseSnapshot";
import IEntireGameSnapshot from "./IEntireGameSnapshot";
import RegionSnapshot from "./RegionSnapshot";

export default class EntireGameSnapshot implements IEntireGameSnapshot {
  @observable worldSnapshot: RegionSnapshot[];
  @observable gameSnapshot?: GameSnapshot;

  constructor(data: IEntireGameSnapshot) {
    this.worldSnapshot = data.worldSnapshot.map(
      (rsnap) => new RegionSnapshot(rsnap)
    );
    this.gameSnapshot = data.gameSnapshot
      ? new GameSnapshot(data.gameSnapshot)
      : undefined;
  }

  getHouse(id: string | null): HouseSnapshot | undefined {
    if (id == null || !this.gameSnapshot) return undefined;
    return (
      this.gameSnapshot.housesOnVictoryTrack.find((house) => house.id === id) ??
      undefined
    );
  }

  getRegion(id: string): RegionSnapshot {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.worldSnapshot.find((region) => region.id === id)!;
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
