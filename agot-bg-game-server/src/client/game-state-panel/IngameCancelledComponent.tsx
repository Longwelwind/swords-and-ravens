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
export default class IngameCancelledComponent extends Component<GameStateComponentProps<CancelledGameState>> {
    render(): ReactNode {
        return (
            <>
                <Row>
                    {this.props.gameState.ingame?.childGameStateBeforeCancellation ? (
                        <Col className="text-center">
                            <FontAwesomeIcon icon={faTimes} size="3x" /><br />
                            This game has been cancelled by a moderator.<br />
                            Only the site administrator could restore it.
                        </Col>
                    ) : (
                        <Col className="text-center">
                            <FontAwesomeIcon icon={faTimes} size="3x" /><br />
                            This game has been cancelled by vote
                        </Col>
                    )}
                </Row>
            </>
        );
    }
}
