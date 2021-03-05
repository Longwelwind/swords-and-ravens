import HouseCardAbility from "./HouseCardAbility";

import HouseCard from "./HouseCard";
import House from "../House";
import RodrikTheReaderAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/rodrik-the-reader-ability-game-state/RodrikTheReaderAbilityGameState";
import AfterWinnerDeterminationGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";

export default class RodrikTheReaderHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            afterWinnerDetermination.childGameState.setChildGameState(new RodrikTheReaderAbilityGameState(afterWinnerDetermination.childGameState)).firstStart(house);
            return;
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}