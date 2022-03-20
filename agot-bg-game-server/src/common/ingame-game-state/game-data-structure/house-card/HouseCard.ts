import HouseCardAbility from "./HouseCardAbility";
import houseCardAbilities from "./houseCardAbilities";
import {observable} from "mobx";

export enum HouseCardState {
    AVAILABLE,
    USED
}

export default class HouseCard {
    id: string;
    name: string;
    combatStrength: number;
    originalCombatStrength?: number;
    swordIcons: number;
    towerIcons: number;
    ability: HouseCardAbility | null;
    disabledAbility: HouseCardAbility | null;
    disabled: boolean;
    houseId?: string;
    @observable state: HouseCardState = HouseCardState.AVAILABLE;

    constructor(id: string, name: string, combatStrength: number, swordIcons: number, towerIcons: number, ability: HouseCardAbility | null, houseId: string | undefined = undefined) {
        this.id = id;
        this.name = name;
        this.combatStrength = combatStrength;
        this.swordIcons = swordIcons;
        this.towerIcons = towerIcons;
        this.ability = ability;
        this.disabledAbility = null;
        this.disabled = false;
        this.houseId = houseId;
        this.originalCombatStrength = undefined;
    }

    serializeToClient(): SerializedHouseCard {
        return {
            id: this.id,
            name: this.name,
            combatStrength: this.combatStrength,
            originalCombatStrength: this.originalCombatStrength,
            swordIcons: this.swordIcons,
            towerIcons: this.towerIcons,
            abilityId: this.ability ? this.ability.id : null,
            disabledAbilityId: this.disabledAbility ? this.disabledAbility.id : null,
            disabled: this.disabled,
            state: this.state,
            houseId: this.houseId
        };
    }

    static deserializeFromServer(data: SerializedHouseCard): HouseCard {
        const houseCard = new HouseCard(
            data.id,
            data.name,
            data.combatStrength,
            data.swordIcons,
            data.towerIcons,
            data.abilityId ? houseCardAbilities.get(data.abilityId) : null,
            data.houseId
        );

        houseCard.state = data.state;
        houseCard.disabledAbility = data.disabledAbilityId ? houseCardAbilities.get(data.disabledAbilityId) : null;
        houseCard.disabled = data.disabled;
        houseCard.originalCombatStrength = data.originalCombatStrength;

        return houseCard;
    }
}

export interface SerializedHouseCard {
    id: string;
    name: string;
    combatStrength: number;
    originalCombatStrength?: number;
    swordIcons: number;
    towerIcons: number;
    abilityId: string | null;
    disabledAbilityId: string | null;
    disabled: boolean | false;
    state: HouseCardState;
    houseId?: string;
}
