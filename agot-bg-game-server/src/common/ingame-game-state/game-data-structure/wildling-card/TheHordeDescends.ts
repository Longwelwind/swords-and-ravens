import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import TheHordeDescendsNightsWatchVictoryGameState
    from "../../westeros-game-state/wildlings-attack-game-state/the-horde-descends-nights-watch-victory-game-state/TheHordeDescendsNightsWatchVictoryGameState";
import TheHordeDescendsWildlingVictoryGameState
    from "../../westeros-game-state/wildlings-attack-game-state/the-horde-descends-wildling-victory-game-state/TheHordeDescendsWildlingVictoryGameState";

export default class TheHordeDescends extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new TheHordeDescendsNightsWatchVictoryGameState(wildlingsAttack)).firstStart();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new TheHordeDescendsWildlingVictoryGameState(wildlingsAttack)).firstStart();
    }

}
