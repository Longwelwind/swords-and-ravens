import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import SerDavosSeaworthASoSAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/ser-davos-seaworth-asos-game-state/SerDavosSeaworthASoSAbilityGameState";

export default class SerDavosSeaworthASoSHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        beforeCombat.childGameState.setChildGameState(new SerDavosSeaworthASoSAbilityGameState(beforeCombat.childGameState)).firstStart(house);
    }

    modifyTowerIcons(combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
        return houseCardModifier && houseCard == affectedHouseCard ? houseCardModifier.towerIcons : 0;
    }

    doesPreventWounds(_combat: CombatGameState, _house: House, _houseCard: HouseCard): boolean {
        return true;
    }
}
