import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import MelisandreAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/melisandre-ability-game-state/MelisandreAbilityGameState";

export default class MelisandreHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        afterCombat.childGameState.setChildGameState(new MelisandreAbilityGameState(afterCombat.childGameState)).firstStart(house);
    }
}