import GameState from "../../GameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";
import { NotificationType } from "../../EntireGame";

export default class GameEndedGameState extends GameState<IngameGameState> {
    winner: House;

    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    firstStart(winner: House): void {
        this.winner = winner;

        this.entireGame.notifyUsers(this.ingame.players.keys, NotificationType.GAME_ENDED);
    }

    onPlayerMessage(_player: Player, _message: ClientMessage): void {

    }

    onServerMessage(_message: ServerMessage): void {
    }

    getWaitedUsers(): User[] {
        return [];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedGameEndedGameState{
        return {
            type: "game-ended",
            winner: this.winner.id
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedGameEndedGameState): GameEndedGameState {
        const gameEnded = new GameEndedGameState(ingame);

        gameEnded.winner = ingame.game.houses.get(data.winner);

        return gameEnded;
    }
}

export interface SerializedGameEndedGameState {
    type: "game-ended";
    winner: string;
}
