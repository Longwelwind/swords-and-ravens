import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import RobertArrynAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/robert-arryn-ability-game-state/RobertArrynAbilityGameState";

@observer
export default class RobertArrynAbilityComponent extends Component<GameStateComponentProps<RobertArrynAbilityGameState>> {
    render(): ReactNode {
        const possibleHouseCardToRemove = this.props.gameState.enemyHouseCardToRemove;
        return (
            <>
                <Col xs={12}>
                    <b>Robert Arryn</b>: {this.props.gameState.childGameState.house.name} may
                    remove <b>Robert Arryn</b> {possibleHouseCardToRemove && <>and <b>{possibleHouseCardToRemove.name}</b> </>}from the game.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
