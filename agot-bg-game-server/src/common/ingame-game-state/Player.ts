import House from "./game-data-structure/House";
import User from "../../server/User";
import IngameGameState from "./IngameGameState";
import { VoteState } from "./vote-system/Vote";
import { observable } from "mobx";
import getElapsedSeconds, { getTimeDeltaInSeconds } from "../../utils/getElapsedSeconds";

export default class Player {
    user: User;
    house: House;
    @observable waitedForData: WaitedForData | null;
    @observable liveClockData: LiveClockData | null;

    get isNeededForVote(): boolean {
        return this.user.entireGame.ingameGameState?.votes.values.filter(vote => vote.state == VoteState.ONGOING).some(vote => !vote.votes.has(this.house)) ?? false;
    }

    get totalRemainingSeconds(): number {
        if (!this.liveClockData) {
            throw new Error("totalRemainingSeconds requested but no liveClockData present");
        }

        let total = this.liveClockData.remainingSeconds;
        if (this.liveClockData.timerStartedAt) {
            total -= getElapsedSeconds(this.liveClockData.timerStartedAt);
            total = Math.max(0, total);
        }

        return total;
    }

    clientGetTotalRemainingSeconds(now: Date): number {
        if (!this.liveClockData) {
            throw new Error("totalRemainingSeconds requested but no liveClockData present");
        }

        let total = this.liveClockData.remainingSeconds;
        if (this.liveClockData.timerStartedAt) {
            total -= getTimeDeltaInSeconds(now, this.liveClockData.timerStartedAt);
            total = Math.max(0, total);
        }

        return total;
    }

    constructor(user: User, house: House, waitedForData: WaitedForData | null = null, liveClockData: LiveClockData | null = null) {
        this.user = user;
        this.house = house;
        this.waitedForData = waitedForData;
        this.liveClockData = liveClockData;
    }

    setWaitedFor(hasBeenReactivatedAgain = false): void {
        if (!this.user.entireGame.gameSettings.pbem || this.user.connected) {
            return;
        }

        this.waitedForData = {
            date: new Date(),
            leafStateId: this.user.entireGame.leafStateId,
            handled: false,
            hasBeenReactivated: hasBeenReactivatedAgain
        };

        this.user.entireGame.broadcastToClients({
            type: "update-waited-for-data",
            userId: this.user.id,
            waitedForData: this.waitedForData ? {
                date: this.waitedForData.date.getTime(),
                leafStateId: this.waitedForData.leafStateId,
                handled: this.waitedForData.handled,
                hasBeenReactivated: this.waitedForData.hasBeenReactivated
            } : null
        });

        // console.log(`Now waiting for ${this.user.name} in state ${this.waitedForData.leafStateId}`);
    }

    resetWaitedFor(): void {
        this.waitedForData = null;

        this.user.entireGame.broadcastToClients({
            type: "update-waited-for-data",
            userId: this.user.id,
            waitedForData: null
        });
    }

    sendPbemResponseTime(): void {
        if (!this.waitedForData) {
            return;
        }

        const responseTimeInSeconds = getElapsedSeconds(this.waitedForData.date);

        // Send value if user was not reactivated again (and probably is still online to do his move immediately...)
        if (this.user.entireGame.onNewPbemResponseTime && !this.waitedForData.hasBeenReactivated) {
            this.user.entireGame.onNewPbemResponseTime(this.user, responseTimeInSeconds);
        } else {
            // console.log(`${this.user.name} has ben REACTIVATED`);
        }

        this.waitedForData.handled = true;

        this.user.entireGame.broadcastToClients({
            type: "update-waited-for-data",
            userId: this.user.id,
            waitedForData: null
        });
    }

    serializeToClient(): SerializedPlayer {
        return {
            userId: this.user.id,
            houseId: this.house.id,
            waitedForData: this.waitedForData ? {
                date: this.waitedForData.date.getTime(),
                leafStateId: this.waitedForData.leafStateId,
                handled: this.waitedForData.handled,
                hasBeenReactivated: this.waitedForData.hasBeenReactivated
            } : null,
            liveClockData: this.liveClockData ? {
                remainingSeconds: this.liveClockData.remainingSeconds,
                timerStartedAt: this.liveClockData.timerStartedAt ? this.liveClockData.timerStartedAt.getTime() : null
            } : null
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedPlayer): Player {
        return new Player(
            ingame.entireGame.users.get(data.userId),
            ingame.game.houses.get(data.houseId),
            data.waitedForData ? {
                date: new Date(data.waitedForData.date),
                leafStateId: data.waitedForData.leafStateId,
                handled: data.waitedForData.handled,
                hasBeenReactivated: data.waitedForData.hasBeenReactivated
            } : null,
            data.liveClockData ? {
                remainingSeconds: data.liveClockData.remainingSeconds,
                serverTimer: null,
                timerStartedAt: data.liveClockData.timerStartedAt ? new Date(data.liveClockData.timerStartedAt) : null
            } : null
        );
    }
}

export interface SerializedPlayer {
    userId: string;
    houseId: string;
    waitedForData: SerializedWaitedForData | null;
    liveClockData: SerializedLiveClockData | null;
}

export interface WaitedForData {
    date: Date;
    leafStateId: string;
    handled: boolean;
    hasBeenReactivated: boolean;
}

export interface LiveClockData {
    remainingSeconds: number;
    serverTimer: NodeJS.Timeout | null;
    timerStartedAt: Date | null;
}

export interface SerializedLiveClockData {
    remainingSeconds: number;
    timerStartedAt: number | null;
}

export interface SerializedWaitedForData {
    date: number;
    leafStateId: string;
    handled: boolean;
    hasBeenReactivated: boolean;
}
