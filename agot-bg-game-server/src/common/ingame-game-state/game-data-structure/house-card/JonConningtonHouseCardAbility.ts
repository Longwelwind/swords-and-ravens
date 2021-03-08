import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import JonConningtonAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/jon-connington-ability-game-state/JonConningtonAbilityGameState";

export default class JonConningtonHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        if (afterCombat.postCombatGameState.loser == house) {
            afterCombat.childGameState.setChildGameState(new JonConningtonAbilityGameState(afterCombat.childGameState)).firstStart(house);
            return;
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}