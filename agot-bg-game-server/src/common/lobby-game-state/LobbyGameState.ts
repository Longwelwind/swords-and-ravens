import EntireGame from "../EntireGame";
import GameState from "../GameState";
import User from "../../server/User";
import {ClientMessage} from "../../messages/ClientMessage";
import {ServerMessage} from "../../messages/ServerMessage";
import {observable} from "mobx";
import BetterMap from "../../utils/BetterMap";
import baseGameData from "../../../data/baseGameData.json";

export default class LobbyGameState extends GameState<EntireGame> {
    lobbyHouses: BetterMap<string, LobbyHouse>;
    @observable players = new BetterMap<LobbyHouse, User>();

    get entireGame(): EntireGame {
        return this.parentGameState;
    }

    firstStart(): void {
        // Load the available houses for this game
        this.lobbyHouses = this.getLobbyHouses();
    }

    getLobbyHouses(): BetterMap<string, LobbyHouse> {
        return new BetterMap(
            Object.entries(baseGameData.houses)
                .map(([hid, h]) => [hid, {id: hid, name: h.name, color: h.color}])
        );
    }

    getAvailableHouses(): LobbyHouse[] {
        return this.lobbyHouses.values.filter(h => this.entireGame.gameSetup.houses.includes(h.id));
    }

    onGameSettingsChange(): void {
        // Remove all chosen houses that are not available with the new settings
        const availableHouses = this.getAvailableHouses();
        let dirty = false;
        this.players.forEach((user, house) => {
            if (!availableHouses.includes(house)) {
                dirty = true;
                this.players.delete(house);
            }
        });

        if (dirty) {
            this.entireGame.broadcastToClients({
                type: "house-chosen",
                players: this.players.entries.map(([house, user]) => [house.id, user.id])
            });
        }
    }

    onClientMessage(user: User, message: ClientMessage): void {
        if (message.type == "launch-game") {
            if (!this.entireGame.isOwner(user)) {
                return;
            }

            if (!this.canStartGame(user).success) {
                return;
            }

            this.entireGame.proceedToIngameGameState(new BetterMap(this.players.map((h, u) => ([h.id, u]))));
        } else if (message.type == "choose-house") {
            const house = message.house ? this.lobbyHouses.get(message.house) : null;

            // Check if the house is available
            if (house && this.players.has(house)) {
                return;
            }

            this.players.forEach((houseUser, house) => {
                if (user == houseUser) {
                    this.players.delete(house);
                }
            });
            if (house) {
                this.players.set(house, user);
            }

            this.entireGame.broadcastToClients({
                type: "house-chosen",
                players: this.players.entries.map(([house, user]) => [house.id, user.id])
            });
        }
    }

    canStartGame(user: User): {success: boolean; reason: string} {
        if (!this.entireGame.isOwner(user)) {
            return {success: false, reason: "not-owner"};
        }

        if (this.players.size < this.getAvailableHouses().length) {
            return {success: false, reason: "not-enough-players"};
        }

        return {success: true, reason: "ok"};
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "house-chosen") {
            this.players = new BetterMap(message.players.map(([hid, uid]) => [
                this.lobbyHouses.get(hid),
                this.entireGame.users.get(uid)
            ]));
        }
    }

    chooseHouse(house: LobbyHouse | null): void {
        this.entireGame.sendMessageToServer({
            type: "choose-house",
            house: house ? house.id : null
        });
    }

    start(): void {
        this.entireGame.sendMessageToServer({
            type: "launch-game"
        });
    }

    getWaitedUsers(): User[] {
        return [];
    }

    getPhaseName(): string {
        return "Lobby";
    }

    serializeToClient(_user: User | null): SerializedLobbyGameState {
        return {
            type: "lobby",
            lobbyHouses: this.lobbyHouses.values,
            players: this.players.entries.map(([h, u]) => [h.id, u.id])
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedLobbyGameState): LobbyGameState {
        const lobbyGameState = new LobbyGameState(entireGame);

        lobbyGameState.lobbyHouses = new BetterMap(data.lobbyHouses.map(h => [h.id, h]));
        lobbyGameState.players = new BetterMap(data["players"].map(([hid, uid]) => [lobbyGameState.lobbyHouses.get(hid), entireGame.users.get(uid)]));

        return lobbyGameState;
    }
}

export interface SerializedLobbyGameState {
    type: "lobby";
    players: [string, string][];
    lobbyHouses: LobbyHouse[];
}

export interface LobbyHouse {
    id: string;
    name: string;
    color: string;
}
