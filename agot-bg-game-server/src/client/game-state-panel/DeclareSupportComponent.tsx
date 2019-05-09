import {observer} from "mobx-react";
import DeclareSupportGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import {Component} from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import {SupportTarget} from "../../messages/ClientMessage";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class DeclareSupportComponent extends Component<GameStateComponentProps<DeclareSupportGameState>> {
    render() {
        return (
            <Row>
                <Col xs={12}>
                    {this.props.gameState.house.name} may support one belligerent of the fight
                </Col>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button onClick={() => this.choose(SupportTarget.ATTACKER)}>
                                    {this.props.gameState.combatGameState.attacker.name} (Attacker)
                                </Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(SupportTarget.DEFENDER)}>
                                    {this.props.gameState.combatGameState.defender.name} (Defender)
                                </Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(SupportTarget.NONE)}>
                                    None
                                </Button>
                            </Col>
                        </Row>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name} to declare its support...
                        </div>
                    )}
                </Col>
            </Row>
        );
    }

    choose(supportTarget: SupportTarget) {
        this.props.gameState.choose(supportTarget);
    }
}
