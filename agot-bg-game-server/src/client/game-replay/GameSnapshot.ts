import { observable } from "mobx";
import HouseSnapshot from "./HouseSnapshot";
import IGameSnapshot from "./IGameSnapshot";
import IronBankSnapshot from "./IronBankSnapshot";

export default class GameSnapshot implements IGameSnapshot {
  @observable accessor round: number;
  @observable accessor wildlingStrength: number;
  @observable accessor dragonStrength: number | undefined = undefined;
  @observable accessor ironThroneTrack: string[];
  @observable accessor fiefdomsTrack: string[];
  @observable accessor kingsCourtTrack: string[];
  @observable accessor housesOnVictoryTrack: HouseSnapshot[];
  @observable accessor vsbUsed: boolean | undefined = undefined;
  @observable accessor ironBank: IronBankSnapshot | undefined = undefined;
  @observable accessor overwrittenIronThroneHolder: string | undefined =
    undefined;
  @observable accessor overwrittenValyrianSteelBladeHolder: string | undefined =
    undefined;
  @observable accessor overwrittenRavenHolder: string | undefined = undefined;

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
    this.overwrittenIronThroneHolder = data.overwrittenIronThroneHolder;
    this.overwrittenValyrianSteelBladeHolder =
      data.overwrittenValyrianSteelBladeHolder;
    this.overwrittenRavenHolder = data.overwrittenRavenHolder;
  }

  getCopy(): GameSnapshot {
    return new GameSnapshot(this);
  }
}
