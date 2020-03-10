import {observer} from "mobx-react";
import UseValyrianSteelBladeGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/use-valyrian-steel-blade-game-state/UseValyrianSteelBladeGameState";
import {Component, ReactNode} from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class UseValyrianSteelBladeComponent extends Component<GameStateComponentProps<UseValyrianSteelBladeGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    The holder of the Valyrian Steel Blade may choose to use it...
                </Col>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button onClick={() => this.choose(true)}>Use it</Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.choose(false)}>Don&apos;t use it</Button>
                            </Col>
                        </Row>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name}...
                        </div>
                    )}
                </Col>
            </>
        );
    }

    choose(use: boolean): void {
        this.props.gameState.choose(use);
    }
}
