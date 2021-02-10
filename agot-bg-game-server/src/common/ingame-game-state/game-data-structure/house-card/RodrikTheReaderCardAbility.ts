import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";

import HouseCard from "./HouseCard";
import House from "../House";
import RodrikTheReaderAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/rodrik-the-reader-ability-game-state/RodrikTheReaderAbilityGameState";

export default class RodrikTheReaderHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        if (afterCombat.postCombatGameState.winner == house) {
            afterCombat.childGameState.setChildGameState(new RodrikTheReaderAbilityGameState(afterCombat.childGameState)).firstStart(house);
        }
    }
}