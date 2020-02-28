import {Component, ReactNode} from "react";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import orders from "../../common/ingame-game-state/game-data-structure/orders";
import {observable} from "mobx";
import {observer} from "mobx-react";
import Order from "../../common/ingame-game-state/game-data-structure/Order";
import React from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OrderGridComponent from "./utils/OrderGridComponent";
import {OrderOnMapProperties, RegionOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";

@observer
export default class PlanningComponent extends Component<GameStateComponentProps<PlanningGameState>> {
    @observable selectedOrder: Order | null;
    modifyRegionsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row>
                        <Col xs={12}>
                            Assign an order to each region in which one of your unit is present.
                        </Col>
                        {this.props.gameClient.authenticatedPlayer && (
                            <Col xs={12}>
                                <OrderGridComponent orders={orders.values}
                                                    selectedOrder={this.selectedOrder}
                                                    availableOrders={
                                                        this.props.gameState.getAvailableOrders(this.props.gameClient.authenticatedPlayer.house)
                                                    }
                                                    onOrderClick={o => this.selectOrder(o)}/>
                            </Col>
                        )}
                        <Col xs={12}>
                            {this.props.gameClient.authenticatedPlayer && !this.props.gameState.readyPlayers.includes(this.props.gameClient.authenticatedPlayer) ? (
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button
                                            disabled={this.props.gameState.isReady(this.props.gameClient.authenticatedPlayer)
                                                || !this.props.gameState.canReady(this.props.gameClient.authenticatedPlayer.house).status}
                                            onClick={() => this.onReadyClick()}
                                        >
                                            Ready
                                        </Button>
                                    </Col>
                                </Row>
                            ) : (
                                <div className="text-center">
                                    Waiting for {this.props.gameState.getNotReadyPlayers().map(p => p.house.name).join(', ')}...
                                </div>
                            )}
                        </Col>
                    </Row>
                </ListGroupItem>
            </>
        );
    }

    selectOrder(order: Order): void {
        if (this.selectedOrder == order) {
            this.selectedOrder = null;
        } else {
            this.selectedOrder = order;
        }
    }

    isOrderAvailable(order: Order): boolean {
        if (!this.props.gameClient.authenticatedPlayer) {
            return false;
        }
        return this.props.gameState.isOrderAvailable(this.props.gameClient.authenticatedPlayer.house, order);
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        if (this.props.gameClient.authenticatedPlayer) {
            if (this.selectedOrder != null) {
                return this.props.gameState.getPossibleRegionsForOrders(this.props.gameClient.authenticatedPlayer.house).map(r => ([
                    r,
                    {
                        highlight: {active: true},
                        onClick: () => this.onRegionClick(r)
                    }
                ]));
            }
        }

        return [];
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.authenticatedPlayer) {
            return this.props.gameState.getPossibleRegionsForOrders(this.props.gameClient.authenticatedPlayer.house).map(r => ([
                r,
                {
                    onClick: () => this.onOrderClick(r)
                }
            ]));
        }

        return [];
    }

    onRegionClick(region: Region): void {
        if (!this.props.gameClient.authenticatedPlayer) {
            return;
        }

        this.props.gameState.assignOrder(region, this.selectedOrder);
        this.selectedOrder = null;
    }

    onOrderClick(region: Region): void {
        if (!this.props.gameClient.authenticatedPlayer) {
            return;
        }

        if (this.selectedOrder != null) {
            this.props.gameState.assignOrder(region, this.selectedOrder);
            this.selectedOrder = null;
        } else {
            this.props.gameState.assignOrder(region, null);
        }
    }

    onReadyClick(): void {
        this.props.gameState.ready();
    }
}
