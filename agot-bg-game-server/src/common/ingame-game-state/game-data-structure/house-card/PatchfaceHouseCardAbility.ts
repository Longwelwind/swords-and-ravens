import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import PatchfaceAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/patchface-ability-game-state/PatchfaceAbilityGameState";

export default class PatchfaceHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        afterCombat.childGameState.setChildGameState(new PatchfaceAbilityGameState(afterCombat.childGameState)).firstStart(house);
    }
}