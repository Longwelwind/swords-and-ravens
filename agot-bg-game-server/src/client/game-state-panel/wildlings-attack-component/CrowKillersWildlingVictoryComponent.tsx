import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import CrowKillersWildlingVictoryGameState, { CrowKillersStep }
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import Col from "react-bootstrap/Col";
import React from "react";

@observer
export default class CrowKillersWildlingVictoryComponent extends Component<GameStateComponentProps<CrowKillersWildlingVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                {this.props.gameState.step == CrowKillersStep.DEGRADING_KNIGHTS ?
                    <Col xs={12}>
                        <b>{this.props.gameState.childGameState.house.name}</b> replaces {this.props.gameState.childGameState.count} of their Knights with
                        available Footmen.
                    </Col> : this.props.gameState.step == CrowKillersStep.DESTROYING_KNIGHTS ?
                    <Col xs={12}>
                        <b>{this.props.gameState.childGameState.house.name}</b> has to destroy {this.props.gameState.childGameState.count} of their Knights before
                        the rest can be replaced with Footmen.
                    </Col> : <Col xs={12}>Invalid CrowKillersStep!</Col>}
                {renderChildGameState(this.props, [
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
