import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import MammothRidersNightsWatchVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/mammoth-riders-nights-watch-victory-game-state/MammothRidersNightsWatchVictoryGameState";
import MammothRidersWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/mammoth-riders-wildling-victory-game-state/MammothRidersWildlingVictoryGameState";

export default class MammothRiders extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new MammothRidersNightsWatchVictoryGameState(wildlingAttack))
            .firstStart();
    }

    executeWildlingWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new MammothRidersWildlingVictoryGameState(wildlingAttack))
            .firstStart();
    }
}
