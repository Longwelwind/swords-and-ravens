import { observable } from "mobx";
import { UnitState } from "../Unit";
import IRegionSnapshot from "./IRegionSnapshot";

export default class RegionSnapshot implements IRegionSnapshot {
  id: string;
  @observable controller?: string;
  @observable units?: UnitState[];
  @observable garrison?: number;
  @observable controlPowerToken?: string;
  @observable loyaltyTokens?: number;
  @observable castleModifier?: number;
  @observable barrelModifier?: number;
  @observable crownModifier?: number;
  @observable overwrittenSuperControlPowerToken?: string;
  @observable order?: { type: string; restricted?: boolean };

  constructor(data: IRegionSnapshot) {
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

  createUnit(type: string, house: string): void {
    if (!this.units) {
      this.units = [];
    }
    this.units.push({ type, house, wounded: false });
  }

  moveTo(unitType: string, house: string, to: RegionSnapshot): void {
    const unit = this.removeUnit(unitType, house);
    if (unit) to.addUnit(unit);
  }

  addUnit(unit: UnitState): void {
    if (!this.units) {
      this.units = [];
    }
    this.units.push(unit);
  }

  getUnits(unitTypes: string[], house: string): UnitState[] {
    if (!this.units) {
      return [];
    }

    const result: UnitState[] = [];
    for (const ut of unitTypes) {
      const foundUnit = this.units.find(
        (u) => u.type === ut && u.house === house && !result.includes(u)
      );
      if (foundUnit) {
        result.push(foundUnit);
      }
    }
    return result;
  }

  removeUnit(
    unitType: string,
    house: string,
    wounded: boolean | undefined = undefined
  ): UnitState | null {
    if (!this.units) {
      return null;
    }

    let index = this.units.findIndex(
      (u) => u.type === unitType && u.house === house && u.wounded === wounded
    );

    // Todo: fallback to find a possible wounded unit
    if (index === -1) {
      index = this.units.findIndex(
        (u) => u.type === unitType && u.house === house
      );
    }

    if (index !== -1) {
      return this.units.splice(index, 1)[0];
    }

    return null;
  }

  removeOrder(): void {
    this.order = undefined;
  }

  setOrder(type: string): void {
    this.order = { type };
  }
}
