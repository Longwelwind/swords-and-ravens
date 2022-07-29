import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import renderChildGameState from "../utils/renderChildGameState";
import CallForSupportAgainstNeutralForceGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/call-for-support-against-neutral-force-game-state/CallForSupportAgainstNeutralForceGameState";

@observer
export default class CallForSupportAgainstNeutralForcesComponent extends Component<GameStateComponentProps<CallForSupportAgainstNeutralForceGameState>> {
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <p>House <b>{this.props.gameState.houseThatResolvesMarchOrder.name}</b> calls for support against neutral forces.</p>
                </Col>
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent]
                ])}
            </>
        );
    }
}
