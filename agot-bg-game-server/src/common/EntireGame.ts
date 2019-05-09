import GameState, {SerializedGameState} from "./GameState";
import LobbyGameState, {SerializedLobbyGameState} from "./lobby-game-state/LobbyGameState";
import IngameGameState, {SerializedIngameGameState} from "./ingame-game-state/IngameGameState";
import {ServerMessage} from "../messages/ServerMessage";
import {ClientMessage} from "../messages/ClientMessage";
import User, {SerializedUser} from "../server/User";
import {observable} from "mobx";
import * as _ from "lodash";
import GameLogManager, {SerializedGameLogManager} from "./GameLogManager";
import BetterMap from "../utils/BetterMap";
import Game from "./ingame-game-state/game-data-structure/Game";
import House from "./ingame-game-state/game-data-structure/House";

export default class EntireGame extends GameState<null, LobbyGameState | IngameGameState> {
    id: string;

    @observable users = new BetterMap<string, User>();
    gameLogManager: GameLogManager = new GameLogManager(this);
    ownerUserId: string;

    onSendClientMessage: (message: ClientMessage) => void;
    onSendServerMessage: (users: User[], message: ServerMessage) => void;

    constructor(id: string, ownerId: string) {
        super(null);
        this.id = id;
        this.ownerUserId = ownerId;
    }

    firstStart() {
        this.setChildGameState(new LobbyGameState(this)).firstStart();
    }

    log(...lines: string[]) {
        this.gameLogManager.log(lines.join("\n"));
    }

    proceedToIngameGameState(futurePlayers: BetterMap<string, User>) {
        this.setChildGameState(new IngameGameState(this)).beginGame(futurePlayers);

        this.checkGameStateChanged();
    }

    checkGameStateChanged() {
        const {level, gameState} = this.getFirstGameStateToBeRetransmitted();

        if (gameState) {
            // The GameState tree has been changed, broadcast a message to transmit to them
            // the new game state.
            this.broadcastCustomToClients(u => {
                // To serialize the specific game state that has changed, the code serializes the entire
                // game state tree and pick the appropriate serializedGameState.
                // TODO: Find less wasteful way of doing this
                const serializedEntireGame = this.serializeToClient(u);
                const serializedGameState = _.range(level).reduce((s, _) => s.childGameState, serializedEntireGame as SerializedGameState);

                if (!serializedGameState) {
                    throw new Error();
                }

                return {
                    type: "game-state-change",
                    level,
                    serializedGameState
                };
            });

            // Mark everything as transmitted
            let gameState: GameState<any, any> | null = this;
            while (gameState != null) {
                gameState.needsToBeTransmittedToClient = false;

                gameState = gameState.childGameState;
            }
        }
    }

    isOwner(user: User): boolean {
        return user.id == this.ownerUserId;
    }

    addUser(userId: string, userName: string): User {
        const user = new User(userId, userName, this);
        this.users.set(user.id, user);

        this.broadcastToClients({
            type: "new-user",
            user: user.serializeToClient()
        });

        return user;
    }

    onClientMessage(user: User, message: ClientMessage) {
        this.childGameState.onClientMessage(user, message);

        this.checkGameStateChanged();
    }

    onServerMessage(message: ServerMessage) {
        if (message.type == "game-state-change") {
            const {level, serializedGameState} = message;

            // Get the GameState for whose the childGameState must change
            const parentGameState = this.getGameStateNthLevelDown(level - 1);
            parentGameState.childGameState = parentGameState.deserializeChildGameState(serializedGameState);
        } else if (message.type == "game-log") {
            this.gameLogManager.logs.push({message: message.message, time: new Date(message.time * 1000)});
        } else if (message.type == "new-user") {
            const user = User.deserializeFromServer(this, message.user);

            this.users.set(user.id, user);
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    broadcastToClients(message: ServerMessage) {
        this.sendMessageToClients(this.users.values, message);
    }

    sendMessageToServer(message: ClientMessage) {
        this.onSendClientMessage(message);
    }

    broadcastCustomToClients(craftMessage: (u: User) => ServerMessage) {
        this.users.values.forEach(u => {
            this.sendMessageToClients([u], craftMessage(u));
        });
    }

    sendMessageToClients(users: User[], message: ServerMessage) {
        this.onSendServerMessage(users, message);
    }

    getStateOfGame(): string {
        if (this.childGameState instanceof LobbyGameState) {
            return "IN_LOBBY";
        } else {
            return "ONGOING";
        }
    }

    getViewOfGame(): any {
        // Creating a view of the current turn of the game
        const turn = this.childGameState instanceof IngameGameState
            ? this.childGameState.game.turn
            : -1;

        return {turn};
    }

    getPlayersInGame(): {userId: string; data: object}[] {
        const players: {userId: string; data: object}[] = [];
        if (this.childGameState instanceof LobbyGameState) {
            this.childGameState.players.forEach((user, house) => {
                players.push({
                    userId: user.id,
                    data: {"house": house.id}
                });
            });
        } else if (this.childGameState instanceof IngameGameState) {
            this.childGameState.players.forEach((player, user) => {
                players.push({
                    userId: user.id,
                    data: {"house": player.house.id}
                });
            });
        }

        return players;
    }

    serializeToClient(user: User | null): SerializedEntireGame {
        return {
            id: this.id,
            users: this.users.values.map(u => u.serializeToClient()),
            ownerUserId: this.ownerUserId,
            gameLogManager: this.gameLogManager.serializeToClient(),
            childGameState: this.childGameState.serializeToClient(user)
        };
    }

    static deserializeFromServer(data: SerializedEntireGame): EntireGame {
        const entireGame = new EntireGame(data.id, data.ownerUserId);

        entireGame.users = new BetterMap<string, User>(data.users.map((ur: any) => [ur.id, User.deserializeFromServer(entireGame, ur)]));
        entireGame.ownerUserId = data.ownerUserId;
        entireGame.gameLogManager = GameLogManager.deserializeFromServer(entireGame, data.gameLogManager);
        entireGame.childGameState = entireGame.deserializeChildGameState(data.childGameState);

        return entireGame;
    }

    deserializeChildGameState(data: SerializedEntireGame["childGameState"]) {
        if (data.type == "lobby") {
            return LobbyGameState.deserializeFromServer(this, data);
        } else if (data.type == "ingame") {
            return IngameGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedEntireGame {
    id: string;
    users: SerializedUser[];
    ownerUserId: string;
    gameLogManager: SerializedGameLogManager;
    childGameState: SerializedLobbyGameState | SerializedIngameGameState;
}
