import House from "./game-data-structure/House";
import User from "../../server/User";
import IngameGameState from "./IngameGameState";

export default class Player {
    user: User;
    house: House;
    waitedForData: WaitedForData | null;

    constructor(user: User, house: House, waitedForData: WaitedForData | null = null) {
        this.user = user;
        this.house = house;
        this.waitedForData = waitedForData;
    }

    setWaitedFor(hasBeenReactivatedAgain = false): void {
        if (!this.user.entireGame.gameSettings.pbem) {
            return;
        }

        this.waitedForData = {
            date: new Date(),
            leafStateId: this.user.entireGame.leafStateId,
            handled: false,
            hasBeenReactivated: hasBeenReactivatedAgain
        };

        // console.log(`Now waiting for ${this.user.name} in state ${this.waitedForData.leafStateId}`);
    }

    resetWaitedFor(): void {
        this.waitedForData = null;
    }

    sendPbemResponseTime(): void {
        if (!this.waitedForData) {
            return;
        }

        const responseTimeInSeconds = Math.floor((new Date().getTime() - this.waitedForData.date.getTime()) / 1000);

        // Send value if user was not reactivated again (and probably is still online to do his move immediately)
        // or if his responseTime is greater than 5 mintes (thus meaning he decided to wait for the decision)
        if (this.user.entireGame.onNewPbemResponseTime && (!this.waitedForData.hasBeenReactivated || responseTimeInSeconds > (5 * 60))) {
            this.user.entireGame.onNewPbemResponseTime(this.user, responseTimeInSeconds);
        } else {
            // console.log(`${this.user.name} has ben REACTIVATED`);
        }

        this.waitedForData.handled = true;
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
        );
    }
}

export interface SerializedPlayer {
    userId: string;
    houseId: string;
    waitedForData: SerializedWaitedForData | null;
}

export interface WaitedForData {
    date: Date;
    leafStateId: string;
    handled: boolean;
    hasBeenReactivated: boolean;
}

export interface SerializedWaitedForData {
    date: number;
    leafStateId: string;
    handled: boolean;
    hasBeenReactivated: boolean;
}
