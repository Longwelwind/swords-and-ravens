import EntireGame from "../EntireGame";
import GameState from "../GameState";
import User from "../../server/User";
import {ClientMessage} from "../../messages/ClientMessage";
import { ServerMessage } from "../../messages/ServerMessage";

export default class CancelledGameState extends GameState<EntireGame> {
    firstStart(): void {
    }

    onClientMessage(_user: User, _message: ClientMessage): void {
    }

    onServerMessage(_: ServerMessage): void {

    }

    getWaitedUsers(): User[] {
        return [];
    }

    serializeToClient(_user: User | null): SerializedCancelledGameState {
        return {
            type: "cancelled"
        };
    }

    static deserializeFromServer(entireGame: EntireGame, _: SerializedCancelledGameState): CancelledGameState {
        const cancelledGameState = new CancelledGameState(entireGame);

        return cancelledGameState;
    }
}

export interface SerializedCancelledGameState {
    type: "cancelled";
}