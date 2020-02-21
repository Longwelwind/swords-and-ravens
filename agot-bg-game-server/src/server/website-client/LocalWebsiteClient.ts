import WebsiteClient, {StoredGameData, StoredUserData} from "./WebsiteClient";
import User from "../User";

export default class LocalWebsiteClient implements WebsiteClient {

    async getGame(gameId: string): Promise<StoredGameData> {
        if (gameId != "1") {
            throw new Error();
        }

        return {
            id: gameId,
            name: "Local Test Game",
            ownerId: "1",
            serializedGame: null,
            version: null
        };
    }

    async getUser(userId: string): Promise<StoredUserData> {
        return {
            id: userId,
            name: `Player #${userId}`,
            token: userId
        };
    }

    async saveGame(gameId: string, serializedGame: any, viewOfGame: any, players: {userId: string; data: object}[], state: string, version: string): Promise<void> {
        // Do nothing
    }

    async notifyUsers(_gameId: string, _userIds: string[]): Promise<void> {
        // Do Nothing
    }

    async createPublicChatRoom(name: string): Promise<string> {
        return `chat-${name}`;
    }

    async createPrivateChatRoom(users: User[], name: string): Promise<string> {
        return `private-chat-between-${users.map(u => u.name).join("-")}`;
    }
}
