import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import renderChildGameState from "../utils/renderChildGameState";
import TakeControlOfEnemyPortGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";

@observer
export default class TakeControlOfEnemyPortComponent extends Component<GameStateComponentProps<TakeControlOfEnemyPortGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <p>House <b>{this.props.gameState.newController.name}</b> has to choose the amount of ships to convert in <b>{this.props.gameState.port.name}</b>.</p>
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
