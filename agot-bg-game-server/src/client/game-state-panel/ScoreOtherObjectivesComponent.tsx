import { Trans } from "../i18n";
import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import SelectObjectiveCardsGameState from "../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import React from "react";
import { Col, Row } from "react-bootstrap";
import SelectObjectiveCardsComponent from "./SelectObjectiveCardsComponent";
import ScoreOtherObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/score-other-objectives-game-state/ScoreOtherObjectivesGameState";

@observer
export default class ScoreOtherObjectivesComponent extends Component<
  GameStateComponentProps<ScoreOtherObjectivesGameState>
> {
  get selectObjectivesState(): SelectObjectiveCardsGameState<ScoreOtherObjectivesGameState> {
    return this.props.gameState.childGameState;
  }

  get raiseBackdoorPoliticsWarning(): boolean {
    if (!this.props.gameClient.authenticatedPlayer) {
      return false;
    }

    const controlledHouse = this.props.gameClient.authenticatedPlayer.house;

    if (this.selectObjectivesState.readyHouses.has(controlledHouse)) {
      return false;
    }

    const backdoorPolitics = controlledHouse.secretObjectives.find(
      (oc) => oc.id == "backdoor-politics"
    );

    if (!backdoorPolitics) {
      return false;
    }

    if (
      this.selectObjectivesState.selectableCardsPerHouse
        .get(controlledHouse)
        .includes(backdoorPolitics)
    ) {
      // BP already can be scored.
      return false;
    }

    // Now check if it is possible that the server will update the scorable objectives and Backdoor Politics could be scored
    // after a house chose to score their objective.

    // This can happen when all the houses ahead on IT track have a maximum delta of 3 to the current house on the victory track
    // (Though it's very unlikely but there are 4 objectives which can grant 4 victory points,
    // which means by scoring a 4 the houses ahead could overtake the current house on the victory track, thus allowing to score BP)
    // and if all houses behind on IT track have a higher victory point count than the current house:
    const game = this.props.gameState.game;
    const turnOrder = game.ingame.getTurnOrderWithoutVassals();
    const ownTurnOrderIndex = turnOrder.findIndex((h) => h == controlledHouse);
    const housesAhead = turnOrder.filter((_h, i) => i < ownTurnOrderIndex);
    const housesBehind = turnOrder.filter((_h, i) => i > ownTurnOrderIndex);

    const initialVps = this.props.gameState.victoryPointsAtBeginning;
    return (
      housesAhead.every((h) => {
        if (this.selectObjectivesState.readyHouses.has(h)) {
          // House already chose to score, use their actual VP count for comparison
          return h.victoryPoints > controlledHouse.victoryPoints;
        } else {
          // House haven't chosen yet. Assume the maximum possible victory points they could score
          return (
            Math.min(
              initialVps.get(h) + 4,
              game.victoryPointsCountNeededToWin
            ) > controlledHouse.victoryPoints
          );
        }
      }) &&
      housesBehind.every(
        (h) => initialVps.get(h) > controlledHouse.victoryPoints
      )
    );
  }

  render(): ReactNode {
    const player = this.props.gameClient.authenticatedPlayer;
    const noCardsToScore =
      player &&
      this.selectObjectivesState.getWaitedUsers().includes(player.user) &&
      this.selectObjectivesState.selectableCardsPerHouse.get(player.house)
        .length == 0;
    return (
      <Row className="justify-content-center">
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="scoreOtherObjectives.eachHouseMayChooseToScoreOneObjectiveCarda2d53d"
            components={{
              value0: (
                <>
                  {this.raiseBackdoorPoliticsWarning && (
                    <>
                      <Trans
                        i18nKey="scoreOtherObjectives.warningYouHoldBackdoorPoliticsInYourObjectivesHand4f7a4e"
                        components={{
                          element0: <br />,
                          element1: <br />,
                          element2: <b style={{ color: "red" }} />,
                          element3: <b />
                        }}
                      />
                    </>
                  )}
                </>
              )
            }}
          />
        </Col>
        {noCardsToScore && (
          <Col xs={10} className="text-center">
            <>
              <Trans
                i18nKey="scoreOtherObjectives.noteYouCanTScoreAnyOfYourSecret7fd1d7"
                components={{ element0: <b />, element1: <i /> }}
              />
            </>
          </Col>
        )}
        {renderChildGameState(this.props, [
          [SelectObjectiveCardsGameState, SelectObjectiveCardsComponent]
        ])}
      </Row>
    );
  }
}
