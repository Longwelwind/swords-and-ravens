import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import AKingBeyondTheWallWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildling-attack-game-state/a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";

@observer
export default class AKingBeyondTheWallWildlingVictoryComponent extends Component<GameStateComponentProps<AKingBeyondTheWallWildlingVictoryGameState>> {
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
