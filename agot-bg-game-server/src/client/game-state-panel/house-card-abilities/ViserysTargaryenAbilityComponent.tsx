import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import QyburnAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/qyburn-ability-game-state/QyburnAbilityGameState";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";

@observer
export default class ViserysTargaryenAbilityComponent extends Component<GameStateComponentProps<QyburnAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    <b>Viserys Targaryen</b>: House <b>{this.props.gameState.childGameState.house.name}</b> may discard a house card
                    from their hand to add its printed combat strength to Viserys Targaryens&apos;s combat strength.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectHouseCardGameState, SelectHouseCardComponent]
                ])}
            </>
        );
    }
}
