import { Component, ReactNode } from "react";
import React from "react";
import { observer } from "mobx-react";
import Col from "react-bootstrap/Col";
import GameStateComponentProps from "./GameStateComponentProps";
import House from "../../common/ingame-game-state/game-data-structure/House";
import PyromancerGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/pyromancer-game-state/PyromancerGameState";
import renderChildGameState from "../utils/renderChildGameState";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import SelectRegionComponent from "./SelectRegionComponent";


@observer
export default class PyromancerComponent extends Component<GameStateComponentProps<PyromancerGameState>> {
    get house(): House {
        return this.props.gameState.childGameState.house;
    }

    get selectRegion(): SelectRegionGameState<PyromancerGameState> | null {
        return this.props.gameState.childGameState instanceof SelectRegionGameState ? this.props.gameState.childGameState : null;
    }

    render(): ReactNode {
        return (
            this.props.gameClient.doesControlHouse(this.house) ? (
                <>
                    {this.selectRegion && (
                        <Col xs={12} className="text-center">
                            Select the castle to degrade.
                        </Col>
                    )}
                    {renderChildGameState(this.props, [
                        [SimpleChoiceGameState, SimpleChoiceComponent],
                        [SelectRegionGameState, SelectRegionComponent]
                    ])}
            </>
            ) : (
                <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
            )
        );
    }
}
