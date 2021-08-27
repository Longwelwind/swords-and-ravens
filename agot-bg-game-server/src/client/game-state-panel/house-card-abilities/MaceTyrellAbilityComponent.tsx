import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import MaceTyrellAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/mace-tyrell-ability-game-state/MaceTyrellAbilityGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";

@observer
export default class MaceTyrellAbilityComponent extends Component<GameStateComponentProps<MaceTyrellAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Mace Tyrell: </b> House <b>{this.props.gameState.childGameState.house.name}</b> immediately kills a Footman of
                    house <b>{this.props.gameState.combatGameState.getEnemy(this.props.gameState.childGameState.house).name}</b>.
                </Col>
                {renderChildGameState(this.props, [
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
