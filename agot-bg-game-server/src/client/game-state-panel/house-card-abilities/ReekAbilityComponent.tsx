import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import ReekAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/reek-ability-game-state/ReekAbilityGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class ReekAbilityComponent extends Component<GameStateComponentProps<ReekAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Reek</b>: House <b>{this.props.gameState.childGameState.house.name}</b> may return Reek to their hand.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                ])}
            </>
        );
    }
}
