import WildlingCard from "./WildlingCard";
import WildlingAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import WildlingCardType from "./WildlingCardType";

export default class SilenceAtTheWall extends WildlingCardType {
    executeNightsWatchWon(wildlingAttackGameState: WildlingAttackGameState): void {
        // Nothing happens
        wildlingAttackGameState.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingAttackGameState: WildlingAttackGameState): void {
        // Nothing happens
        wildlingAttackGameState.onWildlingCardExecuteEnd();
    }
}
