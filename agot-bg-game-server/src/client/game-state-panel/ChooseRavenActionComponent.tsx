import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
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
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    The holder of the Raven token may now choose to replace an order or to see the top
                    card of the Wildling deck
                </Col>
                {this.props.gameClient.doesControlHouse(this.props.gameState.ravenHolder) ? (
                    <Col xs={12}>
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button onClick={() => this.choose(RavenAction.REPLACE_ORDER)}>Replace an Order Token</Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(RavenAction.SEE_TOP_WILDLING_CARD)}>Look at the Top Wildling Card</Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(RavenAction.NONE)}>Skip</Button>
                            </Col>
                        </Row>
                    </Col>
                ) : (
                    <Col xs={12} className="text-center">
                        Waiting for {this.props.gameState.ravenHolder.name}...
                    </Col>
                )}
            </>
        );
    }

    private choose(action: RavenAction): void {
        this.props.gameState.chooseRavenAction(action);
    }
}
