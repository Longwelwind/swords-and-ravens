import {observer} from "mobx-react";
import {Component} from "react";
import React from "react";
import ChooseRavenActionGameState
    from "../../common/ingame-game-state/action-game-state/use-raven-game-state/choose-raven-action-game-state/ChooseRavenActionGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import {RavenAction} from "../../messages/ClientMessage";

@observer
export default class ChooseRavenActionComponent extends Component<GameStateComponentProps<ChooseRavenActionGameState>> {
    render() {
        return (
            <>
                <p>
                    The holder of the Raven token may now choose to replace an order or to see the top
                    card of the wildling deck
                </p>
                <p>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.ravenHolder) ? (
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button onClick={() => this.choose(RavenAction.REPLACE_ORDER)}>Replace an order</Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(RavenAction.SEE_TOP_WILDLING_CARD)}>See wildling deck</Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(RavenAction.NONE)}>Skip</Button>
                            </Col>
                        </Row>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.ravenHolder.name}...
                        </div>
                    )}
                </p>
            </>
        );
    }

    private choose(action: RavenAction) {
        this.props.gameState.chooseRavenAction(action);
    }
}
