import { Component, ReactNode } from "react";
import React from "react";
import { observer } from "mobx-react";
import Col from "react-bootstrap/Col";
import GameStateComponentProps from "./GameStateComponentProps";
import House from "../../common/ingame-game-state/game-data-structure/House";
import renderChildGameState from "../utils/renderChildGameState";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectRegionComponent from "./SelectRegionComponent";
import LoyalMaesterGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/loyal-maester-game-state/LoyalMaesterGameState";


@observer
export default class LoyalMaesterComponent extends Component<GameStateComponentProps<LoyalMaesterGameState>> {
    get house(): House {
        return this.props.gameState.childGameState.house;
    }

    render(): ReactNode {
        return (
            this.props.gameClient.doesControlHouse(this.house) ? (
                <>
                    <Col xs={12} className="text-center">
                        Select a region to place a Barrel.
                    </Col>
                    {renderChildGameState(this.props, [
                        [SelectRegionGameState, SelectRegionComponent]
                    ])}
            </>
            ) : (
                <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
            )
        );
    }
}
