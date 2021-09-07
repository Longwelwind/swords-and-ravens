import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import { Col } from "react-bootstrap";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectRegionGameState from "../../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectRegionComponent from "../SelectRegionComponent";
import TheLongPlanGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/the-long-plan-game-state/TheLongPlanGameState";

@observer
export default class TheLongPlanComponent extends Component<GameStateComponentProps<TheLongPlanGameState>> {
    render(): ReactNode {
        return (
            <>
                {this.props.gameState.childGameState instanceof SelectRegionGameState && <Col className="text-center">
                    House <b>{this.props.gameState.childGameState.house.name}</b> must choose a region to place a loyalty token.
                </Col>}
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectRegionGameState, SelectRegionComponent]
                ])}
            </>
        );
    }
}
