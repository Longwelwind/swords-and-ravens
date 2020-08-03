import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import QueenOfThornsAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/queen-of-thorns-ability-game-state/QueenOfThornsAbilityGameState";
import renderChildGameState from "../../utils/renderChildGameState";
import SelectOrdersGameState from "../../../common/ingame-game-state/select-orders-game-state/SelectOrdersGameState";
import SelectOrdersComponent from "../SelectOrdersComponent";
import React from "react";
import Col from "react-bootstrap/Col";

@observer
export default class QueenOfThornsAbilityComponent extends Component<GameStateComponentProps<QueenOfThornsAbilityGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    <b>Queen of Thorns: </b> Tyrell must remove one enemy order adjacent to the embattled
                    area.
                </Col>
                {renderChildGameState(this.props, [
                    [SelectOrdersGameState, SelectOrdersComponent]
                ])}
            </>
        );
    }
}
