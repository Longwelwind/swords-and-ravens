import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingsAttackGameState";
import {HouseCardState} from "../house-card/HouseCard";
import MassingOnTheMilkwaterWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";

export default class MassingOnTheMilkwater extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        const highestBidder = wildlingsAttack.highestBidder;

        const usedHouseCards = highestBidder.houseCards.values.filter(hc => hc.state == HouseCardState.USED);

        usedHouseCards.forEach(hc => hc.state = HouseCardState.AVAILABLE);

        wildlingsAttack.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: highestBidder.id,
            state: HouseCardState.AVAILABLE,
            cardIds: usedHouseCards.map(hc => hc.id)
        });

        wildlingsAttack.ingame.log({
            type: "massing-on-the-milkwater-house-cards-back",
            house: highestBidder.id,
            houseCardsReturned: usedHouseCards.map(hc => hc.id)
        });

        wildlingsAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.ingame.log({
            type: "massing-on-the-milkwater-wildling-victory",
            lowestBidder: wildlingsAttack.lowestBidder.id
        });

        wildlingsAttack.setChildGameState(new MassingOnTheMilkwaterWildlingVictoryGameState(wildlingsAttack))
            .firstStart();
    }

}
