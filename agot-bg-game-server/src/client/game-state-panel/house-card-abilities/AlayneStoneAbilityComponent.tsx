import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import AlayneStoneAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/alayne-stone-ability-game-state/AlayneStoneAbilityGameState";

@observer
export default class AlayneStoneAbilityComponent extends Component<GameStateComponentProps<AlayneStoneAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    <b>Alayne Stone</b>: <b>{this.props.gameState.childGameState.house.name}</b> may discard 2 Power tokens to force their opponent to discard all their available power tokens.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                ])}
            </>
        );
    }
}
