import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import JonSnowBaratheonAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/jon-snow-baratheon-ability-game-state/JonSnowBaratheonAbilityGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class JonSnowBaratheonAbilityComponent extends Component<GameStateComponentProps<JonSnowBaratheonAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Jon Snow:</b> House <b>{this.props.gameState.childGameState.house.name}</b> may decrease or increase the Wildling track by one space (to a minimum of 0 and a maximum of 10).
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                ])}
            </>
        );
    }
}
