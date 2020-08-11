import {Component, ReactNode, ReactElement} from "react";
import PlanningGameState from "../../common/ingame-game-state/planning-game-state/PlanningGameState";
import orders from "../../common/ingame-game-state/game-data-structure/orders";
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
import Player from "../../common/ingame-game-state/Player";
import { OverlayTrigger, Popover } from "react-bootstrap";
import { observable } from "mobx";
import BetterMap from "../../utils/BetterMap";

@observer
export default class PlanningComponent extends Component<GameStateComponentProps<PlanningGameState>> {
    modifyRegionsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

    @observable overlayTriggers = new BetterMap<Region, OverlayTrigger>();

    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row>
                        <Col xs={12}>
                            Assign an order to each region in which one of your unit is present.
                        </Col>
                        <Col xs={12}>
                            {this.props.gameClient.authenticatedPlayer && (
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button
                                            disabled={!this.props.gameState.canReady(this.props.gameClient.authenticatedPlayer.house).status}
                                            onClick={() => this.onReadyClick()}
                                        >
                                            Ready
                                        </Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button
                                            disabled={!this.props.gameState.canUnready(this.props.gameClient.authenticatedPlayer).status}
                                            onClick={() => this.onUnreadyClick()}
                                        >
                                            Unready
                                        </Button>
                                    </Col>
                                </Row>
                            )}
                            <Row>
                                <div className="text-center" style={{marginTop: 10}}>
                                    Waiting for {this.props.gameState.getNotReadyPlayers().map(p => p.house.name).join(', ')}...
                                </div>
                            </Row>
                        </Col>
                    </Row>
                </ListGroupItem>
            </>
        );
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
            return this.props.gameState.getPossibleRegionsForOrders(this.props.gameClient.authenticatedPlayer.house).map(r => ([
                r,
                {
                    // Highlight areas with no order
                    highlight: {active: !this.props.gameState.placedOrders.has(r)},
                    wrap: (child: ReactElement) => (
                        <OverlayTrigger
                            placement="auto"
                            trigger="click"
                            ref={(ref: OverlayTrigger) => {this.overlayTriggers.set(r, ref)}}
                            rootClose
                            overlay={
                                <Popover id={"region" + r.id}>
                                    <p className="text-strong text-center">{r.name}</p>
                                    <OrderGridComponent orders={orders.values}
                                        selectedOrder={null}
                                        availableOrders={
                                            this.props.gameState.getAvailableOrders((this.props.gameClient.authenticatedPlayer as Player).house)
                                        }
                                        onOrderClick={o => {
                                            this.props.gameState.assignOrder(r, o);
                                            // @ts-ignore `hide` is not a public method of OverlayTrigger, but it does the job
                                            this.overlayTriggers.get(r).hide();
                                        }}
                                    />
                                </Popover>
                            }
                        >
                            {child}
                        </OverlayTrigger>
                    )
                }
            ]));
        }

        return [];
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.authenticatedPlayer) {
            return this.props.gameState.getPossibleRegionsForOrders(this.props.gameClient.authenticatedPlayer.house).map(r => ([
                r,
                {
                    highlight: {active: true},
                    onClick: () => this.onOrderClick(r)
                }
            ]));
        }

        return [];
    }

    onOrderClick(region: Region): void {
        if (!this.props.gameClient.authenticatedPlayer) {
            return;
        }

        this.props.gameState.assignOrder(region, null);
    }

    onReadyClick(): void {
        this.props.gameState.ready();
    }

    onUnreadyClick(): void {
        this.props.gameState.unready();
    }
}
