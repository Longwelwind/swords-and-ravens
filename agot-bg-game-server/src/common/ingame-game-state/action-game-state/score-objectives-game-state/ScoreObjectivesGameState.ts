import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import {SerializedScoreSpecialObjectivesGameState} from "./score-special-objectives-game-state/ScoreSpecialObjectivesGameState";
import IngameGameState from "../../IngameGameState";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import EntireGame from "../../../EntireGame";
import ScoreSpecialObjectivesGameState from "./score-special-objectives-game-state/ScoreSpecialObjectivesGameState";
import ScoreOtherObjectivesGameState, { SerializedScoreOtherObjectivesGameState } from "./score-other-objectives-game-state/ScoreOtherObjectivesGameState";

export default class ScoreObjectivesGameState extends GameState<ActionGameState, ScoreSpecialObjectivesGameState | ScoreOtherObjectivesGameState> {
    get action(): ActionGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.action.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get entireGame(): EntireGame {
        return this.action.entireGame;
    }

    firstStart(): void {
        this.setChildGameState(new ScoreSpecialObjectivesGameState(this)).firstStart();
    }

    onScoreSpecialObjectivesGameStateEnd(): void {
        this.setChildGameState(new ScoreOtherObjectivesGameState(this)).firstStart();
    }

    onScoreOtherObjectivesGameStateEnd(): void {
        this.action.onScoreObjectivesGameStateEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedScoreObjectivesGameState {
        return {
            type: "score-objectives",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(actionGameState: ActionGameState, data: SerializedScoreObjectivesGameState): ScoreObjectivesGameState {
        const scoreObjectives = new ScoreObjectivesGameState(actionGameState);

        scoreObjectives.childGameState = scoreObjectives.deserializeChildGameState(data.childGameState);

        return scoreObjectives;
    }

    deserializeChildGameState(data: SerializedScoreObjectivesGameState["childGameState"]): ScoreObjectivesGameState["childGameState"] {
        switch (data.type) {
            case "score-special-objectives":
                return ScoreSpecialObjectivesGameState.deserializeFromServer(this, data);
            case "score-other-objectives":
                return ScoreOtherObjectivesGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedScoreObjectivesGameState {
    type: "score-objectives";
    childGameState: SerializedScoreSpecialObjectivesGameState | SerializedScoreOtherObjectivesGameState;
}
