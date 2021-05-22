import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import MelisandreAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/melisandre-ability-game-state/MelisandreAbilityGameState";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class MelisandreAbilityComponent extends Component<GameStateComponentProps<MelisandreAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    <b>Melisandre</b>: {this.props.gameState.childGameState.house.name} may return any House card from discard pile (including this card) by discarding a number of available Power tokens equal to the printed combat strength of that card.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectHouseCardGameState, SelectHouseCardComponent]
                ])}
            </>
        );
    }
}
