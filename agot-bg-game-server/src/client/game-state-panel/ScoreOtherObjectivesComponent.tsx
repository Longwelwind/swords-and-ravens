import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import SelectObjectiveCardsGameState from "../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import React from "react";
import { Col } from "react-bootstrap";
import SelectObjectiveCardsComponent from "./SelectObjectiveCardsComponent";
import ScoreOtherObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/score-other-objectives-game-state/ScoreOtherObjectivesGameState";

@observer
export default class ScoreOtherObjectivesComponent extends Component<GameStateComponentProps<ScoreOtherObjectivesGameState>> {
    render(): ReactNode {
        return <>
            <Col xs={12} className="text-center">
                Each house may choose to score one Objective card of their choice from their objective hand if the criterion described is fulfilled.
            </Col>
            {renderChildGameState(this.props, [
                [SelectObjectiveCardsGameState, SelectObjectiveCardsComponent]
            ])}
        </>;
    }
}
