import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import JonSnowBaratheonAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/jon-snow-baratheon-ability-game-state/JonSnowBaratheonAbilityGameState";

export default class JonSnowBaratheonHouseCardAbility extends HouseCardAbility {

    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.winner == house) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new JonSnowBaratheonAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }
        afterWinnerDetermination.onHouseCardResolutionFinish();
    }
}
