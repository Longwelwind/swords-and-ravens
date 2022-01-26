import {observable} from "mobx";
import GameLog, {GameLogData} from "./GameLog";
import IngameGameState from "../IngameGameState";

export default class GameLogManager {
    ingameGameState: IngameGameState;
    @observable logs: GameLog[] = [];

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

    serializeToClient(): SerializedGameLogManager {
        return {
            logs: this.logs.map(l => ({time: Math.floor(l.time.getTime() / 1000), data: l.data, resolvedAutomatically: l.resolvedAutomatically}))
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedGameLogManager): GameLogManager {
        const gameLogManager = new GameLogManager(ingameGameState);

        gameLogManager.logs = data.logs.map(l => ({time: new Date(l.time * 1000), data: l.data, resolvedAutomatically: l.resolvedAutomatically}));

        return gameLogManager;
    }
}

export interface SerializedGameLogManager {
    logs: {time: number; data: GameLogData, resolvedAutomatically?: boolean}[];
}
