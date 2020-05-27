import EntireGame from "../EntireGame";
import GameState from "../GameState";
import User from "../../server/User";
import {ClientMessage} from "../../messages/ClientMessage";
import { ServerMessage } from "../../messages/ServerMessage";
import IngameGameState from "../ingame-game-state/IngameGameState";
import Player from "../ingame-game-state/Player";

export default class CancelledGameState extends GameState<EntireGame | IngameGameState> {
    firstStart(): void {
    }

    onClientMessage(_user: User, _message: ClientMessage): void {
    }

    onPlayerMessage(_player: Player, _message: ClientMessage): void {
    }

    onServerMessage(_: ServerMessage): void {
    }

    getWaitedUsers(): User[] {
        return [];
    }

    serializeToClient(_admin: boolean, _user: User | Player | null): SerializedCancelledGameState {
        return {
            type: "cancelled"
        };
    }

    static deserializeFromServer(parentGameState: EntireGame | IngameGameState, _: SerializedCancelledGameState): CancelledGameState {
        const cancelledGameState = new CancelledGameState(parentGameState);

        return cancelledGameState;
    }
}

export interface SerializedCancelledGameState {
    type: "cancelled";
}