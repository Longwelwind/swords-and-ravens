import WebsiteClient, {StoredGameData, StoredUserData} from "./WebsiteClient";

export default class LocalWebsiteClient implements WebsiteClient {

    async getGame(gameId: string): Promise<StoredGameData> {
        if (gameId != "1") {
            throw new Error();
        }

        return {
            id: gameId,
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
}
