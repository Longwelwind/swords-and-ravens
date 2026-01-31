import { observable } from "mobx";
import GameLog, { GameLogData } from "./GameLog";
import IngameGameState from "../IngameGameState";
import BetterMap from "../../../utils/BetterMap";
import User from "../../../server/User";

export function timeToTicks(time: Date): number {
  return Math.round(time.getTime() / 1000);
}

export function ticksToTime(ticks: number): Date {
  return new Date(ticks * 1000);
}

const fogOfWarBannedLogs = [
  "orders-revealed",
  "garrison-removed",
  "garrison-returned",
];

const blindDraftBannedLogs = [
  "orders-revealed",
  "house-cards-returned",
  "roose-bolton-house-cards-returned",
  "massing-on-the-milkwater-house-cards-back",
];

export default class GameLogManager {
  ingameGameState: IngameGameState;
  @observable logs: GameLog[] = [];
  @observable lastSeenLogTimes: BetterMap<User, number> = new BetterMap();

  get userIdToFakeIdMap(): BetterMap<string, string> {
    return this.ingameGameState.entireGame.userIdToFakeIdMap;
  }

  constructor(ingameGameState: IngameGameState) {
    this.ingameGameState = ingameGameState;
  }

  private logFilter = (log: GameLog): boolean => {
    if (this.ingameGameState.isEndedOrCancelled) return true;
    return this.fogOfWarFilter(log) && this.blindDraftFilter(log);
  };

  private fogOfWarFilter = (log: GameLog): boolean => {
    if (!this.ingameGameState.fogOfWar) return true;
    return !fogOfWarBannedLogs.includes(log.data.type);
  };

  private blindDraftFilter = (log: GameLog): boolean => {
    if (!this.ingameGameState.entireGame.gameSettings.blindDraft) return true;
    return !blindDraftBannedLogs.includes(log.data.type);
  };

  log(data: GameLogData, resolvedAutomatically = false): void {
    const time = new Date();
    const log = { data, time, resolvedAutomatically };
    this.logs.push(log);

    if (this.logFilter(log)) {
      const migrated = this.migrateForFaceless(false, data);
      this.ingameGameState.entireGame.broadcastToClients({
        type: "add-game-log",
        data: migrated,
        time: Math.round(time.getTime() / 1000),
        resolvedAutomatically: resolvedAutomatically,
      });
    }
  }

  sendGameLogSeen(time: number): void {
    this.ingameGameState.entireGame.sendMessageToServer({
      type: "game-log-seen",
      time: time,
    });
  }

  migrateForFaceless(admin: boolean, data: GameLogData): GameLogData {
    if (admin || !this.ingameGameState.entireGame.gameSettings.faceless) {
      return data;
    }

    if (data.type == "user-house-assignments") {
      return {
        type: "user-house-assignments",
        assignments: data.assignments.map(([h, userId]) => {
          return [
            h,
            this.userIdToFakeIdMap.has(userId)
              ? this.userIdToFakeIdMap.get(userId)
              : userId,
          ];
        }),
      };
    } else if (data.type == "player-replaced") {
      return {
        type: "player-replaced",
        house: data.house,
        reason: data.reason,
        newCommanderHouse: data.newCommanderHouse,
        newUser:
          data.newUser && this.userIdToFakeIdMap.has(data.newUser)
            ? this.userIdToFakeIdMap.get(data.newUser)
            : data.newUser,
        oldUser: this.userIdToFakeIdMap.has(data.oldUser)
          ? this.userIdToFakeIdMap.get(data.oldUser)
          : data.oldUser,
      };
    } else if (data.type == "vassal-replaced") {
      return {
        type: "vassal-replaced",
        house: data.house,
        user: this.userIdToFakeIdMap.has(data.user)
          ? this.userIdToFakeIdMap.get(data.user)
          : data.user,
      };
    } else if (data.type == "houses-swapped") {
      return {
        type: "houses-swapped",
        initiatorHouse: data.initiatorHouse,
        swappingHouse: data.swappingHouse,
        initiator: this.userIdToFakeIdMap.has(data.initiator)
          ? this.userIdToFakeIdMap.get(data.initiator)
          : data.initiator,
        swappingUser: this.userIdToFakeIdMap.has(data.swappingUser)
          ? this.userIdToFakeIdMap.get(data.swappingUser)
          : data.swappingUser,
      };
    }

    return data;
  }

  serializeToClient(
    admin: boolean,
    user: User | null,
  ): SerializedGameLogManager {
    const filteredLogs = admin ? this.logs : this.logs.filter(this.logFilter);

    return {
      logs: filteredLogs.map((l) => {
        const data = this.migrateForFaceless(admin, l.data);
        return {
          time: timeToTicks(l.time),
          data: data,
          resolvedAutomatically: l.resolvedAutomatically,
        };
      }),
      lastSeenLogTimes: admin
        ? this.lastSeenLogTimes.entries.map(([usr, time]) => [usr._id, time])
        : user
          ? this.lastSeenLogTimes.entries
              .filter(([usr, _time]) => usr == user)
              .map(([usr, time]) => [usr.id, time])
          : [],
    };
  }

  static deserializeFromServer(
    ingameGameState: IngameGameState,
    data: SerializedGameLogManager,
  ): GameLogManager {
    const gameLogManager = new GameLogManager(ingameGameState);

    gameLogManager.logs = data.logs.map((l) => ({
      time: ticksToTime(l.time),
      data: l.data,
      resolvedAutomatically: l.resolvedAutomatically,
    }));
    gameLogManager.lastSeenLogTimes = new BetterMap(
      data.lastSeenLogTimes.map(([uid, time]) => [
        ingameGameState.entireGame.users.get(uid),
        time,
      ]),
    );

    return gameLogManager;
  }
}

export interface SerializedGameLogEntry {
  time: number;
  data: GameLogData;
  resolvedAutomatically?: boolean;
}

export interface SerializedGameLogManager {
  logs: SerializedGameLogEntry[];
  lastSeenLogTimes: [string, number][];
}
