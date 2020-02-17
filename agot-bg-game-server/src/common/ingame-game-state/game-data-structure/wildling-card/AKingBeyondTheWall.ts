import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingsAttackGameState";
import AKingBeyondTheWallNightsWatchVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-nights-watch-victory-game-state/AKingBeyondTheWallNightsWatchVictoryGameState";
import AKingBeyondTheWallWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";

export default class AKingBeyondTheWall extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new AKingBeyondTheWallNightsWatchVictoryGameState(wildlingsAttack))
            .firstStart();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new AKingBeyondTheWallWildlingVictoryGameState(wildlingsAttack))
            .firstStart();
    }

}
