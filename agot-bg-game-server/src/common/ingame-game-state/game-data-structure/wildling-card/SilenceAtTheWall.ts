import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import WildlingCardType from "./WildlingCardType";

export default class SilenceAtTheWall extends WildlingCardType {
    executeNightsWatchWon(wildlingAttackGameState: WildlingsAttackGameState): void {
        // Nothing happens
        wildlingAttackGameState.ingame.log({
            type: "silence-at-the-wall-executed"
        });

        wildlingAttackGameState.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingAttackGameState: WildlingsAttackGameState): void {
        // Nothing happens
        wildlingAttackGameState.ingame.log({
            type: "silence-at-the-wall-executed"
        });

        wildlingAttackGameState.onWildlingCardExecuteEnd();
    }
}
