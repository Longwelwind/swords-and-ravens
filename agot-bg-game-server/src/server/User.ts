import EntireGame from "../common/EntireGame";
import {UserSettings} from "../messages/ClientMessage";
import {observable} from "mobx";

export default class User {
    id: string;
    name: string;
    @observable settings: UserSettings;
    connectedClients: WebSocket[] = [];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    serializeToClient(): SerializedUser {
        return {
            id: this.id,
            name: this.name,
            settings: this.settings
        }
    }

    static deserializeFromServer(data: SerializedUser): User {
        return new User(data.id, data.name);
    }
}

export interface SerializedUser {
    id: string;
    name: string;
    settings: UserSettings;
}
