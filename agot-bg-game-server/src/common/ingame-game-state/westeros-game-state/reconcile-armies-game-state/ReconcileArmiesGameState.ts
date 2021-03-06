import GameState from "../../../GameState";
import PlayerReconcileArmiesGameState, {SerializedPlayerReconcileArmiesGameState} from "./player-reconcile-armies-game-state/PlayerReconcileArmiesGameState";
import House from "../../game-data-structure/House";
import Game from "../../game-data-structure/Game";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";

interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;
    onReconcileArmiesGameStateEnd(): void;
}

export default class ReconcileArmiesGameState<P extends ParentGameState> extends GameState<P, PlayerReconcileArmiesGameState> {

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.proceedReconcileArmies(null);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    proceedReconcileArmies(lastReconciled: House | null): void {
        if (lastReconciled == this.game.ironThroneTrack[this.game.ironThroneTrack.length - 1]) {
            this.parentGameState.onReconcileArmiesGameStateEnd();
            return;
        }

        const nextHouseToReconcile = lastReconciled ? this.ingame.getNextInTurnOrder(lastReconciled) : this.game.ironThroneTrack[0];

        // Check if this house needs to reconcile armies
        if (this.game.hasTooMuchArmies(nextHouseToReconcile)) {
            this.setChildGameState(new PlayerReconcileArmiesGameState(this)).firstStart(nextHouseToReconcile);
        } else {
            this.proceedReconcileArmies(nextHouseToReconcile);
        }
    }

    onPlayerReconcileArmiesGameStateEnd(house: House): void {
        this.proceedReconcileArmies(house);
    }

    serializeToClient(): SerializedReconcileArmiesGameState {
        return {
            type: "reconcile-armies",
            childGameState: this.childGameState.serializeToClient()
        };
    }

    static deserializeFromServer(parent: ParentGameState, data: SerializedReconcileArmiesGameState): ReconcileArmiesGameState<any> {
        const reconcileArmies = new ReconcileArmiesGameState(parent);
        reconcileArmies.childGameState = reconcileArmies.deserializeChildGameState(data.childGameState);
        return reconcileArmies;
    }

    deserializeChildGameState(data: SerializedPlayerReconcileArmiesGameState): PlayerReconcileArmiesGameState {
        return PlayerReconcileArmiesGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedReconcileArmiesGameState {
    type: "reconcile-armies";
    childGameState: SerializedPlayerReconcileArmiesGameState;
}
