import { t, Trans } from "../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import ShiftingAmbitionsGameState, {
  ShiftingAmbitionsStep
} from "../../common/ingame-game-state/westeros-game-state/shifting-ambitions-game-state/ShiftingAmbitionsGameState";
import SelectObjectiveCardsGameState from "../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import SelectObjectiveCardsComponent from "./SelectObjectiveCardsComponent";
import ObjectiveCardComponent from "./utils/ObjectiveCardComponent";

@observer
export default class ShiftingAmbitionsComponent extends Component<
  GameStateComponentProps<ShiftingAmbitionsGameState>
> {
  get gameState(): ShiftingAmbitionsGameState {
    return this.props.gameState;
  }
  render(): ReactNode {
    const drawPool =
      this.gameState.objectiveCardPool.length > 0 &&
      this.gameState.childGameState.participatingHouses.length == 1 &&
      !this.props.gameClient.doesControlHouse(
        this.gameState.childGameState.participatingHouses[0]
      );
    return (
      <Col xs={12}>
        <Row className="justify-content-center">
          <Col xs={12} className="text-center">
            {this.gameState.step ==
            ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_HAND ? (
              <>
                <Trans
                  i18nKey="shiftingAmbitions.eachHouseChoose1ObjectiveCardFromTheirHand5cd87a"
                  components={{ lineBreak: <br />, small: <small /> }}
                />
              </>
            ) : (
              <>
                {t(
                  "shiftingAmbitions.inTurnOrderEachHouseChooses1ObjectiveCard52297c"
                )}
              </>
            )}
          </Col>
          {drawPool && (
            <Col xs="12">
              <Row className="justify-content-center">
                {this.gameState.objectiveCardPool.map((oc) => (
                  <Col xs="auto" key={`shifting-ambitions_${oc.id}`}>
                    <ObjectiveCardComponent objectiveCard={oc} size="smedium" />
                  </Col>
                ))}
              </Row>
            </Col>
          )}
          {renderChildGameState(this.props, [
            [SelectObjectiveCardsGameState, SelectObjectiveCardsComponent]
          ])}
        </Row>
      </Col>
    );
  }
}
