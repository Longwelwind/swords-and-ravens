/* eslint-disable @typescript-eslint/ban-types */
import User from "../User";

export interface StoredProfileSettings {
    muted: boolean;
    houseNamesForChat: boolean;
    mapScrollbar: boolean;
    responsiveLayout: boolean;
}

export interface StoredGameData {
    id: string;
    name: string;
    ownerId: string;
    serializedGame: object | null;
    version: string | null;
}

export interface StoredUserData {
    id: string;
    name: string;
    token: string;
    groups: {"name": string}[];
    profileSettings: StoredProfileSettings;
}

export default interface WebsiteClient {
    getUser(userId: string): Promise<StoredUserData | null>;
    getGame(gameId: string): Promise<StoredGameData | null>;
    saveGame(gameId: string, serializedGame: object, viewOfGame: object, players: {userId: string; data: object}[], state: string, version: string, updateLastActive: boolean): Promise<void>;
    isGameCancelled(gameId: string): Promise<boolean>;
    notifyReadyToStart(gameId: string, userIds: string[]): Promise<void>;
    notifyYourTurn(gameId: string, userIds: string[]): Promise<void>;
    notifyBribeForSupport(gameId: string, userIds: string[]): Promise<void>;
    notifyBattleResults(gameId: string, userIds: string[]): Promise<void>;
    notifyNewVote(gameId: string, userIds: string[]): Promise<void>;
    notifyGameEnded(gameId: string, userIds: string[]): Promise<void>;
    createPublicChatRoom(name: string): Promise<string>;
    createPrivateChatRoom(users: User[], name: string): Promise<string>;
    addPbemResponseTime(user: User, responseTimeInSeconds: number): Promise<void>;
    clearChatRoom(roomId: string): Promise<void>;
}
