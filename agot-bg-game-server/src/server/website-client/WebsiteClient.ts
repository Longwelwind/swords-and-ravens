export interface StoredGameData {
    id: string;
    ownerId: string;
    serializedGame: object | null;
    version: string | null;
}

export interface StoredUserData {
    id: string;
    name: string;
    token: string;
}

export default interface WebsiteClient {
    getUser(userId: string): Promise<StoredUserData | null>;
    getGame(gameId: string): Promise<StoredGameData | null>;
    saveGame(gameId: string, serializedGame: object, viewOfGame: object, players: {userId: string; data: object}[], state: string, version: string): Promise<void>;
    notifyUsers(gameId: string, userIds: string[]): Promise<void>;
}
