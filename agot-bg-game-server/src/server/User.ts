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
    @observable connected: boolean;

    constructor(id: string, name: string, game: EntireGame, settings: UserSettings = {mapScrollbar: false, lastOpenedTab: null}, connected = false) {
        this.id = id;
        this.name = name;
        this.settings = settings;
        this.entireGame = game;
        this.connected = connected;
    }

    send(message: ServerMessage): void {
        this.entireGame.sendMessageToClients([this], message);
    }

    syncSettings(): void {
        this.entireGame.sendMessageToServer({
            type: "change-settings",
            settings: this.settings
        });
    }

    updateConnectionStatus(): void {
        const newConnected = this.connectedClients.length > 0;

        if (newConnected != this.connected) {
            this.connected = newConnected;

            this.entireGame.broadcastToClients({
                type: "update-connection-status",
                user: this.id,
                status: this.connected
            });
        }
    }

    serializeToClient(): SerializedUser {
        return {
            id: this.id,
            name: this.name,
            settings: this.settings,
            connected: this.connected
        }
    }

    static deserializeFromServer(game: EntireGame, data: SerializedUser): User {
        return new User(data.id, data.name, game, data.settings, data.connected);
    }
}

export interface SerializedUser {
    id: string;
    name: string;
    settings: UserSettings;
    connected: boolean;
}
