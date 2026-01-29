import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import { Row } from "react-bootstrap";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import AeronDamphairAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/aeron-damphair-ability-game-state/AeronDamphairAbilityGameState";
import SelectHouseCardGameState from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import { Alert } from "react-bootstrap";

@observer
export default class AeronDamphairAbilityComponent extends Component<
  GameStateComponentProps<AeronDamphairAbilityGameState>
> {
  render(): ReactNode {
    const childGameState = this.props.gameState.childGameState;
    const selectedCard =
      childGameState instanceof SelectHouseCardGameState
        ? childGameState.selectedHouseCard
        : null;
    const showWarning = selectedCard?.ability?.isCancelAbility() === true;

    return (
      <>
        <Col xs={12} className="text-center">
          <b>Aeron Damphair:</b> House <b>{childGameState.house.name}</b> may
          discard 2 Power tokens to change their House card.
        </Col>
        {showWarning && (
          <Col xs={12}>
            <Row className="justify-content-center">
              <Col xs="auto">
                <Alert
                  variant="danger"
                  className="text-center pl-2 pt-1 pr-2 pb-2"
                >
                  <small>
                    <b>Warning:</b> This card&apos;s ability will have no effect
                    because the cancellation phase has already passed!
                  </small>
                </Alert>
              </Col>
            </Row>
          </Col>
        )}
        {renderChildGameState(this.props, [
          [SimpleChoiceGameState, SimpleChoiceComponent],
          [SelectHouseCardGameState, SelectHouseCardComponent],
        ])}
      </>
    );
  }
}
