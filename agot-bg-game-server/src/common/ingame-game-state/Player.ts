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

    setWaitedFor(): void {
        if (!this.user.entireGame.gameSettings.pbem) {
            return;
        }

        this.waitedForData = {
            date: new Date(),
            leafStateId: this.user.entireGame.leafStateId,
            handled: false
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

        if (responseTimeInSeconds > 20) {
            // Only send response time if is greater than 20 seconds to not count actions when a player was immeadiately activated again
            this.user.entireGame.onNewPbemResponseTime(this.user, responseTimeInSeconds);
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
                handled: this.waitedForData.handled
            }
                : null
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedPlayer): Player {
        return new Player(
            ingame.entireGame.users.get(data.userId),
            ingame.game.houses.get(data.houseId),
            data.waitedForData ? {
                date: new Date(data.waitedForData.date),
                leafStateId: data.waitedForData.leafStateId,
                handled: data.waitedForData.handled
            }
                : null);
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
}

export interface SerializedWaitedForData {
    date: number;
    leafStateId: string;
    handled: boolean;
}
