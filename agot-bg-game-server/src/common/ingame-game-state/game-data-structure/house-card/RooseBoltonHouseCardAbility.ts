import HouseCardAbility from "./HouseCardAbility";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";

export default class RooseBoltonHouseCardAbility extends HouseCardAbility {
    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        if (afterWinnerDetermination.postCombatGameState.loser == house) {
            const houseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.USED);
            houseCards.forEach(hc => hc.state = HouseCardState.AVAILABLE);

            afterWinnerDetermination.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: houseCards.map(hc => hc.id),
                state: HouseCardState.AVAILABLE
            });
        }

        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }
};
