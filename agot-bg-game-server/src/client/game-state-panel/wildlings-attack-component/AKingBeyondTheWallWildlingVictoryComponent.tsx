import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import AKingBeyondTheWallWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";
import { Col } from "react-bootstrap";

@observer
export default class AKingBeyondTheWallWildlingVictoryComponent extends Component<GameStateComponentProps<AKingBeyondTheWallWildlingVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">Houses decide between Fiefdoms and King&apos;s Court Influence track and move their token to the lowest position on that track.</Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
