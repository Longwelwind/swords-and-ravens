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
import BetterMap from "../../../../../utils/BetterMap";
import { backdoorPolitics } from "../../../../../common/ingame-game-state/game-data-structure/static-data-structure/objectiveCards";

export default class ScoreOtherObjectivesGameState extends GameState<ScoreObjectivesGameState, SelectObjectiveCardsGameState<ScoreOtherObjectivesGameState>> {
    victoryPointsAtBeginning: BetterMap<House, number>;

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    firstStart(): void {
        this.victoryPointsAtBeginning = new BetterMap(this.game.nonVassalHouses.map(h => [h, h.victoryPoints]));

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
        this.checkIfAnyHouseCanScoreBackdoorPoliticsNow();
    }

    checkIfAnyHouseCanScoreBackdoorPoliticsNow(): void {
        // The following complicated logic is necessary to support simultanously scoring (much much faster!) of secret objectives.
        // Basically there is only one objective "Backdoor Politics" which makes "turn order scoring" necessary.
        // In some rare cases, you might be able to score Backdoor Politics, depending on the results of the other houses.
        // We want to respect this and update the scorable objectives in that case, but have to respect turn order,
        // so you cannot score it if you are ahead on IT track, but the others scored before you.
        this.childGameState.notReadyHouses.forEach(house => {
            if (!house.secretObjectives.includes(backdoorPolitics)) {
                return;
            }

            const oldScorableObjectives = this.childGameState.selectableCardsPerHouse.get(house);
            const newScorableObjectives = house.secretObjectives.filter(oc => oc.canScoreObjective(house, this.ingame));

            if (newScorableObjectives.length > oldScorableObjectives.length &&
                    !oldScorableObjectives.includes(backdoorPolitics) &&
                    newScorableObjectives.includes(backdoorPolitics)) {

                // Now divide the other houses in the ones which are ahead on IT track and the ones which are behind.
                // The ones ahead must all have a victory point count greater than the count of the current house.
                // The old victory point count of the ones behind must be greater the count of the current house.
                // We use .every as this returns true on an empty array and is perfect for this purpose.

                const turnOrder = this.game.getTurnOrder();
                const ownTurnOrderIndex = turnOrder.findIndex(h => h == house);
                const housesAhead = turnOrder.filter((_h, i) => i < ownTurnOrderIndex);
                const housesBehind = turnOrder.filter((_h, i) => i > ownTurnOrderIndex);

                if (housesAhead.every(h => h.victoryPoints > house.victoryPoints) && housesBehind.every(h => this.victoryPointsAtBeginning.get(h) > house.victoryPoints)) {
                    // Okay we have to update the scorable objectives of the current not ready house
                    this.childGameState.selectableCardsPerHouse.set(house, newScorableObjectives);
                    // Only send selectable cards to the controller of the house:
                    this.entireGame.sendMessageToClients([this.ingame.getControllerOfHouse(house).user], {
                        type: "update-selectable-objectives",
                        house: house.id,
                        selectableObjectives: newScorableObjectives.map(oc => oc.id)
                    });
                }
            }
        });
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
            victoryPointsAtBeginning: this.victoryPointsAtBeginning.entries.map(([house, vps]) => [house.id, vps]),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(scoreObjectives: ScoreObjectivesGameState, data: SerializedScoreOtherObjectivesGameState): ScoreOtherObjectivesGameState {
        const scoreOtherObjectives = new ScoreOtherObjectivesGameState(scoreObjectives);
        scoreOtherObjectives.victoryPointsAtBeginning = new BetterMap(data.victoryPointsAtBeginning.map(([hid, vps]) => [scoreObjectives.game.houses.get(hid), vps]));
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
    victoryPointsAtBeginning: [string, number][];
    childGameState: SerializedSelectObjectiveCardsGameState;
}
