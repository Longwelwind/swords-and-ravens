import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import MammothRidersNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/mammoth-riders-nights-watch-victory-game-state/MammothRidersNightsWatchVictoryGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import { Col } from "react-bootstrap";

@observer
export default class MammothRidersNightsWatchVictoryComponent extends Component<GameStateComponentProps<MammothRidersNightsWatchVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">The highest bidder may retrieve one House card of their choice from their House card discard pile.</Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectHouseCardGameState, SelectHouseCardComponent],
                ])}
            </>
        );
    }
}
