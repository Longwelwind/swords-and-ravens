import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import ResolveSingleRaidOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/resolve-single-raid-order-game-state/ResolveSingleRaidOrderGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import React from "react";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Button from "react-bootstrap/Button";
import * as _ from "lodash";
import RaidOrderType from "../../common/ingame-game-state/game-data-structure/order-types/RaidOrderType";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import {OrderOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";

@observer
export default class ResolveSingleRaidOrderComponent extends Component<GameStateComponentProps<ResolveSingleRaidOrderGameState>> {
    @observable selectedOrderRegion: Region | null;
    @observable orderInOrderRegion: RaidOrderType | null;
    @observable selectedTargetRegion: Region | null;

    modifyOrdersOnMapCallback: any;

    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    House <b>{this.props.gameState.house.name}</b> must resolve one of its Raid Orders.
                </Col>
                {this.props.gameClient.authenticatedPlayer && this.props.gameState.house == this.props.gameClient.authenticatedPlayer.house ? (
                    this.selectedOrderRegion == null ? (
                        <Col xs={12} className="text-center">
                            Select a Raid Order token to resolve it.
                        </Col>
                    ) : (
                        <>
                            <Col xs={12} className="text-center">
                                {this.selectedTargetRegion == null ? (
                                    <>Select a target region to raid, or click on <strong>Confirm</strong> to just remove the order.</>
                                ) : (
                                    <>Target: {this.selectedTargetRegion.name}</>
                                )}
                            </Col>
                            <Col xs={12}>
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button onClick={() => this.confirm()}>Confirm</Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button onClick={() => this.reset()}>Reset</Button>
                                    </Col>
                                </Row>
                            </Col>
                        </>
                    )
                ) : (
                    <Col xs={12} className="text-center">
                        Waiting for {this.props.gameState.house.name}...
                    </Col>
                )}
            </>
        );
    }

    confirm(): void {
        if (this.selectedOrderRegion) {
            if (!this.selectedTargetRegion) {
                if (!window.confirm('Do you want to remove your Raid Order?')) {
                    return;
                }
            }

            this.props.gameState.resolveRaid(this.selectedOrderRegion, this.selectedTargetRegion);
            this.reset();
        }
    }

    reset(): void {
        this.selectedOrderRegion = null;
        this.orderInOrderRegion = null;
        this.selectedTargetRegion = null;
    }

    onOrderClick(r: Region): void {
        if (this.props.gameClient.authenticatedPlayer && this.props.gameState.house == this.props.gameClient.authenticatedPlayer.house) {
            if (this.selectedOrderRegion == null || this.orderInOrderRegion == null) {
                const order = this.props.gameState.actionGameState.ordersOnBoard.tryGet(r, null);
                if (!order) {
                    return;
                }

                if (!(order.type instanceof RaidOrderType)) {
                    return;
                }

                this.selectedOrderRegion = r;
                this.orderInOrderRegion = order.type;
            } else {
                this.selectedTargetRegion = r;
            }
        }
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.selectedOrderRegion == null || this.orderInOrderRegion == null) {
                // Highlight the Raid orders of the house
                return this.props.gameState.getRegionWithRaidOrders().map(r => [
                    r,
                    {highlight: {active: true}, onClick: () => this.onOrderClick(r)}
                ])
            } else {
                // Highlight the possible raidable orders from the select Raid order
                return this.props.gameState.getRaidableRegions(this.selectedOrderRegion, this.orderInOrderRegion).map(r => [
                    r,
                    {highlight: {active: true}, onClick: () => this.onOrderClick(r)}
                ])
            }
        }

        return [];
    }

    componentDidMount(): void {
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }
}
