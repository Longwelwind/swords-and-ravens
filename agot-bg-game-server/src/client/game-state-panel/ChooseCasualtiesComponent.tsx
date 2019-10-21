import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import ChooseCasualtiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/choose-casualties-game-state/ChooseCasualtiesGameState";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Col from "react-bootstrap/Col";
import renderChildGameState from "../utils/renderChildGameState";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "./SelectUnitsComponent";

@observer
export default class ChooseCasualtiesComponent extends Component<GameStateComponentProps<ChooseCasualtiesGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    The loser must choose {this.props.gameState.childGameState.count} of their units as casualties of the fight.
                </Col>
                {renderChildGameState(this.props, [
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
