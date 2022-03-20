import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import SerIlynPayneASoSAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/ser-ilyn-payne-asos-ability-game-state/SerIlynPayneASoSAbilityGameState";

@observer
export default class SerIlynPayneASoSAbilityComponent extends Component<GameStateComponentProps<SerIlynPayneASoSAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Ser Ilyn Payne</b>: House <b>{this.props.gameState.combatGameState.getEnemy(this.props.gameState.house).name}</b> must lose one casualty.
                </Col>
                {renderChildGameState(this.props, [
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
