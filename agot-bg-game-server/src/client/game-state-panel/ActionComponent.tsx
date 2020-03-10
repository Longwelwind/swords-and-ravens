import {Component, ReactNode} from "react";
import ActionGameState from "../../common/ingame-game-state/action-game-state/ActionGameState";
import ResolveMarchOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/ResolveMarchOrderGameState";
import * as React from "react";
import {observer} from "mobx-react";
import ResolveMarchOrderComponent from "./ResolveMarchOrderComponent";
import UseRavenGameState from "../../common/ingame-game-state/action-game-state/use-raven-game-state/UseRavenGameState";
import UseRavenGameStatePanelComponent from "./UseRavenGameStatePanelComponent";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import ResolveConsolidatePowerGameState
    from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/ResolveConsolidatePowerGameState";
import ResolveConsolidatePowerComponent from "./ResolveConsolidatePowerComponent";
import ResolveRaidOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/ResolveRaidOrderGameState";
import ResolveRaidOrderComponent from "./ResolveRaidOrderComponent";
import Row from "react-bootstrap/Row";

@observer
export default class ActionComponent extends Component<GameStateComponentProps<ActionGameState>> {
    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row>
                        {renderChildGameState(this.props, [
                            [UseRavenGameState, UseRavenGameStatePanelComponent],
                            [ResolveMarchOrderGameState, ResolveMarchOrderComponent],
                            [ResolveConsolidatePowerGameState, ResolveConsolidatePowerComponent],
                            [ResolveRaidOrderGameState, ResolveRaidOrderComponent]
                        ])}
                    </Row>
                </ListGroupItem>
            </>
        );
    }
}
