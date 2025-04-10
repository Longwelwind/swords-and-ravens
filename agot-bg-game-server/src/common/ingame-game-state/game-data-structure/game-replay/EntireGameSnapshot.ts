import GameSnapshot from "./GameSnapshot";
import IEntireGameSnapshot from "./IEntireGameSnapshot";
import RegionSnapshot from "./RegionSnapshot";

export default class EntireGameSnapshot implements IEntireGameSnapshot {
  worldSnapshot: RegionSnapshot[];
  gameSnapshot?: GameSnapshot;

  constructor(data: IEntireGameSnapshot) {
    this.worldSnapshot = data.worldSnapshot;
    this.gameSnapshot = data.gameSnapshot;
  }
}
