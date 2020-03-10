import {observable} from "mobx";
import GameLog, {GameLogData} from "./GameLog";
import IngameGameState from "../IngameGameState";

export default class GameLogManager {
    ingameGameState: IngameGameState;
    @observable logs: GameLog[] = [];

    constructor(ingameGameState: IngameGameState) {
        this.ingameGameState = ingameGameState;
    }

    log(data: GameLogData): void {
        const time = new Date();
        this.logs.push({data, time});

        this.ingameGameState.entireGame.broadcastToClients({
            type: "add-game-log",
            data: data,
            time: time.getTime() / 1000
        });
    }

    serializeToClient(): SerializedGameLogManager {
        return {
            logs: this.logs.map(l => ({time: l.time.getTime() / 1000, data: l.data}))
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedGameLogManager): GameLogManager {
        const gameLogManager = new GameLogManager(ingameGameState);

        gameLogManager.logs = data.logs.map(l => ({time: new Date(l.time * 1000), data: l.data}));

        return gameLogManager;
    }
}

export interface SerializedGameLogManager {
    logs: {time: number; data: GameLogData}[];
}
