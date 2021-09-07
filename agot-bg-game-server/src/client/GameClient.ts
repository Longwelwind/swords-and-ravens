import {ServerMessage} from "../messages/ServerMessage";
import {ClientMessage} from "../messages/ClientMessage";
import EntireGame from "../common/EntireGame";
import {observable} from "mobx";
import User from "../server/User";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import Player from "../common/ingame-game-state/Player";
import House from "../common/ingame-game-state/game-data-structure/House";
import ChatClient from "./chat-client/ChatClient";
import BetterMap from "../utils/BetterMap";

export interface AuthData {
    userId: string;
    gameId: string;
    authToken: string;
}

export enum ConnectionState {
    INITIALIZING,
    CONNECTING,
    AUTHENTICATING,
    SYNCED,
    CLOSED
}

export default class GameClient {
    socket: WebSocket;
    @observable connectionState: ConnectionState = ConnectionState.INITIALIZING;

    @observable entireGame: EntireGame | null = null;

    @observable authenticated = false;
    @observable authenticatedUser: User | null = null
    chatClient: ChatClient = new ChatClient(this);

    get muted(): boolean {
        if (!this.authenticatedUser) {
            throw new Error("Game client must have an authenticated user");
        }

        return this.authenticatedUser.settings.muted;
    }

    set muted(value: boolean) {
        if (!this.authenticatedUser) {
            throw new Error("Game client must have an authenticated user");
        }

        this.authenticatedUser.settings.muted = value;
        this.authenticatedUser.syncSettings();
    }

    authData: AuthData;

    pingInterval: any;

    get authenticatedPlayer(): Player | null {
        if (!this.authenticatedUser) {
            throw new Error("Game client must have an authenticated user");
        }

        if (!this.entireGame || !(this.entireGame.childGameState instanceof IngameGameState)) {
            throw new Error("authenticatedPlayer requires IngameGameState");
        }

        if (this.entireGame.childGameState.players.has(this.authenticatedUser)) {
            return this.entireGame.childGameState.players.get(this.authenticatedUser);
        } else {
            return null;
        }
    }

    constructor(authData: AuthData) {
        this.authData = authData;
    }

    start(): void {
        const websocketHost = location.hostname == "localhost"
            ? "ws://localhost:5000"
            : "wss://play-" + location.hostname;

        console.log(`Connecting to ${websocketHost}`);

        this.socket = new WebSocket(websocketHost);
        this.connectionState = ConnectionState.CONNECTING;

        this.socket.onopen = () => {
            // Heroku timeouts a WebSocket connection after 55 seconds of inactivity.
            // To prevent this, the client sends a ping regurarly
            this.pingInterval = setInterval(() => this.send({type: "ping"}), 30000);

            this.onOpen();
        };
        this.socket.onerror = () => {
            this.onError();
        };
        this.socket.onmessage = (data: MessageEvent) => {
            this.onMessage(data.data as string);
        };
        this.socket.onclose = () => {
            clearInterval(this.pingInterval);
            this.onClose();
        }
    }

    /**
     * Returns whether the given house is controlled by the authenticated player,
     * either because it is the directy controled house, or because it's one of its vassals.
     * @param house
     */
    doesControlHouse(house: House | null): boolean {
        if (this.entireGame == null || !(this.entireGame.childGameState instanceof IngameGameState)) {
            throw new Error();
        }

        const ingame = this.entireGame.childGameState;

        if (house == null) {
            return false;
        }

        const player = this.authenticatedPlayer;

        if (player) {
            // Houses may be uncontrolled during Claim Vassals state and getControllerOfHouse will throw an error.
            // We have to catch it here
            try {
                return ingame.getControllerOfHouse(house) == player;
            } catch {
                return false;
            }
        } else {
            return false;
        }
    }

    isOwner(): boolean {
        if (!this.entireGame) {
            throw new Error();
        }

        if (!this.authenticatedUser) {
            throw new Error();
        }

        return this.entireGame.isOwner(this.authenticatedUser);
    }

    isRealOwner(): boolean {
        if (!this.entireGame) {
            throw new Error();
        }

        if (!this.authenticatedUser) {
            throw new Error();
        }

        return this.entireGame.isRealOwner(this.authenticatedUser);
    }

    onOpen(): void {
        // Authenticate
        this.send({
            type: "authenticate",
            authData: this.authData
        });

        this.connectionState = ConnectionState.AUTHENTICATING;
    }

    onMessage(data: string): void {
        let message: ServerMessage | null = null;

        try {
            message = JSON.parse(data) as ServerMessage;
        } catch (e) {
            console.error("Error occured while parsing server message");
            return;
        }

        console.debug("Receiving:");
        console.debug(message);

        if (message.type == "authenticate-response") {
            this.entireGame = EntireGame.deserializeFromServer(message.game);
            this.entireGame.onSendClientMessage = (message: ClientMessage) => {
                this.send(message);
            };

            this.authenticated = true;
            this.authenticatedUser = this.entireGame.users.get(message.userId);

            // Connect the public chat room
            this.chatClient.addChannel(this.entireGame.publicChatRoomId);

            // Connect to the private chat rooms
            this.entireGame.getPrivateChatRoomsOf(this.authenticatedUser).forEach(({roomId}) => this.chatClient.addChannel(roomId));

            this.connectionState = ConnectionState.SYNCED;
        } else if (message.type == "new-private-chat-room") {
            if (this.entireGame == null) {
                return;
            }

            // Launch a WebSocket connection to this chat room
            this.chatClient.addChannel(message.roomId);

            // @ts-expect-error this.entireGame is always non-null here!
            const users = message.users.map(uid => this.entireGame.users.get(uid));
            const initiator = this.entireGame.users.get(message.initiator);

            if (!this.entireGame.privateChatRoomsIds.has(users[0])) {
                this.entireGame.privateChatRoomsIds.set(users[0], new BetterMap());
            }

            this.entireGame.privateChatRoomsIds.get(users[0]).set(users[1], message.roomId);
            if (this.entireGame.onNewPrivateChatRoomCreated && this.isAuthenticatedUser(initiator)) {
                this.entireGame.onNewPrivateChatRoomCreated(message.roomId);
            }
        } else {
            if (!this.entireGame) {
                console.error("Message other than \"authenticate-response\" received but entireGame == null");
                return
            }

            this.entireGame.onServerMessage(message);
        }
    }

    isOwnTurn(): boolean {
        if (!this.entireGame || !this.authenticatedUser) {
            throw new Error();
        }

        return this.entireGame.getWaitedUsers().includes(this.authenticatedUser);
    }

    onError(): void {
        this.connectionState = ConnectionState.CLOSED;
    }

    onClose(): void {
        this.connectionState = ConnectionState.CLOSED;
    }

    send(message: ClientMessage): void {
        console.debug("Sending:");
        console.debug(message);
        const data = JSON.stringify(message);

        this.socket.send(data);
    }

    isAuthenticatedUser(user: User): boolean {
        return this.authenticatedUser == user;
    }
}
