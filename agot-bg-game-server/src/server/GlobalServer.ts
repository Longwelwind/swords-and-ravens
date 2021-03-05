import {Server} from "ws";
import {ClientMessage} from "../messages/ClientMessage";
import User from "./User";
import * as WebSocket from "ws";
import EntireGame, {SerializedEntireGame} from "../common/EntireGame";
import {ServerMessage} from "../messages/ServerMessage";
import WebsiteClient, { StoredGameData } from "./website-client/WebsiteClient";
import LocalWebsiteClient from "./website-client/LocalWebsiteClient";
import LiveWebsiteClient from "./website-client/LiveWebsiteClient";
import BetterMap from "../utils/BetterMap";
import schema from "./ClientMessage.json";
import Ajv, {ValidateFunction} from "ajv";
import _ from "lodash";
import serializedGameMigrations from "./serializedGameMigrations";

export default class GlobalServer {
    server: Server;

    websiteClient: WebsiteClient;
    loadedGames = new BetterMap<string, EntireGame>();
    clientToUser: Map<WebSocket, User> = new Map<WebSocket, User>();
    clientMessageValidator: ValidateFunction;

    get latestSerializedGameVersion(): string {
        const lastMigration = _.last(serializedGameMigrations);

        if (!lastMigration) {
            throw new Error();
        }

        return lastMigration.version;
    }

    constructor(server: Server) {
        this.server = server;

        if (process.env.MASTER_API_ENABLED != null) {
            console.log("Launching with live-website client");
            this.websiteClient = new LiveWebsiteClient();
        } else {
            console.log("Launching with local-website client");
            this.websiteClient = new LocalWebsiteClient();
        }

        this.clientMessageValidator = new Ajv({allErrors: true}).compile(schema);
    }

    async start(): Promise<void> {
        this.server.on("connection", (client: WebSocket) => {
            console.log("Connection");
            client.on("message", (data: WebSocket.Data) => {
                this.onMessage(client, data as string);
            });
            client.on("close", () => {
                this.onClose(client);
            });
        });
    }

    onSendServerMessage(users: User[], message: ServerMessage): void {
        const data = JSON.stringify(message);

        users.forEach(user => {
            user.connectedClients.forEach(connectedClient => {
                // It may happen that a connected is actually disconnected because,
                // disconnection happened after the beginning of the processing of
                // this function and thus the client was not removed properly off
                // the list.
                if (connectedClient.readyState == WebSocket.OPEN) {
                    connectedClient.send(data);
                }
            });
        })
    }

