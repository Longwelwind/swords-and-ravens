import HouseCardAbility from "./HouseCardAbility";
import houseCardAbilities from "./houseCardAbilities";
import { observable } from "mobx";

export enum HouseCardState {
  AVAILABLE,
  USED
}

export default class HouseCard {
  id: string;
  name: string;
  combatStrength: number;
  swordIcons: number;
  towerIcons: number;
  ability: HouseCardAbility | null;
  disabledAbility: HouseCardAbility | null;
  extraAbility: HouseCardAbility | null;
  disabled: boolean;
  houseId?: string;
  @observable accessor state: HouseCardState = HouseCardState.AVAILABLE;

  constructor(
    id: string,
    name: string,
    combatStrength: number,
    swordIcons: number,
    towerIcons: number,
    ability: HouseCardAbility | null,
    houseId: string | undefined = undefined
  ) {
    this.id = id;
    this.name = name;
    this.combatStrength = combatStrength;
    this.swordIcons = swordIcons;
    this.towerIcons = towerIcons;
    this.ability = ability;
    this.disabledAbility = null;
    this.extraAbility = null;
    this.disabled = false;
    this.houseId = houseId;
  }

  serializeToClient(): SerializedHouseCard {
    return {
      id: this.id,
      name: this.name,
      combatStrength: this.combatStrength,
      swordIcons: this.swordIcons != 0 ? this.swordIcons : undefined,
      towerIcons: this.towerIcons != 0 ? this.towerIcons : undefined,
      abilityId: this.ability?.id,
      disabledAbilityId: this.disabledAbility?.id,
      extraAbilityId: this.extraAbility?.id,
      disabled: this.disabled ? true : undefined,
      state: this.state,
      houseId: this.houseId
    };
  }

  static deserializeFromServer(data: SerializedHouseCard): HouseCard {
    const houseCard = new HouseCard(
      data.id,
      data.name,
      data.combatStrength,
      data.swordIcons ? data.swordIcons : 0,
      data.towerIcons ? data.towerIcons : 0,
      data.abilityId ? houseCardAbilities.get(data.abilityId) : null,
      data.houseId
    );

    houseCard.state = data.state;
    houseCard.disabledAbility = data.disabledAbilityId
      ? houseCardAbilities.get(data.disabledAbilityId)
      : null;
    houseCard.extraAbility = data.extraAbilityId
      ? houseCardAbilities.get(data.extraAbilityId)
      : null;
    houseCard.disabled = data.disabled ? true : false;

    return houseCard;
  }
}

export interface SerializedHouseCard {
  id: string;
  name: string;
  combatStrength: number;
  swordIcons?: number;
  towerIcons?: number;
  abilityId?: string;
  disabledAbilityId?: string;
  extraAbilityId?: string;
  disabled?: boolean;
  state: HouseCardState;
  houseId?: string;
}
