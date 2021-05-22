import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import DefenseOrderType from "../order-types/DefenseOrderType";
import LysaArrynModAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/lysa-arryn-mod-game-state/LysaArrynModAbilityGameState";

export default class LysaArrynModHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        const orderInDefendingRegion = afterWinnerDetermination.combatGameState.actionGameState.ordersOnBoard.tryGet(afterWinnerDetermination.combatGameState.defendingRegion, null);
        if (orderInDefendingRegion && orderInDefendingRegion.type instanceof DefenseOrderType && afterWinnerDetermination.postCombatGameState.winner == house) {
            afterWinnerDetermination.childGameState
                .setChildGameState(new LysaArrynModAbilityGameState(afterWinnerDetermination.childGameState))
                .firstStart(house);
            return;
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
}
