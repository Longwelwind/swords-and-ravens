import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import CrowKillersWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import CrowKillersNightsWatchVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";

export default class CrowKillers extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new CrowKillersNightsWatchVictoryGameState(wildlingAttack)).firstStart();
    }

    executeWildlingWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new CrowKillersWildlingVictoryGameState(wildlingAttack)).firstStart();
    }
}
