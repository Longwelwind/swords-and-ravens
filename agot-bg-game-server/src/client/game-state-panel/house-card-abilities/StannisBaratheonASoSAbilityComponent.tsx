import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import StannisBaratheonASoSAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/stannis-baratheon-asos-ability-game-state/StannisBaratheonASoSAbilityGameState";

@observer
export default class StannisBaratheonASoSAbilityComponent extends Component<GameStateComponentProps<StannisBaratheonASoSAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>Stannis Baratheon</b>: House <b>{this.props.gameState.childGameState.house.name}</b> may choose to steal the Iron Throne dominance token and to gain a Sword Icon.
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
