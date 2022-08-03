import { Component, ReactNode } from "react";
import React from "react";
import { observer } from "mobx-react";
import Col from "react-bootstrap/Col";
import GameStateComponentProps from "./GameStateComponentProps";
import House from "../../common/ingame-game-state/game-data-structure/House";
import renderChildGameState from "../utils/renderChildGameState";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import SpymasterGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/spymaster-game-state/SpymasterGameState";
import ResolveSpymasterGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/spymaster-game-state/resolve-spymaster-game-state/ResolveSpymasterGameState";
import ResolveSpymasterComponent from "./ResolveSpymasterComponent";


@observer
export default class SpymasterComponent extends Component<GameStateComponentProps<SpymasterGameState>> {
    get house(): House {
        return this.props.gameState.childGameState.house;
    }

    render(): ReactNode {
        return (
            this.props.gameClient.doesControlHouse(this.house) ? (
                <>
                    {renderChildGameState(this.props, [
                        [SimpleChoiceGameState, SimpleChoiceComponent],
                        [ResolveSpymasterGameState, ResolveSpymasterComponent],
                    ])}
            </>
            ) : (
                <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
            )
        );
    }
}
