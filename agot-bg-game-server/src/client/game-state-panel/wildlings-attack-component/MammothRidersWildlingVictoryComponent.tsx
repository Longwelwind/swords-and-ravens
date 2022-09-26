import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import React from "react";
import MammothRidersWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/mammoth-riders-wildling-victory-game-state/MammothRidersWildlingVictoryGameState";
import { Col } from "react-bootstrap";
import TakeControlOfEnemyPortGameState from "../../../common/ingame-game-state/take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";
import TakeControlOfEnemyPortComponent from "../TakeControlOfEnemyPortComponent";

@observer
export default class MammothRidersWildlingVictoryComponent extends Component<GameStateComponentProps<MammothRidersWildlingVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                {this.props.gameState.childGameState instanceof SelectUnitsGameState && <Col xs={12} className="text-center">Houses must destroy units.</Col>}
                {renderChildGameState(this.props, [
                    [SelectUnitsGameState, SelectUnitsComponent],
                    [TakeControlOfEnemyPortGameState, TakeControlOfEnemyPortComponent]
                ])}
            </>
        );
    }
}
