import GameState, {SerializedGameState} from "./GameState";
import LobbyGameState, {SerializedLobbyGameState} from "./lobby-game-state/LobbyGameState";
import IngameGameState, {SerializedIngameGameState} from "./ingame-game-state/IngameGameState";
import {ServerMessage} from "../messages/ServerMessage";
import {ClientMessage} from "../messages/ClientMessage";
import User, {SerializedUser} from "../server/User";
import {observable} from "mobx";
import * as _ from "lodash";
import BetterMap from "../utils/BetterMap";
import GameEndedGameState from "./ingame-game-state/game-ended-game-state/GameEndedGameState";

export default class EntireGame extends GameState<null, LobbyGameState | IngameGameState> {
    id: string;

    @observable users = new BetterMap<string, User>();
    ownerUserId: string;

    onSendClientMessage: (message: ClientMessage) => void;
    onSendServerMessage: (users: User[], message: ServerMessage) => void;
    onWaitedUsers: (users: User[]) => void;
    publicChatRoomId: string;
    // Keys are the two users participating in the private chat.
    // A pair of user is sorted alphabetically by their id when used as a key.
    @observable privateChatRoomsIds: BetterMap<User, BetterMap<User, string>> = new BetterMap();

    constructor(id: string, ownerId: string) {
        super(null);
        this.id = id;
        this.ownerUserId = ownerId;
    }

    firstStart(): void {
        this.setChildGameState(new LobbyGameState(this)).firstStart();
    }

    proceedToIngameGameState(futurePlayers: BetterMap<string, User>): void {
        this.setChildGameState(new IngameGameState(this)).beginGame(futurePlayers);

        this.checkGameStateChanged();
    }

    checkGameStateChanged(): void {
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

            // Get which users' turn it is
            const users = this.leafState.getWaitedUsers().filter(u => u.settings.pbemMode);
            if (this.onWaitedUsers) {
                this.onWaitedUsers(users);
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

    onClientMessage(user: User, message: ClientMessage): void {
        if (message.type == "change-settings") {
            user.settings = message.settings;

            this.broadcastToClients({
                type: "settings-changed",
                user: user.id,
                settings: user.settings
            })
        } else {
            this.childGameState.onClientMessage(user, message);
        }


        this.checkGameStateChanged();
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "game-state-change") {
            const {level, serializedGameState} = message;

            // Get the GameState for whose the childGameState must change
            const parentGameState = this.getGameStateNthLevelDown(level - 1);
            parentGameState.childGameState = parentGameState.deserializeChildGameState(serializedGameState);
        } else if (message.type == "new-user") {
            const user = User.deserializeFromServer(this, message.user);

            this.users.set(user.id, user);
        } else if (message.type == "settings-changed") {
            const user = this.users.get(message.user);

            user.settings = message.settings;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    broadcastToClients(message: ServerMessage): void {
        this.sendMessageToClients(this.users.values, message);
    }

    sendMessageToServer(message: ClientMessage): void {
        this.onSendClientMessage(message);
    }

    broadcastCustomToClients(craftMessage: (u: User) => ServerMessage): void {
        this.users.values.forEach(u => {
            this.sendMessageToClients([u], craftMessage(u));
        });
    }

    sendMessageToClients(users: User[], message: ServerMessage): void {
        this.onSendServerMessage(users, message);
    }

    getStateOfGame(): string {
        if (this.childGameState instanceof LobbyGameState) {
            return "IN_LOBBY";
        } else {
            const ingame = this.childGameState;
            if (ingame.childGameState instanceof GameEndedGameState) {
                return "FINISHED";
            }
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
            const waitedForUsers = this.childGameState.getWaitedUsers();

            this.childGameState.players.forEach((player, user) => {
                players.push({
                    userId: user.id,
                    data: {"house": player.house.id, "waited_for": waitedForUsers.includes(user)}
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
            publicChatRoomId: this.publicChatRoomId,
            privateChatRoomIds: this.privateChatRoomsIds.map((u1, v) => [u1.id, v.map((u2, rid) => [u2.id, rid])]),
            childGameState: this.childGameState.serializeToClient(user)
        };
    }

    static deserializeFromServer(data: SerializedEntireGame): EntireGame {
        const entireGame = new EntireGame(data.id, data.ownerUserId);

        entireGame.users = new BetterMap<string, User>(data.users.map((ur: any) => [ur.id, User.deserializeFromServer(entireGame, ur)]));
        entireGame.ownerUserId = data.ownerUserId;
        entireGame.childGameState = entireGame.deserializeChildGameState(data.childGameState);
        entireGame.publicChatRoomId = data.publicChatRoomId;
        entireGame.privateChatRoomsIds = new BetterMap(data.privateChatRoomIds.map(([uid1, bm]) => [
            entireGame.users.get(uid1),
            new BetterMap(bm.map(([uid2, roomId]) => [entireGame.users.get(uid2), roomId]))
        ]));

        return entireGame;
    }

    deserializeChildGameState(data: SerializedEntireGame["childGameState"]): IngameGameState | LobbyGameState {
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
    childGameState: SerializedLobbyGameState | SerializedIngameGameState;
    publicChatRoomId: string;
    privateChatRoomIds: [string, [string, string][]][];
}
