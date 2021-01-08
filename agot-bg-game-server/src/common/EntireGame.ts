import GameState, {SerializedGameState} from "./GameState";
import LobbyGameState, {SerializedLobbyGameState} from "./lobby-game-state/LobbyGameState";
import IngameGameState, {SerializedIngameGameState} from "./ingame-game-state/IngameGameState";
import {ServerMessage} from "../messages/ServerMessage";
import {ClientMessage} from "../messages/ClientMessage";
import * as baseGameData from "../../data/baseGameData.json";
import * as aDanceWithDragonsData from "../../data/aDanceWithDragonsData.json"
import User, {SerializedUser} from "../server/User";
import {observable} from "mobx";
import * as _ from "lodash";
import BetterMap from "../utils/BetterMap";
import GameEndedGameState from "./ingame-game-state/game-ended-game-state/GameEndedGameState";
import { GameSetup, GameSetupContainer } from "./ingame-game-state/game-data-structure/createGame";
import CancelledGameState, { SerializedCancelledGameState } from "./cancelled-game-state/CancelledGameState";

export default class EntireGame extends GameState<null, LobbyGameState | IngameGameState | CancelledGameState> {
    id: string;
    allGameSetups = Object.entries(baseGameData.setups);
    allGameEditionSetups = Object.entries({"base-edition": baseGameData.setups, "a-dance-with-dragons": aDanceWithDragonsData.setups});

    @observable users = new BetterMap<string, User>();
    ownerUserId: string;
    name: string;

    @observable gameSettings: GameSettings = {pbem: false, setupId: "base-game", playerCount: 6, randomHouses: false, gameEdition: "base-edition"};
    onSendClientMessage: (message: ClientMessage) => void;
    onSendServerMessage: (users: User[], message: ServerMessage) => void;
    onWaitedUsers: (users: User[]) => void;
    publicChatRoomId: string;
    // Keys are the two users participating in the private chat.
    // A pair of user is sorted alphabetically by their id when used as a key.
    @observable privateChatRoomsIds: BetterMap<User, BetterMap<User, string>> = new BetterMap();
    // Client-side callback fired whenever the current GameState changes.
    onClientGameStateChange: (() => void) | null;

    get owner(): User | null {
        return this.users.tryGet(this.ownerUserId, null);
    }

    constructor(id: string, ownerId: string, name: string) {
        super(null);
        this.id = id;
        this.ownerUserId = ownerId;
        this.name = name;
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
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            let gameState: GameState<any, any> | null = this;
            while (gameState != null) {
                gameState.needsToBeTransmittedToClient = false;

                gameState = gameState.childGameState;
            }

            // If the game is PBEM, send a notification to all waited users
            if (this.gameSettings.pbem && this.onWaitedUsers) {
                this.onWaitedUsers(this.leafState.getWaitedUsers());
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
        } else if (message.type == "change-game-settings") {
            if (this.ownerUserId != user.id) {
                return;
            }

            this.gameSettings = message.settings;

            if (this.childGameState instanceof LobbyGameState) {
                this.childGameState.onGameSettingsChange();
            }

            this.broadcastToClients({
                type: "game-settings-changed",
                settings: message.settings
            });
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

            if (this.onClientGameStateChange) {
                this.onClientGameStateChange();
            }
        } else if (message.type == "new-user") {
            const user = User.deserializeFromServer(this, message.user);

            this.users.set(user.id, user);
        } else if (message.type == "settings-changed") {
            const user = this.users.get(message.user);

            user.settings = message.settings;
        } else if (message.type == "game-settings-changed") {
            this.gameSettings = message.settings;
        } else if (message.type == "update-connection-status") {
            const user = this.users.get(message.user);
            user.connected = message.status;
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
        } else if (this.childGameState instanceof IngameGameState) {
            const ingame = this.childGameState;
            if (ingame.childGameState instanceof GameEndedGameState) {
                return "FINISHED";
            } else if (ingame.childGameState instanceof CancelledGameState) {
                return "CANCELLED";
            }
            return "ONGOING";
        } else {
            return "CANCELLED";
        }
    }

    getViewOfGame(): any {
        // Creating a view of the current turn of the game
        const turn = this.childGameState instanceof IngameGameState
            ? this.childGameState.game.turn
            : -1;
        const maxPlayerCount = this.gameSettings.playerCount;
        const settings = this.gameSettings;

        return {turn, maxPlayerCount, settings};
    }

