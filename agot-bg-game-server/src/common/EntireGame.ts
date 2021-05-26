import GameState, {SerializedGameState} from "./GameState";
import LobbyGameState, {SerializedLobbyGameState} from "./lobby-game-state/LobbyGameState";
import IngameGameState, {SerializedIngameGameState} from "./ingame-game-state/IngameGameState";
import {ServerMessage} from "../messages/ServerMessage";
import {ChangeGameSettings, ClientMessage} from "../messages/ClientMessage";
import User, {SerializedUser} from "../server/User";
import {observable} from "mobx";
import * as _ from "lodash";
import BetterMap from "../utils/BetterMap";
import GameEndedGameState from "./ingame-game-state/game-ended-game-state/GameEndedGameState";
import { GameSetup, getGameSetupContainer } from "./ingame-game-state/game-data-structure/createGame";
import CancelledGameState, { SerializedCancelledGameState } from "./cancelled-game-state/CancelledGameState";
import { VoteState } from "./ingame-game-state/vote-system/Vote";

export default class EntireGame extends GameState<null, LobbyGameState | IngameGameState | CancelledGameState> {
    id: string;
    @observable users = new BetterMap<string, User>();
    ownerUserId: string;
    name: string;

    @observable gameSettings: GameSettings = { pbem: false, setupId: "base-game", playerCount: 6, randomHouses: false, cokWesterosPhase: false, adwdHouseCards: false, vassals: false, seaOrderTokens: false, randomChosenHouses: false, draftHouseCards: false };
    onSendClientMessage: (message: ClientMessage) => void;
    onSendServerMessage: (users: User[], message: ServerMessage) => void;
    onWaitedUsers: (users: User[]) => void;
    publicChatRoomId: string;
    // Keys are the two users participating in the private chat.
    // A pair of user is sorted alphabetically by their id when used as a key.
    @observable privateChatRoomsIds: BetterMap<User, BetterMap<User, string>> = new BetterMap();
    // Client-side callback fired whenever a new private chat-window was created
    onNewPrivateChatRoomCreated: ((roomId: string) => void) | null;
    // Client-side callback fired whenever the current GameState changes.
    onClientGameStateChange: (() => void) | null;

    get lobbyGameState(): LobbyGameState | null {
        return this.childGameState instanceof LobbyGameState ? this.childGameState : null;
    }

    get ingameGameState(): IngameGameState | null {
        return this.childGameState instanceof IngameGameState ? this.childGameState : null;
    }

    get owner(): User | null {
        return this.users.tryGet(this.ownerUserId, null);
    }

    get selectedGameSetup(): GameSetup {
        const container = getGameSetupContainer(this.gameSettings.setupId);

        const playerSetups = container.playerSetups;

        const gameSetup = playerSetups.find(gameSetup => this.gameSettings.playerCount == gameSetup.playerCount);

        if (gameSetup == undefined) {
            throw new Error(`Invalid playerCount ${this.gameSettings.playerCount} for setupId ${this.gameSettings.setupId}`);
        }

        return gameSetup;
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

    proceedToIngameGameState(housesToCreate: string[], futurePlayers: BetterMap<string, User>): void {
        this.setChildGameState(new IngameGameState(this)).beginGame(housesToCreate, futurePlayers);

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

            this.notifyWaitedUsers();
        }
    }

    notifyWaitedUsers(): void {
        // If the game is PBEM, send a notification to all waited users
        if (this.gameSettings.pbem && this.onWaitedUsers) {
            this.onWaitedUsers(this.leafState.getWaitedUsers());
        }
    }

    isOwner(user: User): boolean {
        if (this.lobbyGameState) {
            // If owner is not seated every player becomes owner
            // and can kick players, change settings, start the game, etc. in LobbyGameState
            return this.lobbyGameState.players.values.map(u => u.id).includes(this.ownerUserId)
                ? this.isRealOwner(user)
                : this.isRealOwner(user) || this.lobbyGameState.players.values.includes(user);
        }

        if (this.ingameGameState) {
            // If owner is not present ingame
            // every player becomes owner to be able to toggle PBEM
            return this.ingameGameState.players.keys.map(u => u.id).includes(this.ownerUserId)
                ? this.isRealOwner(user)
                : this.ingameGameState.players.keys.includes(user);
        }

        return this.isRealOwner(user);
    }

    isRealOwner(user: User): boolean {
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
            this.onGameSettingsChange(user, message);
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

    onGameSettingsChange(user: User, message: ChangeGameSettings): void {
        if (!this.isOwner(user)) {
            return;
        }

        let settings =  message.settings as GameSettings;
        if (!settings || (this.lobbyGameState && this.lobbyGameState.players.size > settings.playerCount)) {
            // A variant which contains less players than connected is not allowed
            settings = this.gameSettings;
        }

        if (settings.setupId == "a-dance-with-dragons") {
            settings.adwdHouseCards = true;
        }

        if (settings.draftHouseCards) {
            settings.adwdHouseCards = false;
        }

        if (settings.setupId == "mother-of-dragons") {
            settings.vassals = true;
            settings.seaOrderTokens = true;
        }

        // Check if PBEM was enabled during ingame
        const notifyWaitedUsersDueToPbemChange = this.ingameGameState && settings.pbem && !this.gameSettings.pbem;

        this.gameSettings = settings;

        if (notifyWaitedUsersDueToPbemChange) {
            // Notify waited users now
            this.notifyWaitedUsers();
        }

        if (this.lobbyGameState) {
            this.lobbyGameState.onGameSettingsChange();
        }

        this.broadcastToClients({
            type: "game-settings-changed",
            settings: settings
        });
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

                if (!this.gameSettings.randomHouses && !this.gameSettings.randomChosenHouses) {
                    playerData["house"] = house.id;
                }

                players.push({
                    userId: user.id,
                    data: playerData
                });
            });
        } else if (this.childGameState instanceof IngameGameState) {
            const ingame = this.childGameState as IngameGameState;
            const waitedForUsers = ingame.getWaitedUsers();

            ingame.players.forEach((player, user) => {
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
                        "important_chat_rooms": importantChatRooms.map(cr => cr.roomId),
                        "is_winner": ingame.childGameState instanceof GameEndedGameState ? ingame.childGameState.winner == player.house : false,
                        "needed_for_vote": ingame.votes.values.filter(vote => vote.state == VoteState.ONGOING).some(vote => !vote.votes.has(player.house))
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
    randomChosenHouses: boolean;
    adwdHouseCards: boolean;
    cokWesterosPhase: boolean;
    vassals: boolean;
    seaOrderTokens: boolean;
    draftHouseCards: boolean;
}
