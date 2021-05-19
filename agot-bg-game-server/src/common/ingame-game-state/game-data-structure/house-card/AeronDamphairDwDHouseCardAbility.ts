import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import AeronDamphairDwDAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class AeronDamphairDwDHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        beforeCombat.childGameState.setChildGameState(new AeronDamphairDwDAbilityGameState(beforeCombat.childGameState)).firstStart(house);
    }

    modifyCombatStrength(combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
        return houseCardModifier && houseCard == affectedHouseCard ? houseCardModifier.combatStrength : 0;
    }
}
