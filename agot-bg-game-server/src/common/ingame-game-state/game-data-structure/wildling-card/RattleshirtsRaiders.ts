import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import _ from "lodash";
import RattleshirtsRaidersWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/rattleshirts-raiders-wildling-victory-game-state/RattleshirtsRaidersWildlingVictoryGameState";

export default class RattleshirtsRaiders extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.game.changeSupply(wildlingAttack.highestBidder, 1);

        wildlingAttack.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: [[wildlingAttack.highestBidder.id, wildlingAttack.highestBidder.supplyLevel]]
        });

        wildlingAttack.ingame.log({
            type: "rattleshirts-raiders-nights-watch-victory",
            house: wildlingAttack.highestBidder.id,
            newSupply: wildlingAttack.highestBidder.supplyLevel
        });

        wildlingAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new RattleshirtsRaidersWildlingVictoryGameState(wildlingAttack))
            .firstStart();
    }
}
