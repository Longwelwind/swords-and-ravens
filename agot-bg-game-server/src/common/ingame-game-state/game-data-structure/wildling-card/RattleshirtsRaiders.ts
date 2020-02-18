import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import _ from "lodash";
import RattleshirtsRaidersWildlingVictoryGameState
    from "../../westeros-game-state/wildlings-attack-game-state/rattleshirts-raiders-wildling-victory-game-state/RattleshirtsRaidersWildlingVictoryGameState";

export default class RattleshirtsRaiders extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.game.changeSupply(wildlingsAttack.highestBidder, 1);

        wildlingsAttack.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: [[wildlingsAttack.highestBidder.id, wildlingsAttack.highestBidder.supplyLevel]]
        });

        wildlingsAttack.ingame.log({
            type: "rattleshirts-raiders-nights-watch-victory",
            house: wildlingsAttack.highestBidder.id,
            newSupply: wildlingsAttack.highestBidder.supplyLevel
        });

        wildlingsAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new RattleshirtsRaidersWildlingVictoryGameState(wildlingsAttack))
            .firstStart();
    }
}
