import {observable} from "mobx";
import EntireGame from "./EntireGame";

export default class GameLogManager {
    entireGame: EntireGame;
    @observable logs: LogMessage[] = [];


    constructor(entireGame: EntireGame) {
        this.entireGame = entireGame;
    }

    log(message: string): void {
        const time = new Date();
        this.logs.push({message, time});

        this.entireGame.broadcastToClients({
            type: "game-log",
            message: message,
            time: time.getTime() / 1000
        })
    }

    serializeToClient(): SerializedGameLogManager {
        return {
            logs: this.logs.map(l => ({time: l.time.getTime() / 1000, message: l.message}))
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedGameLogManager): GameLogManager {
        const gameLogManager = new GameLogManager(entireGame);

        gameLogManager.logs = data.logs.map(l => ({time: new Date(l.time * 1000), message: l.message}));

        return gameLogManager;
    }
}

export interface LogMessage {
    time: Date;
    message: string;
}

export interface SerializedGameLogManager {
    logs: {time: number; message: string}[];
}
