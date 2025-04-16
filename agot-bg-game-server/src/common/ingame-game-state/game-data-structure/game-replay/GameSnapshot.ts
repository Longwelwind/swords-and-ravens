import { observable } from "mobx";
import HouseSnapshot from "./HouseSnapshot";
import IGameSnapshot from "./IGameSnapshot";
import IronBankSnapshot from "./IronBankSnapshot";

export default class GameSnapshot implements IGameSnapshot {
  @observable round: number;
  @observable wildlingStrength: number;
  @observable dragonStrength?: number;
  @observable ironThroneTrack: string[];
  @observable fiefdomsTrack: string[];
  @observable kingsCourtTrack: string[];
  @observable housesOnVictoryTrack: HouseSnapshot[];
  @observable vsbUsed?: boolean;
  @observable ironBank?: IronBankSnapshot;

  constructor(data: IGameSnapshot) {
    this.round = data.round;
    this.wildlingStrength = data.wildlingStrength;
    this.dragonStrength = data.dragonStrength;
    this.ironThroneTrack = [...data.ironThroneTrack];
    this.fiefdomsTrack = [...data.fiefdomsTrack];
    this.kingsCourtTrack = [...data.kingsCourtTrack];
    this.housesOnVictoryTrack = data.housesOnVictoryTrack.map(
      (snap) => new HouseSnapshot(snap)
    );
    this.vsbUsed = data.vsbUsed;
    this.ironBank = data.ironBank
      ? new IronBankSnapshot(data.ironBank)
      : undefined;
  }

  getCopy(): GameSnapshot {
    return new GameSnapshot(this);
  }
}