    async onMessage(client: WebSocket, data: string): Promise<void> {
        let message: ClientMessage | null = null;
        try {
            message = JSON.parse(data) as ClientMessage;
        } catch (error) {
            console.warn(`Error while parsing JSON for: ${data}`);
            return;
        }

        // Validate the JSON
        if (!this.clientMessageValidator(message)) {
            console.warn(`Unvalid schema of JSON message: ${data}, ${this.clientMessageValidator.errors}`);
            return;
        }
        console.log(message);


        if (message.type == "authenticate") {
            const {userId, gameId, authToken} = message.authData;

            // Check that the user exists
            const userData = await this.websiteClient.getUser(userId);

            if (!userData) {
                console.warn("Non-existing userId");
                return;
            }

            // Check that the token is good
            if (userData.token != authToken) {
                console.warn("Authentication with a wrong token");
                return;
            }

            // Get the game the user wants to authenticate to
            const entireGame = await this.getEntireGame(gameId);

            if (!entireGame) {
                console.warn("Authentication with a wrong gameId");
                return;
            }

            // Check if the game already contains this user
            const user = entireGame.users.has(userData.id)
                ? entireGame.users.get(userData.id)
                : entireGame.addUser(userData.id, userData.name);

            this.clientToUser.set(client, user);
            user.connectedClients.push(client);

            // The client might have disconnected between the execution of this thread,
            // and the sending of the response, thus why the state of the socket needs to
            // be checked here.
            if (client.readyState == WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "authenticate-response",
                    userId: user.id,
                    game: entireGame.serializeToClient(user)
                }));
            }

            // Update the connection status for all other users
            user.updateConnectionStatus();
        } else if (message.type == "ping") {
            // The client may send ping to keep the connection alive.
            // Do nothing.
        } else {
            const user = this.clientToUser.get(client);

            if (!user) {
                console.error("Client sent a message other than \"authenticate\" but is not authenticated");
                return;
            }

            const entireGame = user.entireGame;

            console.log(`Message received for game ${entireGame.id}`);

            // Chat related messages are handled by GlobalServer because they must use the website client
            if (message.type == "create-private-chat-room") {
                const otherUser = user.entireGame.users.get(message.otherUser);
                // Check if a chat room has not already been started between these 2 users
                const users = _.sortBy([user, otherUser], u => u.id);

                if (entireGame.privateChatRoomsIds.has(users[0]) && entireGame.privateChatRoomsIds.get(users[0]).has(users[1])) {
                    return;
                }

                // Create a chat room between these 2 players
                const roomId = await this.websiteClient.createPrivateChatRoom(users, `Chat room for ${users.map(u => u.name).join(" and ")}`);

                if (!entireGame.privateChatRoomsIds.has(users[0])) {
                    entireGame.privateChatRoomsIds.set(users[0], new BetterMap());
                }

                entireGame.privateChatRoomsIds.get(users[0]).set(users[1], roomId);

                users.forEach(u => {
                    u.send({
                        type: "new-private-chat-room",
                        users: users.map(u => u.id),
                        roomId,
                        initiator: user.id
                    });
                });
            } else {
                entireGame.onClientMessage(user, message);
            }

            this.saveGame(entireGame);
        }
    }

    saveGame(entireGame: EntireGame): void {
        const state = entireGame.getStateOfGame();
        const viewOfGame = entireGame.getViewOfGame();
        const players = entireGame.getPlayersInGame();
        const serializedGame = entireGame.serializeToClient(null);
        // Assume that all game always follow the latest serializedGame version,
        // since they have been migrated when loaded.
        const version = this.latestSerializedGameVersion;

        this.websiteClient.saveGame(entireGame.id, serializedGame, viewOfGame, players, state, version);
    }

    async getEntireGame(gameId: string): Promise<EntireGame | null> {
        // Check if it has already been loaded
        if (this.loadedGames.has(gameId)) {
            return this.loadedGames.get(gameId);
        }

        // Otherwise, try to fetch it in the database
        const gameData = await this.websiteClient.getGame(gameId);
        if (!gameData) {
            return null;
        }

        // Load it
        const entireGame = gameData.serializedGame
            ? this.deserializeStoredGame(gameData)
            : await this.createGame(gameData.id, gameData.ownerId, gameData.name);

        // Bind listeners
        entireGame.onSendClientMessage = _ => {
            console.error("Server instance of ingame tried to send a client message");
        };
        entireGame.onSendServerMessage = (users, message) => {
            this.onSendServerMessage(users, message);
        };
        entireGame.onWaitedUsers = (users) => this.onWaitedUsers(entireGame, users);

        // Set the connection status of all users to false
        entireGame.users.values.forEach(u => u.connected = false);

        this.loadedGames.set(gameId, entireGame);

        return entireGame;
    }

    deserializeStoredGame(gameData: StoredGameData): EntireGame {
        // Check if the serialized game needs to be migrated
        if (gameData.version != this.latestSerializedGameVersion) {
            gameData.serializedGame = this.migrateSerializedGame(gameData.serializedGame, gameData.version as string);
        }

        return EntireGame.deserializeFromServer(gameData.serializedGame as SerializedEntireGame);
    }

    migrateSerializedGame(serializedGame: any, version: string): any {
        const migrationI = serializedGameMigrations.findIndex(m => m.version == version);

        const migrationsToApply = serializedGameMigrations.slice(migrationI + 1);

        const migratedSerializedGame = migrationsToApply.reduce(
            (serializedGame, migration) => migration.migrate(serializedGame),
            serializedGame
        );

        return migratedSerializedGame;
    }

    async createGame(id: string, ownedId: string, name: string): Promise<EntireGame> {
        // Create a public chat room ID
        const publicChatRoomId = await this.websiteClient.createPublicChatRoom(`Chat for game ${id}`);

        const entireGame = new EntireGame(id, ownedId, name);
        entireGame.publicChatRoomId = publicChatRoomId;
        entireGame.firstStart();

        return entireGame;
    }

    onWaitedUsers(game: EntireGame, users: User[]): void {
        this.websiteClient.notifyUsers(game.id, users.map(u => u.id));
    }

    onClose(client: WebSocket): void {
        console.log("Connection closed.");

        if (this.clientToUser.has(client)) {
            const user = this.clientToUser.get(client) as User;
            user.connectedClients.splice(user.connectedClients.indexOf(client), 1);
            this.clientToUser.delete(client);

            user.updateConnectionStatus();
        }
    }
}
