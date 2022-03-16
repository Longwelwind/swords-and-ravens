import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import MaceTyrellASoSAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/mace-tyrell-asos-ability-game-state/MaceTyrellASoSAbilityGameState";
import AfterCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";

export default class MaceTyrellASoSHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        if (afterCombat.postCombatGameState.winner == house && !afterCombat.postCombatGameState.isAttackingArmyMovementPrevented()) {
                afterCombat.childGameState
                    .setChildGameState(new MaceTyrellASoSAbilityGameState(afterCombat.childGameState))
                    .firstStart(house);
            return;
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}
