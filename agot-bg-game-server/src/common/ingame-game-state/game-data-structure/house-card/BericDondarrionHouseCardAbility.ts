import HouseCard from "./HouseCard";
import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import BericDondarrionAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/beric-dondarrion-ability-game-state/BericDondarrionAbilityGameState";

export default class BericDondarrionHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new BericDondarrionAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
