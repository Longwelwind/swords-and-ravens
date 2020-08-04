import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import WildlingCardType from "./WildlingCardType";

export default class SilenceAtTheWall extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttackGameState: WildlingsAttackGameState): void {
        // Nothing happens
        wildlingsAttackGameState.ingame.log({
            type: "silence-at-the-wall-executed"
        });

        wildlingsAttackGameState.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingsAttackGameState: WildlingsAttackGameState): void {
        // Nothing happens
        wildlingsAttackGameState.ingame.log({
            type: "silence-at-the-wall-executed"
        });

        wildlingsAttackGameState.onWildlingCardExecuteEnd();
    }

    highestBidderChoiceCanBeSkipped(_wildlingsAttackGameState: WildlingsAttackGameState): boolean {
        return true;
    }

    lowestBidderChoiceCanBeSkipped(_wildlingsAttackGameState: WildlingsAttackGameState): boolean {
        return true;
    }
}
