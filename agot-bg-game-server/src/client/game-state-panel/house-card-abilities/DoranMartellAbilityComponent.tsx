import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import DoranMartellAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/doran-martell-ability-game-state/DoranMartellAbilityGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class DoranMartellAbilityComponent extends Component<GameStateComponentProps<DoranMartellAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    <b>Doran Martell: </b> Martell must move the enemy to the bottom of one influence track of its
                    choice.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
