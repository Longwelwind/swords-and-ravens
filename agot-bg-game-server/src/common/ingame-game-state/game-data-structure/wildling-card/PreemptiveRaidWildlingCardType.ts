import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import House from "../House";
import * as _ from "lodash";
import PreemptiveRaidWildlingVictoryGameState
    from "../../westeros-game-state/wildling-attack-game-state/preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";

export default class PreemptiveRaidWildlingCardType extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingsAttackGameState): void {
        const wildlingStrength = 6;

        wildlingAttack.ingame.log({
            type: "preemptive-raid-wildlings-attack",
            house: wildlingAttack.highestBidder.id,
            wildlingStrength: wildlingStrength
        });

        wildlingAttack.parentGameState
            .setChildGameState(new WildlingsAttackGameState(wildlingAttack.parentGameState))
            .firstStart(wildlingStrength, _.difference(wildlingAttack.game.houses.values, [wildlingAttack.highestBidder as House]));
    }

    executeWildlingWon(wildlingAttack: WildlingsAttackGameState): void {
        wildlingAttack.setChildGameState(new PreemptiveRaidWildlingVictoryGameState(wildlingAttack)).firstStart();
    }
}
