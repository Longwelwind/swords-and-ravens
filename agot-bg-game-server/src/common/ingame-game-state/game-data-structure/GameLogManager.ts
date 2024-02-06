import {observable} from "mobx";
import GameLog, {GameLogData} from "./GameLog";
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
    'orders-revealed'
];

const blindDraftBannedLogs = [
    'orders-revealed',
    'house-cards-returned',
    'roose-bolton-house-cards-returned',
    'massing-on-the-milkwater-house-cards-back'
];

export default class GameLogManager {
    ingameGameState: IngameGameState;
    @observable logs: GameLog[] = [];
    @observable lastSeenLogTimes: BetterMap<User, number> = new BetterMap();

    constructor(ingameGameState: IngameGameState) {
        this.ingameGameState = ingameGameState;
    }

    private logFilter = (log: GameLog): boolean => {
        if (this.ingameGameState.isEndedOrCancelled) return true;
        return this.fogOfWarFilter(log) && this.blindDraftFilter(log);
    }

    private fogOfWarFilter = (log: GameLog): boolean => {
        if (!this.ingameGameState.fogOfWar) return true;
        return !fogOfWarBannedLogs.includes(log.data.type);
    }

    private blindDraftFilter = (log: GameLog): boolean => {
        if (!this.ingameGameState.entireGame.gameSettings.blindDraft) return true;
        return !blindDraftBannedLogs.includes(log.data.type);
    }

    log(data: GameLogData, resolvedAutomatically = false): void {
        const time = new Date();
        const log = {data, time, resolvedAutomatically};
        this.logs.push(log);

        if (this.logFilter(log)) {
            this.ingameGameState.entireGame.broadcastToClients({
                type: "add-game-log",
                data: data,
                time: Math.round(time.getTime() / 1000),
                resolvedAutomatically: resolvedAutomatically
            });
        }
    }

    sendGameLogSeen(time: number): void {
        this.ingameGameState.entireGame.sendMessageToServer({
            type: "game-log-seen",
            time: time
        });
    }

    serializeToClient(admin: boolean, user: User | null): SerializedGameLogManager {
        const filteredLogs = admin ? this.logs : this.logs.filter(this.logFilter);

        return {
            logs: filteredLogs.map(l => ({time: timeToTicks(l.time), data: l.data, resolvedAutomatically: l.resolvedAutomatically})),
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
