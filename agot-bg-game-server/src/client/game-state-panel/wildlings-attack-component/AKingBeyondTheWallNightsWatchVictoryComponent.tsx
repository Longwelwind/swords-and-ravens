import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import AKingBeyondTheWallNightsWatchVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/a-king-beyond-the-wall-nights-watch-victory-game-state/AKingBeyondTheWallNightsWatchVictoryGameState";

@observer
export default class AKingBeyondTheWallNightsWatchVictoryComponent extends Component<GameStateComponentProps<AKingBeyondTheWallNightsWatchVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
