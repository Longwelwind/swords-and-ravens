import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import TheHordeDescendsNightsWatchVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/the-horde-descends-nights-watch-victory-game-state/TheHordeDescendsNightsWatchVictoryGameState";
import TheHordeDescendsWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/the-horde-descends-wildling-victory-game-state/TheHordeDescendsWildlingVictoryGameState";

export default class TheHordeDescends extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new TheHordeDescendsNightsWatchVictoryGameState(wildlingAttack)).firstStart();
    }

    executeWildlingWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new TheHordeDescendsWildlingVictoryGameState(wildlingAttack)).firstStart();
    }

}
