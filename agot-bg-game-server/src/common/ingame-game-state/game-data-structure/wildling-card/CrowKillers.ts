import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import CrowKillersWildlingVictoryGameState
    from "../../westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import CrowKillersNightsWatchVictoryGameState
    from "../../westeros-game-state/wildlings-attack-game-state/crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";

export default class CrowKillers extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new CrowKillersNightsWatchVictoryGameState(wildlingsAttack)).firstStart();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new CrowKillersWildlingVictoryGameState(wildlingsAttack)).firstStart();
    }
}
