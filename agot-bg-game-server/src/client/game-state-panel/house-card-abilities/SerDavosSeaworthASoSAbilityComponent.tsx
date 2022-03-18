import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SerDavosSeaworthASoSAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/ser-davos-seaworth-asos-game-state/SerDavosSeaworthASoSAbilityGameState";

@observer
export default class SerDavosSeaworthASoSAbilityComponent extends Component<GameStateComponentProps<SerDavosSeaworthASoSAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Ser Davos Seaworth</b>: House <b>{this.props.gameState.childGameState.house.name}</b> may discard <b>
                        2</b> of their available Power tokens to gain <b>1</b> Fortification Icon.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
