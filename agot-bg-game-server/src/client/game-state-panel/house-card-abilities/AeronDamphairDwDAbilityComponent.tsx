import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import React from "react";
import Col from "react-bootstrap/Col";
import AeronDamphairDwDAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";
import Player from "../../../common/ingame-game-state/Player";
import { Button, Row } from "react-bootstrap";
import { observable } from "mobx";

@observer
export default class AeronDamphairAbilityComponent extends Component<GameStateComponentProps<AeronDamphairDwDAbilityGameState>> {
    @observable powerTokens = 0;

    get authenticatedPlayer(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Aeron Damphair:</b> House <b>{this.props.gameState.house.name}</b> may discard any number of available Power token to increase the combat strength of his card by the number of Power tokens discarded.
                </Col>
                {this.authenticatedPlayer && this.props.gameClient.doesControlHouse(this.props.gameState.house) && (
                    <>
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <input
                                        type="range"
                                        className="custom-range"
                                        min={0}
                                        max={this.authenticatedPlayer.house.powerTokens}
                                        value={this.powerTokens}
                                        onChange={e => {
                                            this.powerTokens = parseInt(e.target.value);
                                        }}
                                        disabled={this.authenticatedPlayer.house.powerTokens==0}
                                    />
                                </Col>
                                <Col xs="auto">
                                    <div style={{marginLeft: "10px"}}>
                                        {this.powerTokens}
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                        <Col xs={12} className="text-center">
                            <Button
                                onClick={() => this.props.gameState.sendPowerTokens(this.powerTokens)}
                            >
                                Confirm
                            </Button>
                        </Col>
                    </>
                )}
                <Col xs={12} className="text-center">
                    Waiting for {this.props.gameState.house.name} ...
                </Col>
            </>
        );
    }
}
