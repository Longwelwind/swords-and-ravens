import IHouseSnapshot from "./IHouseSnapshot";
import IIronBankSnapshot from "./IIronBankSnapshot";

export default interface IGameSnapshot {
  round: number;
  wildlingStrength: number;
  dragonStrength?: number;
  ironThroneTrack: string[];
  fiefdomsTrack: string[];
  kingsCourtTrack: string[];
  housesOnVictoryTrack: IHouseSnapshot[];
  vsbUsed?: boolean;
  ironBank?: IIronBankSnapshot;
}
