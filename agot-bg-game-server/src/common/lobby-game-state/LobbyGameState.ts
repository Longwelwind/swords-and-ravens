import EntireGame from "../EntireGame";
import GameState from "../GameState";
import User from "../../server/User";
import {ClientMessage} from "../../messages/ClientMessage";
import {ServerMessage} from "../../messages/ServerMessage";
import {observable} from "mobx";
import BetterMap from "../../utils/BetterMap";
import baseGameData from "../../../data/baseGameData.json";

export default class LobbyGameState extends GameState<EntireGame> {
    availableHouses: BetterMap<string, LobbyHouse>;
    @observable players = new BetterMap<LobbyHouse, User>();

    get entireGame(): EntireGame {
        return this.parentGameState;
    }

    firstStart(): void {
        // Load the available houses for this game
        this.availableHouses = this.getAvailableHouses();
    }

    getAvailableHouses(): BetterMap<string, LobbyHouse> {
        return new BetterMap(
            Object.entries(baseGameData.houses).map(([hid, h]) => [hid, {id: hid, name: h.name, color: h.color}])
        );
    }

    onClientMessage(user: User, message: ClientMessage): void {
        if (message.type == "launch-game") {
            if (!this.entireGame.isOwner(user)) {
                return;
            }

            if (!this.canStartGame()) {
                return;
            }

            this.entireGame.proceedToIngameGameState(new BetterMap(this.players.map((h, u) => ([h.id, u]))));
        } else if (message.type == "choose-house") {
            const house = this.availableHouses.get(message.house);

            // Check if the house is available
            if (this.players.has(house)) {
                return;
            }

            this.players.forEach((houseUser, house) => {
                if (user == houseUser) {
                    this.players.delete(house);
                }
            });
            this.players.set(house, user);

            this.entireGame.broadcastToClients({
                type: "house-chosen",
                players: this.players.entries.map(([house, user]) => [house.id, user.id])
            });
        }
    }

    canStartGame(): boolean {
        return this.players.size >= 1;
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "house-chosen") {
            this.players = new BetterMap(message.players.map(([hid, uid]) => [
                this.availableHouses.get(hid),
                this.entireGame.users.get(uid)
            ]));
        }
    }

    chooseHouse(house: LobbyHouse): void {
        this.entireGame.sendMessageToServer({
            type: "choose-house",
            house: house.id
        });
    }

    start(): void {
        this.entireGame.sendMessageToServer({
            type: "launch-game"
        });
    }

    getPhaseName(): string {
        return "Lobby";
    }

    serializeToClient(user: User | null): SerializedLobbyGameState {
        return {
            type: "lobby",
            availableHouses: this.availableHouses.values,
            players: this.players.entries.map(([h, u]) => [h.id, u.id])
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedLobbyGameState): LobbyGameState {
        const lobbyGameState = new LobbyGameState(entireGame);

        lobbyGameState.availableHouses = new BetterMap(data.availableHouses.map(h => [h.id, h]));
        lobbyGameState.players = new BetterMap(data["players"].map(([hid, uid]) => [lobbyGameState.availableHouses.get(hid), entireGame.users.get(uid)]));

        return lobbyGameState;
    }
}

export interface SerializedLobbyGameState {
    type: "lobby";
    players: [string, string][];
    availableHouses: LobbyHouse[];
}

export interface LobbyHouse {
    id: string;
    name: string;
    color: string;
}
