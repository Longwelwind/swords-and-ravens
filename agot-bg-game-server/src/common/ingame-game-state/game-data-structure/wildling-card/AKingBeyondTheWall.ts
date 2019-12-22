import WildlingCardType from "./WildlingCardType";
import WildlingAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import AKingBeyondTheWallNightsWatchVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-nights-watch-victory-game-state/AKingBeyondTheWallNightsWatchVictoryGameState";
import AKingBeyondTheWallWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";

export default class AKingBeyondTheWall extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingAttackGameState): void {
        wildlingAttack.setChildGameState(new AKingBeyondTheWallNightsWatchVictoryGameState(wildlingAttack))
            .firstStart();
    }

    executeWildlingWon(wildlingAttack: WildlingAttackGameState): void {
        wildlingAttack.setChildGameState(new AKingBeyondTheWallWildlingVictoryGameState(wildlingAttack))
            .firstStart();
    }

}
