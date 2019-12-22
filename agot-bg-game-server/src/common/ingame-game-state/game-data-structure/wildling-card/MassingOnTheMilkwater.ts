import WildlingCardType from "./WildlingCardType";
import WildlingAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import {HouseCardState} from "../house-card/HouseCard";
import MassingOnTheMilkwaterWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";

export default class MassingOnTheMilkwater extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingAttackGameState): void {
        const highestBidder = wildlingAttack.highestBidder;

        const usedHouseCards = highestBidder.houseCards.values.filter(hc => hc.state == HouseCardState.USED);

        usedHouseCards.forEach(hc => hc.state = HouseCardState.AVAILABLE);

        wildlingAttack.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: highestBidder.id,
            state: HouseCardState.AVAILABLE,
            cardIds: usedHouseCards.map(hc => hc.id)
        });

        wildlingAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingAttack: WildlingAttackGameState): void {
        wildlingAttack.setChildGameState(new MassingOnTheMilkwaterWildlingVictoryGameState(wildlingAttack))
            .firstStart();
    }

}