    getPlayersInGame(): {userId: string; data: object}[] {
        const players: {userId: string; data: object}[] = [];
        if (this.childGameState instanceof LobbyGameState) {
            this.childGameState.players.forEach((user, house) => {
                // If the game is in "randomize house" mode, don't specify any houses in the PlayerInGame data
                const playerData: {[key: string]: any} = {};

                if (!this.gameSettings.randomHouses) {
                    playerData["house"] = house.id;
                }

                players.push({
                    userId: user.id,
                    data: playerData
                });
            });
        } else if (this.childGameState instanceof IngameGameState) {
            const waitedForUsers = this.childGameState.getWaitedUsers();

            this.childGameState.players.forEach((player, user) => {
                // "Important chat rooms" are chat rooms where unseen messages will display
                // a badge next to the game in the website.
                // In this case, it's all private rooms with this player in it. The next line
                // fetches the list of private chat rooms, the website will take care of
                // showing the badge or not, based on whether there are unseen messages.
                const importantChatRooms = this.getPrivateChatRoomsOf(user);

                players.push({
                    userId: user.id,
                    data: {
                        "house": player.house.id,
                        "waited_for": waitedForUsers.includes(user),
                        "important_chat_rooms": importantChatRooms.map(cr => cr.roomId)
                    }
                });
            });
        }

        return players;
    }

    updateGameSettings(settings: GameSettings): void {
        this.sendMessageToServer({
            type: "change-game-settings",
            settings
        });
    }

    getPrivateChatRoomsOf(user: User): {user: User; roomId: string}[] {
        return _.flatMap(this.privateChatRoomsIds
            .map((u1, bm) => bm.entries
                // Only get the private chat rooms that contains the authenticated player
                .filter(([u2, _]) => u1 == user || u2 == user)
                .map(([u2, roomId]) => {
                    const otherUser = user == u1 ? u2 : u1;

                    return {user: otherUser, roomId};
                })
        ));
    }

    getGameEditionSetups(editionId: string): { [id: string]: GameSetupContainer; } {
        const editionSetups = this.allGameEditionSetups.find(([eid, _]) => eid == editionId);

        if (!editionSetups) {
            throw new Error("Invalid editionId");
        }

        return editionSetups[1];
    }

    getGameSetupContainer(setupId: string): GameSetupContainer {
        const editionSetups = this.getGameEditionSetups(this.gameSettings.gameEdition);
        const setupContainer = Object.entries(editionSetups).find(([sid, _]) => sid == setupId);

        if (!setupContainer) {
            throw new Error("Invalid setupId: " + setupId);
        }

        console.error('setup container' + setupContainer[0])

        return setupContainer[1];
    }

    getGameSetupByIdAndPlayerCount(setupId: string, playerCount: number): GameSetup {
        const container = this.getGameSetupContainer(setupId);

        const playerSetups = container.playerSetups;

        const gameSetup = playerSetups.find(gameSetup => playerCount == gameSetup.playerCount);

        if (!gameSetup) {
            throw new Error(`Invalid playerCount ${playerCount} for setupId ${setupId}`);
        }

        return gameSetup;
    }

    getSelectedGameSetup(): GameSetup {
        return this.getGameSetupByIdAndPlayerCount(this.gameSettings.setupId, this.gameSettings.playerCount);
    }

    serializeToClient(user: User | null): SerializedEntireGame {
        const admin = user == null;

        return {
            id: this.id,
            name: this.name,
            users: this.users.values.map(u => u.serializeToClient()),
            ownerUserId: this.ownerUserId,
            publicChatRoomId: this.publicChatRoomId,
            gameSettings: this.gameSettings,
            privateChatRoomIds: this.privateChatRoomsIds.map((u1, v) => [u1.id, v.map((u2, rid) => [u2.id, rid])]),
            childGameState: this.childGameState.serializeToClient(admin, user)
        };
    }

    static deserializeFromServer(data: SerializedEntireGame): EntireGame {
        const entireGame = new EntireGame(data.id, data.ownerUserId, data.name);

        entireGame.users = new BetterMap<string, User>(data.users.map((ur: any) => [ur.id, User.deserializeFromServer(entireGame, ur)]));
        entireGame.ownerUserId = data.ownerUserId;
        entireGame.childGameState = entireGame.deserializeChildGameState(data.childGameState);
        entireGame.publicChatRoomId = data.publicChatRoomId;
        entireGame.gameSettings = data.gameSettings;
        entireGame.privateChatRoomsIds = new BetterMap(data.privateChatRoomIds.map(([uid1, bm]) => [
            entireGame.users.get(uid1),
            new BetterMap(bm.map(([uid2, roomId]) => [entireGame.users.get(uid2), roomId]))
        ]));

        return entireGame;
    }

    deserializeChildGameState(data: SerializedEntireGame["childGameState"]): this["childGameState"] {
        if (data.type == "lobby") {
            return LobbyGameState.deserializeFromServer(this, data);
        } else if (data.type == "ingame") {
            return IngameGameState.deserializeFromServer(this, data);
        } else if (data.type == "cancelled") {
            return CancelledGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedEntireGame {
    id: string;
    name: string;
    users: SerializedUser[];
    ownerUserId: string;
    childGameState: SerializedLobbyGameState | SerializedIngameGameState | SerializedCancelledGameState;
    publicChatRoomId: string;
    privateChatRoomIds: [string, [string, string][]][];
    gameSettings: GameSettings;
}

export interface GameSettings {
    pbem: boolean;
    setupId: string;
    playerCount: number;
    randomHouses: boolean;
    gameEdition: string;
}
