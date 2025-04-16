import WebsiteClient, { StoredGameData, StoredUserData } from "./WebsiteClient";
import User from "../User";
import fs from "fs";
import path from "path";
import { SerializedEntireGame } from "../../common/EntireGame";
import serializedGameMigrations from "../serializedGameMigrations";
import _ from "lodash";

const user = {
  id: "",
  name: "",
  facelessName: "",
  settings: {
    chatHouseNames: false,
    mapScrollbar: true,
    gameStateColumnRight: false,
    muted: true,
    lastOpenedTab: "game-logs",
    musicVolume: 1,
    notificationsVolume: 1,
    sfxVolume: 1,
  },
  connected: false,
  otherUsersFromSameNetwork: [],
  note: "",
};

export default class LocalWebsiteClient implements WebsiteClient {
  async getGame(gameId: string): Promise<StoredGameData> {
    if (gameId != "1") {
      throw new Error();
    }

    let serializedGame: any = await this.loadGameFromFile();
    const version = Math.max(
      ...serializedGameMigrations.map((mig) => Number(mig.version))
    );

    if (serializedGame.migrate) {
      serializedGame = this.migrateRealGameToLocalDebugGame(serializedGame);
    }

    return {
      id: gameId,
      name: "Local Test Game",
      ownerId: "1",
      serializedGame: serializedGame,
      version: version.toString(),
    };
  }

  private migrateRealGameToLocalDebugGame(
    serializedGame: SerializedEntireGame
  ): SerializedEntireGame {
    serializedGame.id = "1";
    serializedGame.ownerUserId = "1";

    serializedGame.users = [];
    serializedGame.privateChatRoomIds = [];

    for (let i = 0; i < 8; i++) {
      const u = {
        ...user,
        id: `${i + 1}`,
        name: `Player ${i + 1}`,
        facelessName: `Nobody ${i + 1}`,
      };
      serializedGame.users.push(u);
    }

    if (serializedGame.childGameState.type != "ingame") {
      return serializedGame;
    }

    const ingame = serializedGame.childGameState;
    ingame.votes = [];
    ingame.gameLogManager.lastSeenLogTimes = [];
    const houses = ingame.players.map((p) => p.houseId);
    ingame.players = [];
    for (let i = 0; i < houses.length; i++) {
      const player = {
        houseId: houses[i],
        userId: `${i + 1}`,
        liveClockData: null,
        waitedForData: null,
      };
      ingame.players.push(player);
    }

    _.remove(
      ingame.gameLogManager.logs,
      (log) =>
        log.data.type == "user-house-assignments" ||
        log.data.type == "player-replaced"
    );

    return serializedGame;
  }

  private async loadGameFromFile(): Promise<object | null> {
    const filePath = path.resolve(__dirname, "local-entire-game.json");
    try {
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Failed to load game from file: ${error.message}`);
      return null;
    }
  }

  async getUser(userId: string): Promise<StoredUserData> {
    return {
      id: userId,
      name: `Super Long Player Name #${userId}`,
      token: userId,
      groups: [{ name: "Member" }],
      profileSettings: {
        muted: true,
        houseNamesForChat: true,
        mapScrollbar: true,
        responsiveLayout: false,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types
  async saveGame(
    _gameId: string,
    serializedGame: SerializedEntireGame,
    _viewOfGame: any,
    _players: { userId: string; data: object }[],
    _state: string,
    _version: string,
    updateLastActive: boolean
  ): Promise<void> {
    console.log("updateLastActive", updateLastActive);
    if (serializedGame.childGameState.type != "ingame") {
      return;
    }
    const filePath = path.resolve(__dirname, "local-entire-game.json");
    try {
      const dataToSave = JSON.stringify(serializedGame);
      await fs.promises.writeFile(filePath, dataToSave, "utf-8");
      console.log("Game successfully saved to file.");
    } catch (error) {
      console.error(`Failed to save game to file: ${error.message}`);
    }
  }

  async notifyReadyToStart(_gameId: string, userIds: string[]): Promise<void> {
    console.log(`notifyReadyToStart: ${userIds.join(", ")}`);
  }

  async notifyYourTurn(_gameId: string, userIds: string[]): Promise<void> {
    console.log(`notifyYourTurn: ${userIds.join(", ")}`);
  }

  async notifyBribeForSupport(
    gameId: string,
    userIds: string[]
  ): Promise<void> {
    console.log(`notifyBribeForSupport: ${userIds.join(", ")}`);
  }

  async notifyBattleResults(_gameId: string, userIds: string[]): Promise<void> {
    console.log(`notifyBattleResults: ${userIds.join(", ")}`);
  }

  async notifyNewVote(_gameId: string, userIds: string[]): Promise<void> {
    console.log(`notifyNewVoteStarted: ${userIds.join(", ")}`);
  }

  async notifyGameEnded(_gameId: string, userIds: string[]): Promise<void> {
    console.log(`notifyGameEnded: ${userIds.join(", ")}`);
  }

  async addPbemResponseTime(
    user: User,
    responseTimeInSeconds: number
  ): Promise<void> {
    console.log(
      `ADD-PBEM-RESPONSE-TIME: ${user.name}: ${responseTimeInSeconds}`
    );
  }

  async createPublicChatRoom(name: string): Promise<string> {
    return `chat-${name}`;
  }

  async createPrivateChatRoom(users: User[], _name: string): Promise<string> {
    return `private-chat-between-${users.map((u) => u.name).join("-")}`;
  }

  async clearChatRoom(roomId: string): Promise<void> {
    console.log("room " + roomId + " cleared.");
  }
}
