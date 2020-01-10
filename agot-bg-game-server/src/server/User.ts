import {ServerMessage} from "../messages/ServerMessage";
import * as WebSocket from "ws";
import EntireGame from "../common/EntireGame";
import {UserSettings} from "../messages/ClientMessage";
import {observable} from "mobx";

export default class User {
    id: string;
    name: string;
    @observable settings: UserSettings;
    entireGame: EntireGame;
    connectedClients: WebSocket[] = [];

    constructor(id: string, name: string, game: EntireGame, settings: UserSettings = {pbemMode: false}) {
        this.id = id;
        this.name = name;
        this.settings = settings;
        this.entireGame = game;
    }

    send(message: ServerMessage) {
        this.entireGame.sendMessageToClients([this], message);
    }

    syncSettings(): void {
        this.entireGame.sendMessageToServer({
            type: "change-settings",
            settings: this.settings
        });
    }

    serializeToClient(): SerializedUser {
        return {
            id: this.id,
            name: this.name,
            settings: this.settings
        }
    }

    static deserializeFromServer(game: EntireGame, data: SerializedUser): User {
        return new User(data.id, data.name, game, data.settings);
    }
}

export interface SerializedUser {
    id: string;
    name: string;
    settings: UserSettings;
}
