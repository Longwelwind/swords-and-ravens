import {ServerMessage} from "../messages/ServerMessage";
import * as WebSocket from "ws";
import EntireGame from "../common/EntireGame";
import {UserSettings} from "../messages/ClientMessage";
import {observable} from "mobx";

export default class User {
    id: string;
    @observable name: string;
    @observable settings: UserSettings;
    entireGame: EntireGame;
    connectedClients: WebSocket[] = [];
    @observable otherUsersFromSameNetwork: string[] = [];
    @observable connected: boolean;
    @observable note = "";

    constructor(id: string, name: string, game: EntireGame, settings: UserSettings, connected = false, otherUsersFromSameNetwork: string[] = []) {
        this.id = id;
        this.name = name;
        this.settings = settings;
        this.entireGame = game;
        this.connected = connected;
        this.otherUsersFromSameNetwork = otherUsersFromSameNetwork;
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

    serializeToClient(admin: boolean, user: User | null, hideUserName: boolean): SerializedUser {
        return {
            id: this.id,
            name: admin ? this.name : hideUserName ? "Jaqen H'ghar": this.name,
            settings: this.settings,
            connected: this.connected,
            otherUsersFromSameNetwork: this.otherUsersFromSameNetwork,
            note: admin || user == this ? this.note : ""
        }
    }

    static deserializeFromServer(game: EntireGame, data: SerializedUser): User {
        const user = new User(data.id, data.name, game, data.settings, data.connected, data.otherUsersFromSameNetwork);
        user.note = data.note;
        return user;
    }
}

export interface SerializedUser {
    id: string;
    name: string;
    settings: UserSettings;
    connected: boolean;
    otherUsersFromSameNetwork: string[];
    note: string;
}
