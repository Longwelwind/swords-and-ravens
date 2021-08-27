import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import CerseiLannisterAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/cersei-lannister-ability-game-state/CerseiLannisterAbilityGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectOrdersComponent from "../SelectOrdersComponent";
import SelectOrdersGameState from "../../../common/ingame-game-state/select-orders-game-state/SelectOrdersGameState";

@observer
export default class CerseiLannisterAbilityComponent extends Component<GameStateComponentProps<CerseiLannisterAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Cersei Lannister:</b> House <b>{this.props.gameState.childGameState.house.name}</b> can choose to remove one order of
                    house <b>{this.props.gameState.combatGameState.getEnemy(this.props.gameState.childGameState.house).name}</b>.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectOrdersGameState, SelectOrdersComponent]
                ])}
            </>
        );
    }
}
