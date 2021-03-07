import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import AeronDamphairDwDAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";

export default class AeronDamphairDwDHouseCardAbility extends HouseCardAbility {
    abilityGameState: AeronDamphairDwDAbilityGameState | null = null;

    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        this.abilityGameState = new AeronDamphairDwDAbilityGameState(beforeCombat.childGameState);
        beforeCombat.childGameState.setChildGameState(this.abilityGameState)
            .firstStart(house);
    }

    modifyCombatStrength(combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        let combatStrengthModifier = (this.abilityGameState && houseCard==affectedHouseCard) ? this.abilityGameState.combatStrengthModifier : 0;
        return combatStrengthModifier;
    }
}
