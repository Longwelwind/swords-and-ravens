import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import House from "../House";
import * as _ from "lodash";
import PreemptiveRaidWildlingVictoryGameState
    from "../../westeros-game-state/wildlings-attack-game-state/preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";

export default class PreemptiveRaidWildlingCardType extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        const wildlingStrength = 6;

        wildlingsAttack.game.wildlingStrength = wildlingStrength;
        wildlingsAttack.entireGame.broadcastToClients({
            type: "change-wildling-strength",
            wildlingStrength: wildlingStrength
        });

        wildlingsAttack.ingame.log({
            type: "preemptive-raid-wildlings-attack",
            house: wildlingsAttack.highestBidder.id,
            wildlingStrength: wildlingStrength
        });

        wildlingsAttack.entireGame.broadcastToClients({
            type: "preemptive-raid-new-attack",
            biddings: wildlingsAttack.biddingResults?.map(([bid, houses]) => [bid, houses.map(h => h.id)]) ?? [],
            highestBidder: (wildlingsAttack._highestBidder as House).id
        });

        wildlingsAttack.parentGameState
            .setChildGameState(new WildlingsAttackGameState(wildlingsAttack.parentGameState))
            .firstStart(wildlingStrength, _.difference(wildlingsAttack.game.houses.values, [wildlingsAttack.highestBidder as House]));
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        wildlingsAttack.setChildGameState(new PreemptiveRaidWildlingVictoryGameState(wildlingsAttack)).firstStart();
    }
}
