import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingsAttackGameState";
import MammothRidersNightsWatchVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/mammoth-riders-nights-watch-victory-game-state/MammothRidersNightsWatchVictoryGameState";
import MammothRidersWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/mammoth-riders-wildling-victory-game-state/MammothRidersWildlingVictoryGameState";

export default class MammothRiders extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new MammothRidersNightsWatchVictoryGameState(wildlingsAttack))
            .firstStart();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new MammothRidersWildlingVictoryGameState(wildlingsAttack))
            .firstStart();
    }
}
