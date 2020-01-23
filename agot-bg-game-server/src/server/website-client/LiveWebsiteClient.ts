import WebsiteClient, {StoredGameData, StoredUserData} from "./WebsiteClient";
import requestPromise, {post} from "request-promise";
import {RequestAPI} from "request";
import {StatusCodeError} from "request-promise/errors";

export default class LiveWebsiteClient implements WebsiteClient {
    masterApiBaseUrl: string;
    masterApiUsername: string;
    masterApiPassword: string;
    // Don't really know what generic types should be specified here
    request: RequestAPI<any, any, any>;

    constructor() {
        this.masterApiBaseUrl = process.env.MASTER_API_BASE_URL || "http://localhost:8000/api";
        this.masterApiUsername = process.env.MASTER_API_USERNAME || "DummyUsername";
        this.masterApiPassword = process.env.MASTER_API_PASSWORD || "DummyPassword";

        this.request = requestPromise.defaults({
            json: true,
            auth: {
                user: this.masterApiUsername,
                pass: this.masterApiPassword,
                sendImmediately: true
            }
        })
    }

    async getGame(gameId: string): Promise<StoredGameData | null> {
        try {
            const response = await this.request.get(`${this.masterApiBaseUrl}/game/${gameId}/`);

            return {
                id: response.id,
                ownerId: response.owner,
                serializedGame: response.serialized_game,
                version: response.version
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

    async getUser(userId: string): Promise<StoredUserData | null> {
        try {
            const response = await this.request.get(`${this.masterApiBaseUrl}/user/${userId}/`);

            return {
                id: response.id,
                name: response.username,
                token: response.game_token
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

    async saveGame(gameId: string, serializedGame: any, viewOfGame: any, players: {userId: string; data: object}[], state: string, version: string): Promise<void> {
        await this.request.patch(`${this.masterApiBaseUrl}/game/${gameId}/`, {
            body: {
                serialized_game: serializedGame,
                state,
                version,
                view_of_game: viewOfGame,
                players: players.map(p => ({user: p.userId, data: p.data})),
            }
        });
    }

    async notifyUsers(gameId: string, userIds: string[]): Promise<void> {
        await post(`${this.masterApiBaseUrl}/notify/${gameId}`, {
            body: {users: userIds},
            json: true,
        }).auth(this.masterApiUsername, this.masterApiPassword, true);
    }
}
