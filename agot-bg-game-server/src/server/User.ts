import {ServerMessage} from "../messages/ServerMessage";
import * as WebSocket from "ws";
import EntireGame from "../common/EntireGame";

export default class User {
    id: string;
    name: string;
    entireGame: EntireGame;
    connectedClients: WebSocket[] = [];

    constructor(id: string, name: string, game: EntireGame) {
        this.id = id;
        this.name = name;
        this.entireGame = game;
    }

    send(message: ServerMessage) {
        this.entireGame.sendMessageToClients([this], message);
    }

    serializeToClient(): SerializedUser {
        return {
            id: this.id,
            name: this.name
        }
    }

    static deserializeFromServer(game: EntireGame, data: SerializedUser): User {
        return new User(data.id, data.name, game);
    }
}

export interface SerializedUser {
    id: string;
    name: string;
}
