import {observer} from "mobx-react";
import DeclareSupportGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import {Component, ReactNode} from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ConditionalWrap from "../utils/ConditionalWrap";

@observer
export default class DeclareSupportComponent extends Component<GameStateComponentProps<DeclareSupportGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameState.house.name} may support one belligerent of the fight
                </Col>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            {this.props.gameState.combatGameState.houseCombatDatas.keys.map(h => (
                                <Col xs="auto" key={h.id}>
                                    <ConditionalWrap
                                        condition={!this.canChoose(h)}
                                        wrap={c =>
                                            <OverlayTrigger
                                                overlay={
                                                    <Tooltip id="support-choice-restricted">
                                                        You can&apos;t support the enemy in a combat you are involved.
                                                    </Tooltip>
                                                }
                                            >
                                                {c}
                                            </OverlayTrigger>
                                        }
                                    >
                                        <Button
                                            onClick={() => this.choose(h)}
                                            disabled={!this.canChoose(h)}
                                        >
                                            {h.name} ({h == this.props.gameState.combatGameState.attacker ? "Attacker" : "Defender"})
                                        </Button>
                                    </ConditionalWrap>
                                </Col>
                            ))}
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
            </>
        );
    }

    canChoose(supportedHouse: House): boolean {
        return this.props.gameState.combatGameState.isRestrictedToHimself(this.props.gameState.house) ? supportedHouse == this.props.gameState.house : true;
    }

    choose(house: House | null): void {
        this.props.gameState.choose(house);
    }
}
