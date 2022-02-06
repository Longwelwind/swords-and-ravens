import GameState from "../../../../GameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import IngameGameState from "../../../IngameGameState";
import House from "../../../game-data-structure/House";
import ScoreObjectivesGameState from "../ScoreObjectivesGameState";
import SelectObjectiveCardsGameState, { SerializedSelectObjectiveCardsGameState } from "../../../../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import Game from "../../../../../common/ingame-game-state/game-data-structure/Game";
import { ObjectiveCard } from "../../../../../common/ingame-game-state/game-data-structure/static-data-structure/ObjectiveCard";
import _ from "lodash";

export default class ScoreOtherObjectivesGameState extends GameState<ScoreObjectivesGameState, SelectObjectiveCardsGameState<ScoreOtherObjectivesGameState>> {
    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    firstStart(): void {
        this.setChildGameState(new SelectObjectiveCardsGameState(this)).firstStart(
            this.game.nonVassalHouses.map(h => [h, h.secretObjectives.filter(oc => oc.canScoreObjective(h, this.ingame))]),
            1,
            true
        );
    }

    onObjectiveCardsSelected(house: House, selectedObjectiveCards: ObjectiveCard[]): void {
        if (selectedObjectiveCards.length == 0) {
            this.ingame.log({
                type: "objective-scored",
                house: house.id,
                objectiveCard: null,
                victoryPoints: 0,
                newTotal: house.victoryPoints
            });
        } else {
            // Though we just can score 1 objective by the rules, we do it in a loop
            selectedObjectiveCards.forEach(oc => {
                let victoryPoints = oc.getVictoryPointsForHouse(house);
                if (oc.id == "mercantile-ventures" && this.ingame.entireGame.gameSettings.addPortToTheEyrie) {
                    victoryPoints = 1;
                }

                this.game.updateVictoryPoints(house, victoryPoints);
                house.completedObjectives.push(oc);
                _.pull(house.secretObjectives, oc);

                this.ingame.log({
                    type: "objective-scored",
                    house: house.id,
                    objectiveCard: oc.id,
                    victoryPoints: victoryPoints,
                    newTotal: house.victoryPoints
                });
            });
        }

        this.ingame.broadcastObjectives();
    }

    onSelectObjectiveCardsFinish(): void {
        this.parentGameState.onScoreOtherObjectivesGameStateEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedScoreOtherObjectivesGameState {
        return {
            type: "score-other-objectives",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(scoreObjectives: ScoreObjectivesGameState, data: SerializedScoreOtherObjectivesGameState): ScoreOtherObjectivesGameState {
        const scoreOtherObjectives = new ScoreOtherObjectivesGameState(scoreObjectives);
        scoreOtherObjectives.childGameState = scoreOtherObjectives.deserializeChildGameState(data.childGameState);
        return scoreOtherObjectives;
    }

    deserializeChildGameState(data: SerializedScoreOtherObjectivesGameState["childGameState"]): ScoreOtherObjectivesGameState["childGameState"] {
        switch (data.type) {
            case "select-objectives":
                return SelectObjectiveCardsGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedScoreOtherObjectivesGameState {
    type: "score-other-objectives";
    childGameState: SerializedSelectObjectiveCardsGameState
}
