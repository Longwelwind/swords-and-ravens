import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import ResolveRetreatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/resolve-retreat-game-state/ResolveRetreatGameState";
import SelectRegionComponent from "./SelectRegionComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "./SelectUnitsComponent";
import Col from "react-bootstrap/Col";

@observer
export default class ResolveRetreatComponent extends Component<GameStateComponentProps<ResolveRetreatGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameState.childGameState instanceof SelectRegionGameState && (
                        <>
                            {this.props.gameState.childGameState.house.name} must choose the retreat location
                            of the defeated army.
                        </>
                    )}
                </Col>
                {renderChildGameState(this.props, [
                    [SelectRegionGameState, SelectRegionComponent],
                    [SelectUnitsGameState, SelectUnitsComponent]
                ])}
            </>
        );
    }
}
