import {observable} from "mobx";
import GameLog, {GameLogData} from "./GameLog";
import IngameGameState from "../IngameGameState";
import BetterMap from "../../../utils/BetterMap";
import User from "../../../server/User";

export function timeToTicks(time: Date): number {
    return Math.floor(time.getTime() / 1000);
}

export function ticksToTime(ticks: number): Date {
    return new Date(ticks * 1000);
}

export default class GameLogManager {
    ingameGameState: IngameGameState;
    @observable logs: GameLog[] = [];
    @observable lastSeenLogTimes: BetterMap<User, number> = new BetterMap();

    constructor(ingameGameState: IngameGameState) {
        this.ingameGameState = ingameGameState;
    }

    log(data: GameLogData, resolvedAutomatically = false): void {
        const time = new Date();
        this.logs.push({data, time, resolvedAutomatically});

        this.ingameGameState.entireGame.broadcastToClients({
            type: "add-game-log",
            data: data,
            time: Math.floor(time.getTime() / 1000),
            resolvedAutomatically: resolvedAutomatically
        });
    }

    sendGameLogSeen(time: number): void {
        this.ingameGameState.entireGame.sendMessageToServer({
            type: "game-log-seen",
            time: time
        });
    }

    serializeToClient(admin: boolean, user: User | null): SerializedGameLogManager {
        return {
            logs: this.logs.map(l => ({time: timeToTicks(l.time), data: l.data, resolvedAutomatically: l.resolvedAutomatically})),
            lastSeenLogTimes: admin
                ? this.lastSeenLogTimes.entries.map(([usr, time]) => [usr.id, time])
                : user
                    ? this.lastSeenLogTimes.entries.filter(([usr, _time]) => usr == user).map(([usr, time]) => [usr.id, time])
                    : []
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedGameLogManager): GameLogManager {
        const gameLogManager = new GameLogManager(ingameGameState);

        gameLogManager.logs = data.logs.map(l => ({time: ticksToTime(l.time), data: l.data, resolvedAutomatically: l.resolvedAutomatically}));
        gameLogManager.lastSeenLogTimes = new BetterMap(data.lastSeenLogTimes.map(([uid, time]) => [ingameGameState.entireGame.users.get(uid), time]));

        return gameLogManager;
    }
}

export interface SerializedGameLogManager {
    logs: {time: number; data: GameLogData, resolvedAutomatically?: boolean}[];
    lastSeenLogTimes: [string, number][];
}
