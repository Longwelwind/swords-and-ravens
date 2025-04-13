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

  moveTo(
    to: RegionSnapshot,
    unitType: string,
    house: string,
    wounded: boolean | undefined = undefined,
    applyWound = false
  ): void {
    const unit = this.removeUnit(unitType, house, wounded);
    if (unit) {
      to.addUnit(unit);
      if (applyWound) {
        unit.wounded = true;
      }
    }
  }

  addUnit(unit: UnitState): void {
    if (!this.units) {
      this.units = [];
    }
    this.units.push(unit);
  }

  markAllUnitsAsWounded(): void {
    if (!this.units) {
      // The attacking army may already be destroyed so we expect this to be empty
      return;
    }

    for (const unit of this.units) {
      unit.wounded = true;
    }
  }

  getUnit(
    unitType: string,
    house: string,
    wounded: boolean | undefined = undefined
  ): UnitState {
    if (!this.units) {
      throw new Error(`No units in region snapshot: ${this.id}`);
    }
    const unit = this.units.find(
      (u) => u.type === unitType && u.house === house && !u.wounded === !wounded
    );
    if (!unit) {
      throw new Error(
        `${unitType} of house ${house} not found in region snapshot: ${this.id}`
      );
    }
    return unit;
  }

  removeUnit(
    unitType: string,
    house: string,
    wounded: boolean | undefined = undefined
  ): UnitState {
    if (!this.units) {
      throw new Error(`No units in region snapshot: ${this.id}`);
    }
    const unit = this.getUnit(unitType, house, wounded);
    this.units = this.units.filter((u) => u !== unit);
    return unit;
  }

  removeAllUnits(): UnitState[] {
    if (!this.units) {
      return [];
    }
    const units = this.units;
    this.units = [];
    return units;
  }

  removeOrder(): void {
    this.order = undefined;
  }

  setOrder(type: string): void {
    this.order = { type };
  }
}
