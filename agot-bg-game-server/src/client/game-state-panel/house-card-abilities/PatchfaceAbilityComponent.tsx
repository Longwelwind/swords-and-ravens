import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import PatchfaceAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/patchface-ability-game-state/PatchfaceAbilityGameState";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class PatchfaceAbilityComponent extends Component<GameStateComponentProps<PatchfaceAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    <b>Patchface</b>: {this.props.gameState.childGameState.house.name} must choose one house card of the opponent to discard.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectHouseCardGameState, SelectHouseCardComponent]
                ])}
            </>
        );
    }
}
