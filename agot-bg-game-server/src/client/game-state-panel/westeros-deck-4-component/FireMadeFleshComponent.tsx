import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import FireMadeFleshGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/fire-made-flesh-game-state/FireMadeFleshGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectUnitsGameState from "../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "../SelectUnitsComponent";
import { Col } from "react-bootstrap";

@observer
export default class FireMadeFleshComponent extends Component<GameStateComponentProps<FireMadeFleshGameState>> {
    render(): ReactNode {
        return (
            <>
                {this.props.gameState.childGameState instanceof SelectUnitsGameState && <Col className="text-center">
                    House <b>{this.props.gameState.childGameState.house.name}</b> must select a dragon to destroy.
                </Col>}
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
