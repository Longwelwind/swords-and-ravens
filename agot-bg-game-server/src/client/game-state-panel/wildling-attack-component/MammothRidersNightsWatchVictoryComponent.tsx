import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import MammothRidersNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/mammoth-riders-nights-watch-victory-game-state/MammothRidersNightsWatchVictoryGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";

@observer
export default class MammothRidersNightsWatchVictoryComponent extends Component<GameStateComponentProps<MammothRidersNightsWatchVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectHouseCardGameState, SelectHouseCardComponent],
                ])}
            </>
        );
    }
}
