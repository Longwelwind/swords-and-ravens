import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import MassingOnTheMilkwaterWildlingVictoryGameState
    from "../../../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import { Col } from "react-bootstrap";

@observer
export default class MassingOnTheMilkwaterWildlingVictoryComponent extends Component<GameStateComponentProps<MassingOnTheMilkwaterWildlingVictoryGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">Houses choose their house cards to discard.</Col>
                {renderChildGameState(this.props, [
                    [SelectHouseCardGameState, SelectHouseCardComponent]
                ])}
            </>
        );
    }
}
