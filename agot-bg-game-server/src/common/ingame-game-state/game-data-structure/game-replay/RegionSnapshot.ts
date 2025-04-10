import { UnitState } from "../Unit";
import IRegionSnapshot from "./IRegionSnapshot";

export default class RegionSnapshot implements IRegionSnapshot {
  id: string;
  controller?: string;
  units?: UnitState[];
  garrison?: number;
  controlPowerToken?: string;
  loyaltyTokens?: number;
  castleModifier?: number;
  barrelModifier?: number;
  crownModifier?: number;
  overwrittenSuperControlPowerToken?: string;
  order?: { type: string; restricted?: boolean };

  constructor(data: RegionSnapshot) {
    this.id = data.id;
    this.controller = data.controller;
    this.units = data.units;
    this.garrison = data.garrison;
    this.controlPowerToken = data.controlPowerToken;
    this.loyaltyTokens = data.loyaltyTokens;
    this.castleModifier = data.castleModifier;
    this.barrelModifier = data.barrelModifier;
    this.crownModifier = data.crownModifier;
    this.overwrittenSuperControlPowerToken =
      data.overwrittenSuperControlPowerToken;
    this.order = data.order;
  }
}
