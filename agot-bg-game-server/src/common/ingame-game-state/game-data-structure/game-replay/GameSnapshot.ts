import HouseSnapshot from "./HouseSnapshot";
import IGameSnapshot from "./IGameSnapshot";
import IronBankSnapshot from "./IronBankSnapshot";

export default class GameSnapshot implements IGameSnapshot {
  round: number;
  wildlingStrength: number;
  dragonStrength?: number;
  ironThroneTrack: string[];
  fiefdomsTrack: string[];
  kingsCourtTrack: string[];
  housesOnVictoryTrack: HouseSnapshot[];
  vsbUsed?: boolean;
  ironBank?: IronBankSnapshot;

  constructor(data: IGameSnapshot) {
    this.round = data.round;
    this.wildlingStrength = data.wildlingStrength;
    this.dragonStrength = data.dragonStrength;
    this.ironThroneTrack = data.ironThroneTrack;
    this.fiefdomsTrack = data.fiefdomsTrack;
    this.kingsCourtTrack = data.kingsCourtTrack;
    this.housesOnVictoryTrack = data.housesOnVictoryTrack;
    this.vsbUsed = data.vsbUsed;
    this.ironBank = data.ironBank;
  }
}
