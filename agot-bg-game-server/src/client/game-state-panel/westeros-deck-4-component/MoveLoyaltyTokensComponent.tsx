import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import MoveLoyaltyTokensGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/MoveLoyaltyTokensGameState";
import ResolveMoveLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/resolve-move-loyalty-token-game-state/ResolveMoveLoyaltyTokenGameState";
import ResolveMoveLoyaltyTokenComponent from "./ResolveMoveLoyaltyTokenComponent";

@observer
export default class MoveLoyaltyTokensComponent extends Component<GameStateComponentProps<MoveLoyaltyTokensGameState>> {
    get gameState(): MoveLoyaltyTokensGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [ResolveMoveLoyaltyTokenGameState, ResolveMoveLoyaltyTokenComponent]
                ])}
            </>
        );
    }
}
