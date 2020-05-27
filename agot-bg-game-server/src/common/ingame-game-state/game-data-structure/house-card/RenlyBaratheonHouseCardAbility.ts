import HouseCard from "./HouseCard";
import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import RenlyBaratheonAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/renly-baratheon-ability-game-state/RenlyBaratheonAbilityGameState";

export default class RenlyBaratheonHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new RenlyBaratheonAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
