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

        this.ingame.entireGame.hideOrRevealUserNames(true);

        // Send reveal-all-objectives before winner-declared
        if (this.entireGame.isFeastForCrows) {
            this.ingame.log({
                type: "reveal-all-objectives",
                objectivesOfHouses: this.ingame.game.getPotentialWinners().filter(h => !this.ingame.isVassalHouse(h)).reverse().map(h => [
                    h.id, h.secretObjectives.map(oc => oc.id)
                ] as [string, string[]])
            });
        }

        this.ingame.log({
            type: "winner-declared",
            winner: winner.id
        });

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
