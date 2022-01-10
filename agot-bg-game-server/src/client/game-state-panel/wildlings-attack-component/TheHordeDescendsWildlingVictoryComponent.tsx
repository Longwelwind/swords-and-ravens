import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import TheHordeDescendsWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/the-horde-descends-wildling-victory-game-state/TheHordeDescendsWildlingVictoryGameState";
import React from "react";
import { Col } from "react-bootstrap";

@observer
export default class TheHordeDescendsWildlingVictoryComponent extends Component<GameStateComponentProps<TheHordeDescendsWildlingVictoryGameState>> {
    render(): ReactNode {
        return <>
            <Col xs={12} className="text-center">Houses must destroy units.</Col>
            {renderChildGameState(this.props, [
                [SelectUnitsGameState, SelectUnitsComponent],
            ])}
        </>;
    }
}
