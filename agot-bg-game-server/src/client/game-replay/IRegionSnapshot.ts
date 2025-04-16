import { UnitState } from "../../common/ingame-game-state/game-data-structure/Unit";

export default interface IRegionSnapshot {
  id: string;
  units?: UnitState[];
  garrison?: number;
  controlPowerToken?: string;
  loyaltyTokens?: number;
  castleModifier?: number;
  barrelModifier?: number;
  crownModifier?: number;
  overwrittenSuperControlPowerToken?: string;
  order?: { type: string; restricted?: boolean };
}
