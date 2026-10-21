import { Trans } from "../i18n";
import { Component, ReactNode } from "react";
import CancelledGameState from "../../common/cancelled-game-state/CancelledGameState";
import * as React from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";

@observer
export default class IngameCancelledComponent extends Component<
  GameStateComponentProps<CancelledGameState>
> {
  render(): ReactNode {
    return (
      <>
        <Row>
          {this.props.gameState.ingame?.childGameStateBeforeCancellation ? (
            <Col className="text-center">
              <Trans
                i18nKey="ingameCancelled.thisGameHasBeenCancelledByAModeratorOnly517bf0"
                components={{
                  element0: <FontAwesomeIcon icon={faTimes} size="3x" />,
                  element1: <br />,
                  element2: <br />
                }}
              />
            </Col>
          ) : (
            <Col className="text-center">
              <Trans
                i18nKey="ingameCancelled.thisGameHasBeenCancelledByVote6045ef"
                components={{
                  element0: <FontAwesomeIcon icon={faTimes} size="3x" />,
                  element1: <br />
                }}
              />
            </Col>
          )}
        </Row>
      </>
    );
  }
}
