import { Component, ReactNode } from "react";
import ActionGameState from "../../common/ingame-game-state/action-game-state/ActionGameState";
import ResolveMarchOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/ResolveMarchOrderGameState";
import * as React from "react";
import { observer } from "mobx-react";
import ResolveMarchOrderComponent from "./ResolveMarchOrderComponent";
import UseRavenGameState from "../../common/ingame-game-state/action-game-state/use-raven-game-state/UseRavenGameState";
import UseRavenGameStatePanelComponent from "./UseRavenGameStatePanelComponent";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import ResolveConsolidatePowerGameState
    from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/ResolveConsolidatePowerGameState";
import ResolveConsolidatePowerComponent from "./ResolveConsolidatePowerComponent";
import ResolveRaidOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/ResolveRaidOrderGameState";
import ResolveRaidOrderComponent from "./ResolveRaidOrderComponent";
import Row from "react-bootstrap/Row";
import ReconcileArmiesGameState from "../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";
import ReconcileArmiesComponent from "./ReconcileArmiesComponent";
import ScoreObjectivesGameState from "../../common/ingame-game-state/action-game-state/score-objectives-game-state/ScoreObjectivesGameState";
import ScoreObjectivesComponent from "./ScoreObjectivesComponent";
import PartialRecursive from "../../utils/PartialRecursive";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { OrderOnMapProperties } from "../MapControls";
import _ from "lodash";

@observer
export default class ActionComponent extends Component<GameStateComponentProps<ActionGameState>> {
    modifyOrdersOnMapCallback: any;

    render(): ReactNode {
        return (
            <Row>
                {renderChildGameState(this.props, [
                    [UseRavenGameState, UseRavenGameStatePanelComponent],
                    [ResolveMarchOrderGameState, ResolveMarchOrderComponent],
                    [ResolveConsolidatePowerGameState, ResolveConsolidatePowerComponent],
                    [ResolveRaidOrderGameState, ResolveRaidOrderComponent],
                    [ReconcileArmiesGameState, ReconcileArmiesComponent],
                    [ScoreObjectivesGameState, ScoreObjectivesComponent]
                ])}
            </Row>
        );
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        return this.props.gameState.ordersToBeRemoved.map(r => [
            r,
            {highlight: {active: true, color: "yellow"}}
        ]);
    }

    componentDidMount(): void {
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }
}
