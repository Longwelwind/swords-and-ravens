import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import RobertArrynAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/robert-arryn-ability-game-state/RobertArrynAbilityGameState";

export default class RobertArrynHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        if (afterCombat.combatGameState.defender == house) {
            afterCombat.childGameState.setChildGameState(new RobertArrynAbilityGameState(afterCombat.childGameState)).firstStart(house);
            return;
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}