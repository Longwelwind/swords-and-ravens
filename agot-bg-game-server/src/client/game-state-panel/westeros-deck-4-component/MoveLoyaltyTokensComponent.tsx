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
import MoveLoyaltyTokensGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/MoveLoyaltyTokensGameState";

@observer
export default class MoveLoyaltyTokensComponent extends Component<GameStateComponentProps<MoveLoyaltyTokensGameState>> {
    get gameState(): MoveLoyaltyTokensGameState {
        return this.props.gameState;
    }
    render(): ReactNode {
        return (
            <>
                {this.gameState.childGameState instanceof SelectRegionGameState && <Col className="text-center">
                    {this.gameState.regionFrom == null
                        ? <>House <b>{this.gameState.childGameState.house.name}</b> must choose a region with a loyalty token in it.</>
                        : this.gameState.regionFrom != null && this.gameState.regionTo == null
                        ? <>House <b>{this.gameState.childGameState.house.name}</b> must choose the target region for the loyalty token from <b>{this.gameState.regionFrom.name}</b>.</>
                        : <></>}
                </Col>}
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectRegionGameState, SelectRegionComponent]
                ])}
            </>
        );
    }
}
