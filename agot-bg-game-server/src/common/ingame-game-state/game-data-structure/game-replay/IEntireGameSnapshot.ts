import IRegionSnapshot from "./IRegionSnapshot";
import IGameSnapshot from "./IGameSnapshot";

export default interface IEntireGameSnapshot {
  worldSnapshot: IRegionSnapshot[];
  gameSnapshot?: IGameSnapshot;
}
