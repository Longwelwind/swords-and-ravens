import GameState from "../../../GameState";
import WildlingsAttackGameState from "./WildlingsAttackGameState";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import { findOrphanedShipsAndDestroyThem } from "../../port-helper/PortHelper";

/**
 * A lot of Wildling Cards have the same logic where the lowest bidder
 * must do something, and then all the other houses, in turn order, do a slightly different thing.
 *
 * This class helps implement these kind of Wildling Cards by extracting the
 * "in turn order, [action]" part of the logic, and let child classes implement
 * the "[action]".
 *
 * In practice, the child classes will implement the two abstract methods.
 * These two methods must make sure that, at some point, `onExecuteFinish` is called
 * so that the execution of the card can proceed.
 */
export default abstract class WildlingCardEffectInTurnOrderGameState<C extends GameState<any, any>> extends GameState<WildlingsAttackGameState, C> {
    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        this.proceedNextHouse(null);
    }

    onExecuteFinish(house: House): void {
        this.proceedNextHouse(house);
    }

    proceedNextHouse(previousHouse: House | null): void {
        // Some wildlings effects may cause units to be killed.
        // Therefore an orphaned ship may be present here. Try to find it and destroy it in that case
        findOrphanedShipsAndDestroyThem(this.game.world, this.parentGameState.ingame, null);

        if (previousHouse == null) {
            this.executeForLowestBidder(this.parentGameState.lowestBidder);
            return;
        }

        const nextHouse = this.getNextHouseInEveryoneElse(previousHouse);

        if (nextHouse == null) {
            // The execution of the card is finished
            this.parentGameState.onWildlingCardExecuteEnd();
            return;
        }

        if (this.parentGameState.ingame.isVassalHouse(nextHouse)) {
            // This may happen when a house is replaced by a vassal during this game state
            this.proceedNextHouse(nextHouse);
            return;
        }

        this.executeForEveryoneElse(nextHouse);
    }

    getNextHouseInEveryoneElse(previousHouse: House): House | null {
        // Compute the turn order only with the participants of the wildlings attack and without
        // the lowest bidder.
        const turnOrder = this.parentGameState.game.ironThroneTrack
            .filter(h => h != this.parentGameState.lowestBidder)
            .filter(h => this.parentGameState.participatingHouses.includes(h));
            // The vassal houses don't need to be filtered out here as
            // participatingHouses are already filtered for non-vassals when starting the game state.
            // This way the next house can be determined even if a player is replaced by a vassal
            // during execution of a wildling penalty.
            // .filter(h => !this.parentGameState.ingame.isVassalHouse(h));

        // If the previous house is the lowest bidder, begin the "Everyone else" phase of the
        // card.
        if (previousHouse == this.parentGameState.lowestBidder) {
            return turnOrder[0];
        }

        // Otherwise, proceed with the next house in turn order
        const i = turnOrder.indexOf(previousHouse);

        if (i == -1) {
            // Should never happen, as it is sure that previousHouse is in turnOrder
            throw new Error();
        }

        if (i == turnOrder.length - 1) {
            // This was the last "Everyone else" house
            return null;
        }

        return turnOrder[i + 1];
    }

    abstract executeForLowestBidder(house: House): void;
    abstract executeForEveryoneElse(house: House): void;
}
