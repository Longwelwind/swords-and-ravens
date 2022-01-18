import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import React from "react";
import { Button, Col, Row } from "react-bootstrap";
import ScoreSpecialObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/score-special-objectives-game-state/ScoreSpecialObjectivesGameState";
import Player from "../../common/ingame-game-state/Player";

@observer
export default class ScoreSpecialObjectivesComponent extends Component<GameStateComponentProps<ScoreSpecialObjectivesGameState>> {
    get authenticatedPlayer(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    get gameState(): ScoreSpecialObjectivesGameState {
        return this.props.gameState;
    }

    get mustChoose(): boolean {
        return this.authenticatedPlayer != null && !this.gameState.readyHouses.includes(this.authenticatedPlayer.house);
    }

    render(): ReactNode {
        return <>
            <Col xs={12} className="text-center">
                Each house may choose to score their Special Objective card if the criterion described is fulfilled.
            </Col>
            {this.authenticatedPlayer && this.mustChoose && <Col xs={12}>
                <Row className="justify-content-center">
                    <Col xs="auto">
                        <Button onClick={() => this.choose(true)}>Score</Button>
                    </Col>
                    <Col xs="auto">
                        <Button onClick={() => this.choose(false)}>Don&apos;t score</Button>
                    </Col>
                </Row>
            </Col>}
            <Col xs={12} className="text-center">
                Waiting for {this.gameState.notReadyHouses.map(h => h.name).join(", ")}
            </Col>
        </>;
    }

    choose(score: boolean): void {
        this.gameState.sendDecision(score);
    }
}
