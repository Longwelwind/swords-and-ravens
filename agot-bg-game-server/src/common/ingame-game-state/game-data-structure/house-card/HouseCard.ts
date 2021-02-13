import HouseCardAbility from "./HouseCardAbility";
import houseCardAbilities from "./houseCardAbilities";
import {observable} from "mobx";

export enum HouseCardState {
    AVAILABLE,
    USED,
    DISCARDED
}

export default class HouseCard {
    id: string;
    name: string;
    combatStrength: number;
    swordIcons: number;
    towerIcons: number;
    originalCombatStrength: number;
    originalSwordIcons: number;
    originalTowerIcons: number;
    ability: HouseCardAbility | null;
    disabledAbility: HouseCardAbility | null;
    disabled: boolean;
    @observable state: HouseCardState = HouseCardState.AVAILABLE;

    constructor(id: string, name: string, combatStrength: number, swordIcons: number, towerIcons: number, ability: HouseCardAbility | null) {
        this.id = id;
        this.name = name;
        this.combatStrength = this.originalCombatStrength = combatStrength;
        this.swordIcons = this.originalSwordIcons = swordIcons;
        this.towerIcons = this.originalTowerIcons = towerIcons;
        this.ability = ability;
        this.disabledAbility = null;
        this.disabled = false;
    }

    serializeToClient(): SerializedHouseCard {
        return {
            id: this.id,
            name: this.name,
            combatStrength: this.combatStrength,
            swordIcons: this.swordIcons,
            towerIcons: this.towerIcons,
            abilityId: this.ability ? this.ability.id : null,
            disabledAbilityId: this.disabledAbility ? this.disabledAbility.id : null,
            disabled: this.disabled,
            state: this.state,
            originalCombatStrength: this.originalCombatStrength,
            originalSwordIcons: this.originalSwordIcons,
            originalTowerIcons: this.originalTowerIcons
        };
    }

    static deserializeFromServer(data: SerializedHouseCard): HouseCard {
        const houseCard = new HouseCard(
            data.id,
            data.name,
            data.combatStrength,
            data.swordIcons,
            data.towerIcons,
            data.abilityId ? houseCardAbilities.get(data.abilityId) : null
        );

        houseCard.state = data.state;
        houseCard.originalCombatStrength = data.originalCombatStrength;
        houseCard.originalSwordIcons = data.originalSwordIcons;
        houseCard.originalTowerIcons = data.originalTowerIcons;
        houseCard.disabledAbility = data.disabledAbilityId ? houseCardAbilities.get(data.disabledAbilityId) : null;
        houseCard.disabled = data.disabled;

        return houseCard;
    }
}

export interface SerializedHouseCard {
    id: string;
    name: string;
    combatStrength: number;
    swordIcons: number;
    towerIcons: number;
    abilityId: string | null;
    disabledAbilityId: string | null;
    disabled: boolean | false;
    state: HouseCardState;
    originalCombatStrength: number;
    originalSwordIcons: number;
    originalTowerIcons: number;
}
