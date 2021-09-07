import { RequestAPI } from "request";
import requestPromise from "request-promise";
import { StatusCodeError } from "request-promise/errors";
import User from "../User";
import WebsiteClient, { StoredGameData, StoredUserData } from "./WebsiteClient";

export default class AirMeepleWebsiteClient implements WebsiteClient {
    airMeepleApiBaseUrl: string;
    airMeepleApiUsername: string;
    airMeepleApiPassword: string;
    // Don't really know what generic types should be specified here
    request: RequestAPI<any, any, any>;

    constructor() {
        this.airMeepleApiBaseUrl = process.env.AIRMEEPLE_API_BASE_URL || "http://localhost:8001/api/game_server";
        this.airMeepleApiUsername = process.env.AIRMEEPLE_API_USERNAME || "DummyUsername";
        this.airMeepleApiPassword = process.env.AIRMEEPLE_API_PASSWORD || "DummyPassword";

        this.request = requestPromise.defaults({
            json: true,
            auth: {
                user: this.airMeepleApiUsername,
                pass: this.airMeepleApiPassword,
                sendImmediately: true
            }
        })
    }

    async getUser(matchId: string, userId: string): Promise<StoredUserData | null> {
        try {
            const response = await this.request.get(`${this.airMeepleApiBaseUrl}/user/${userId}/${matchId}`);

            return {
                id: response.id,
                name: response.username,
                token: response.auth_token,
                profileSettings: {
                    muted: false,
                    houseNamesForChat: true,
                    mapScrollbar: true,
                    responsiveLayout: true
                }
            };
        } catch (e) {
            if (e instanceof StatusCodeError) {
                if (e.statusCode == 404) {
                    return null;
                }
            }

            throw e;
        }
    }
    
    async getGame(gameId: string): Promise<StoredGameData | null> {
        try {
            const response = await this.request.get(`${this.airMeepleApiBaseUrl}/match/${gameId}`);

            return {
                id: response.id,
                name: response.name,
                ownerId: response.owner,
                serializedGame: response.serialized_game,
                version: response.serialized_game ? response.serialized_game["version"] : null
            };
        } catch (e) {
            if (e instanceof StatusCodeError) {
                if (e.statusCode == 404) {
                    return null;
                }
            }

            throw e;
        }
    }
    
    async saveGame(gameId: string, serializedGame: object, viewOfGame: object, players: { userId: string; data: object; }[], state: string, version: string): Promise<void> {
        // @ts-ignore
        serializedGame["version"] = version;

        await this.request.patch(`${this.airMeepleApiBaseUrl}/match/${gameId}`, {
            body: {
                serialized_game: serializedGame,
                status: state,
                players: players.map(p => ({user: p.userId, metadata: p.data})),
                metadata: viewOfGame,
                // @ts-expect-error serializedGame is an object, but will always contain those properties
                max_players: serializedGame.gameSettings.playerCount,
            }
        });
    }
    
    async notifyReadyToStart(gameId: string, userIds: string[]): Promise<void> {
        await this.request.post(`${this.airMeepleApiBaseUrl}/mail_notification`, {
            body: {
                match: gameId,
                subject: "Your game is ready to start: {game.name}",
                message: "It's your turn to play in \"{{ game.name }}\":",
                users: userIds
            }
        });
    }
    
    async notifyYourTurn(gameId: string, userIds: string[]): Promise<void> {
        await this.request.post(`${this.airMeepleApiBaseUrl}/mail_notification`, {
            body: {
                match: gameId,
                subject: "It\'s your turn in \"{game.name}\"",
                message: "It's your turn to play in \"{{ game.name }}\":",
                users: userIds
            }
        });
    }
    
    async notifyBattleResults(gameId: string, userIds: string[]): Promise<void> {
        await this.request.post(`${this.airMeepleApiBaseUrl}/mail_notification`, {
            body: {
                match: gameId,
                subject: "Your battle is over in \"{game.name}\"",
                message: "Your battle in \"{{ game.name }}\" is over:",
                users: userIds
            }
        });
    }
    
    async notifyNewVote(gameId: string, userIds: string[]): Promise<void> {
        await this.request.post(`${this.airMeepleApiBaseUrl}/mail_notification`, {
            body: {
                match: gameId,
                subject: "Your vote is needed in \"{game.name}\"",
                message: "A new vote has been started in \"{{ game.name }}\":",
                users: userIds
            }
        });
    }
    
    async notifyGameEnded(gameId: string, userIds: string[]): Promise<void> {
        await this.request.post(`${this.airMeepleApiBaseUrl}/mail_notification`, {
            body: {
                match: gameId,
                subject: "Match \"{game.name}\" has ended",
                message: "The game \"{{ game.name }}\" has ended:",
                users: userIds
            }
        });
    }
    
    async createPublicChatRoom(_name: string): Promise<string> {
        // This should do nothing since AirMeeple automatically create a public chat room for each match
        return "dumb-room-id";
    }
    
    createPrivateChatRoom(_users: User[], _name: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
}