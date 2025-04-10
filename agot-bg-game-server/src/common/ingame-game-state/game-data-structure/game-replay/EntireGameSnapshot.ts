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

  getHouse(id: string | null): HouseSnapshot | null {
    if (id == null || !this.gameSnapshot) return null;
    return (
      this.gameSnapshot.housesOnVictoryTrack.find((house) => house.id === id) ??
      null
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
}
