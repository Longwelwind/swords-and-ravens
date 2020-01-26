import {Server} from "ws";
import {ClientMessage} from "../messages/ClientMessage";
import User from "./User";
import * as WebSocket from "ws";
import EntireGame, {SerializedEntireGame} from "../common/EntireGame";
import {ServerMessage} from "../messages/ServerMessage";
import WebsiteClient from "./website-client/WebsiteClient";
import LocalWebsiteClient from "./website-client/LocalWebsiteClient";
import LiveWebsiteClient from "./website-client/LiveWebsiteClient";
import BetterMap from "../utils/BetterMap";
import schema from "./ClientMessage.json";
import Ajv, {ValidateFunction} from "ajv";

export default class GlobalServer {
    server: Server;

    websiteClient: WebsiteClient;
    loadedGames = new BetterMap<string, EntireGame>();
    clientToUser: Map<WebSocket, User> = new Map<WebSocket, User>();
    clientMessageValidator: ValidateFunction;

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

    async start() {
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

    onSendServerMessage(users: User[], message: ServerMessage) {
        const data = JSON.stringify(message);

        users.forEach(user => {
            user.connectedClients.forEach(connectedClient => {
                connectedClient.send(data);
            });
        })
    }

    async onMessage(client: WebSocket, data: string) {
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

            client.send(JSON.stringify({
                type: "authenticate-response",
                userId: user.id,
                game: entireGame.serializeToClient(user)
            }));
        } else if (message.type == "ping") {
            // The client may send ping to keep the connection alive.
            // Do nothing.
        } else {
            const user = this.clientToUser.get(client);

            if (!user) {
                console.error("Client sent a message other than \"authenticate\" but is not authenticated");
                return;
            }

            user.entireGame.onClientMessage(user, message);

            this.saveGame(user.entireGame);
        }
    }

    saveGame(entireGame: EntireGame) {
        const state = entireGame.getStateOfGame();
        const viewOfGame = entireGame.getViewOfGame();
        const players = entireGame.getPlayersInGame();
        const serializedGame = entireGame.serializeToClient(null);

        this.websiteClient.saveGame(entireGame.id, serializedGame, viewOfGame, players, state, "1.0.0");
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
            ? EntireGame.deserializeFromServer(gameData.serializedGame as SerializedEntireGame)
            : await this.createGame(gameData.id, gameData.ownerId);

        // Bind listeners
        entireGame.onSendClientMessage = _ => {
            console.error("Server instance of ingame tried to send a client message");
        };
        entireGame.onSendServerMessage = (users, message) => {
            this.onSendServerMessage(users, message);
        };
        entireGame.onWaitedUsers = (users) => this.onWaitedUsers(entireGame, users);

        this.loadedGames.set(gameId, entireGame);

        return entireGame;
    }

    async createGame(id: string, ownedId: string): Promise<EntireGame> {
        // Create a public chat room ID
        const publicChatRoomId = await this.websiteClient.createPublicChatRoom(`Chat for game ${id}`);

        const entireGame = new EntireGame(id, ownedId);
        entireGame.publicChatRoomId = publicChatRoomId;
        entireGame.firstStart();

        return entireGame;
    }

    onWaitedUsers(game: EntireGame, users: User[]): void {
        this.websiteClient.notifyUsers(game.id, users.map(u => u.id));
    }

    onClose(client: WebSocket) {
        console.log("Connection closed.");

        if (this.clientToUser.has(client)) {
            const user = this.clientToUser.get(client) as User;
            user.connectedClients.splice(user.connectedClients.indexOf(client), 1);
            this.clientToUser.delete(client);
        }
    }
}
