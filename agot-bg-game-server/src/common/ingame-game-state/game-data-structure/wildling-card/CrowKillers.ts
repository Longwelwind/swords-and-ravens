import WildlingCardType from "./WildlingCardType";
import WildlingAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import CrowKillersWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";

export default class CrowKillers extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingAttackGameState): void {
    }

    executeWildlingWon(wildlingAttack: WildlingAttackGameState): void {
        wildlingAttack.setChildGameState(new CrowKillersWildlingVictoryGameState(wildlingAttack)).firstStart();
    }
}
