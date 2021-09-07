import WebsiteClient, {StoredGameData, StoredUserData} from "./WebsiteClient";
import requestPromise, {post} from "request-promise";
import {RequestAPI} from "request";
import {StatusCodeError} from "request-promise/errors";
import User from "../User";

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
            const response = await this.request.get(`${this.masterApiBaseUrl}/game/${gameId}`);

            return {
                id: response.id,
                name: response.name,
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

    async getUser(matchId: string, userId: string): Promise<StoredUserData | null> {
        try {
            const response = await this.request.get(`${this.masterApiBaseUrl}/user/${userId}`);

            return {
                id: response.id,
                name: response.username,
                token: response.game_token,
                profileSettings: {
                    muted: response.mute_games,
                    houseNamesForChat: response.use_house_names_for_chat,
                    mapScrollbar: response.use_map_scrollbar,
                    responsiveLayout: response.use_responsive_layout_on_mobile
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

    async createPublicChatRoom(name: string): Promise<string> {
        const response = await this.request.post(`${this.masterApiBaseUrl}/room`, {
            body: {
                name,
                public: true,
                users: [],
                max_retrieve_count: null
            }
        });

        return response.id;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types
    async saveGame(gameId: string, serializedGame: any, viewOfGame: any, players: {userId: string; data: object}[], state: string, version: string): Promise<void> {
        await this.request.patch(`${this.masterApiBaseUrl}/game/${gameId}`, {
            body: {
                serialized_game: serializedGame,
                state,
                version,
                view_of_game: viewOfGame,
                players: players.map(p => ({user: p.userId, data: p.data})),
            }
        });
    }

    async notifyReadyToStart(gameId: string, userIds: string[]): Promise<void> {
        await post(`${this.masterApiBaseUrl}/notifyReadyToStart/${gameId}`, {
            body: {users: userIds},
            json: true,
        }).auth(this.masterApiUsername, this.masterApiPassword, true);
    }

    async notifyYourTurn(gameId: string, userIds: string[]): Promise<void> {
        await post(`${this.masterApiBaseUrl}/notifyYourTurn/${gameId}`, {
            body: {users: userIds},
            json: true,
        }).auth(this.masterApiUsername, this.masterApiPassword, true);
    }

    async notifyBattleResults(gameId: string, userIds: string[]): Promise<void> {
        await post(`${this.masterApiBaseUrl}/notifyBattleResults/${gameId}`, {
            body: {users: userIds},
            json: true,
        }).auth(this.masterApiUsername, this.masterApiPassword, true);
    }

    async notifyNewVote(gameId: string, userIds: string[]): Promise<void> {
        await post(`${this.masterApiBaseUrl}/notifyNewVote/${gameId}`, {
            body: {users: userIds},
            json: true,
        }).auth(this.masterApiUsername, this.masterApiPassword, true);
    }

    async notifyGameEnded(gameId: string, userIds: string[]): Promise<void> {
        await post(`${this.masterApiBaseUrl}/notifyGameEnded/${gameId}`, {
            body: {users: userIds},
            json: true,
        }).auth(this.masterApiUsername, this.masterApiPassword, true);
    }

    async createPrivateChatRoom(users: User[], name: string): Promise<string> {
        const response = await this.request.post(`${this.masterApiBaseUrl}/room`, {
            body: {
                name,
                public: false,
                users: users.map(u => ({user: u.id})),
                max_retrieve_count: null
            }
        });

        return response.id;
    }
}
