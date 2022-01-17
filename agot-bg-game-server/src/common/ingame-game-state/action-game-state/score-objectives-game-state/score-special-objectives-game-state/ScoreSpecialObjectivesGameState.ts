import GameState from "../../../../GameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import IngameGameState from "../../../IngameGameState";
import EntireGame from "../../../../EntireGame";
import House from "../../../game-data-structure/House";
import ActionGameState from "../../ActionGameState";
import User from "../../../../../server/User";
import ScoreObjectivesGameState from "../ScoreObjectivesGameState";
import _ from "lodash";
import { observable } from "mobx";

export default class ScoreSpecialObjectivesGameState extends GameState<ScoreObjectivesGameState> {
    @observable readyHouses: House[];

    get actionGameState(): ActionGameState {
        return this.parentGameState.action;
    }

    get ingame(): IngameGameState {
        return this.actionGameState.ingame;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    get notReadyHouses(): House[] {
        return _.without(this.ingame.game.nonVassalHouses, ...this.readyHouses);
    }

    firstStart(): void {
        this.readyHouses = [];

        // Here we have to take care and only consider non vassal houses as we allow vassalizing a defeated house
        // to avoid stalling games
        this.ingame.game.nonVassalHouses.forEach(h => {
            if (!h.specialObjective?.canScoreObjective(h, this.ingame)) {
                this.ingame.log({
                    type: "special-objective-scored",
                    house: h.id,
                    scored: false
                }, true);
                this.readyHouses.push(h);
            }
        });

        this.checkAndProceedEndOfScoreSpecialObjectives();
    }

    checkAndProceedEndOfScoreSpecialObjectives(): void {
        if (this.ingame.game.nonVassalHouses.every(h => this.readyHouses.includes(h))) {
            this.parentGameState.onScoreSpecialObjectivesGameStateEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "score-objective") {
            if (this.readyHouses.includes(player.house)) {
                return;
            }

            if (message.objective != null && !player.house.specialObjective?.canScoreObjective(player.house, this.ingame)) {
                return;
            }

            if (message.objective != null) {
                player.house.victoryPoints++;
                this.ingame.broadcastObjectives();
            }

            this.ingame.log({
                type: "special-objective-scored",
                house: player.house.id,
                scored: message.objective != null
            });

            this.readyHouses.push(player.house);

            this.entireGame.broadcastToClients({
                type: "player-ready",
                userId: player.user.id
            });

            this.checkAndProceedEndOfScoreSpecialObjectives();
        }
    }

    getWaitedUsers(): User[] {
        return this.notReadyHouses.map(h => this.parentGameState.ingame.getControllerOfHouse(h).user);
    }

    sendDecision(score: boolean): void {
        this.parentGameState.entireGame.sendMessageToServer({
            type: "score-objective",
            objective: score ? "special" : null
        });
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "player-ready") {
            const player = this.parentGameState.ingame.players.get(this.entireGame.users.get(message.userId));
            this.readyHouses.push(player.house);
        }
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedScoreSpecialObjectivesGameState {
        return {
            type: "score-special-objectives",
            readyHouses: this.readyHouses.map(h => h.id)
        };
    }

    static deserializeFromServer(scoreObjectives: ScoreObjectivesGameState, data: SerializedScoreSpecialObjectivesGameState): ScoreSpecialObjectivesGameState {
        const scoreSpecialObjectives = new ScoreSpecialObjectivesGameState(scoreObjectives);
        scoreSpecialObjectives.readyHouses = data.readyHouses.map(hid => scoreObjectives.game.houses.get(hid));
        return scoreSpecialObjectives;
    }
}

export interface SerializedScoreSpecialObjectivesGameState {
    type: "score-special-objectives";
    readyHouses: string[];
}
