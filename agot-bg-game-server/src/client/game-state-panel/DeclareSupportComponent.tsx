import {observer} from "mobx-react";
import DeclareSupportGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import {Component} from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";

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
                                <Button onClick={() => this.choose(this.props.gameState.combatGameState.attacker)}>
                                    {this.props.gameState.combatGameState.attacker.name} (Attacker)
                                </Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(this.props.gameState.combatGameState.defender)}>
                                    {this.props.gameState.combatGameState.defender.name} (Defender)
                                </Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(null)}>
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

    choose(house: House | null) {
        this.props.gameState.choose(house);
    }
}
