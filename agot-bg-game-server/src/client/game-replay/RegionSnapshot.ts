import { observable } from "mobx";
import { UnitState } from "../../common/ingame-game-state/game-data-structure/Unit";
import IRegionSnapshot from "./IRegionSnapshot";

export default class RegionSnapshot implements IRegionSnapshot {
  id: string;
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
    this.units = data.units
      ? data.units.map((unit) => ({ ...unit }))
      : undefined;
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

  getCopy(): RegionSnapshot {
    return new RegionSnapshot({
      id: this.id,
      units: this.units,
      garrison: this.garrison,
      controlPowerToken: this.controlPowerToken,
      loyaltyTokens: this.loyaltyTokens,
      castleModifier: this.castleModifier,
      barrelModifier: this.barrelModifier,
      crownModifier: this.crownModifier,
      order: this.order,
      overwrittenSuperControlPowerToken: this.overwrittenSuperControlPowerToken,
    });
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

  private getUnit(
    unitType: string,
    house: string,
    wounded: boolean | undefined = undefined
  ): UnitState {
    if (!this.units) {
      throw new Error(`No units in region snapshot: ${this.id}`);
    }
    let unit = this.units.find(
      (u) => u.type === unitType && u.house === house && !u.wounded === !wounded
    );

    // We might want to remove a wounded unit by log events like Faceless Men or Ilyn Payne
    // Players might select a wounded unit which cannot be reflected by the log type
    //  so we have to apply this fallback here which might cause inconsistencies when replaying the log
    if (!unit) {
      unit = this.units.find((u) => u.type === unitType && u.house === house);
    }

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
