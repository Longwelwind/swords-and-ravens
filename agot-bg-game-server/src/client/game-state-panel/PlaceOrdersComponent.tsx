import {Component, ReactNode, ReactElement} from "react";
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
import PlaceOrdersGameState from "../../common/ingame-game-state/planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import Player from "../../common/ingame-game-state/Player";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { observable } from "mobx";
import { OverlayTrigger, Popover } from "react-bootstrap";
import BetterMap from "../../utils/BetterMap";


@observer
export default class PlaceOrdersComponent extends Component<GameStateComponentProps<PlaceOrdersGameState>> {
    modifyRegionsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

    @observable overlayTriggers = new BetterMap<Region, OverlayTrigger>();

    get player(): Player {
        if (!this.props.gameClient.authenticatedPlayer) {
            throw new Error();
        }

        return this.props.gameClient.authenticatedPlayer;
    }

    get housesToPlaceOrdersFor(): House[] {
        return this.props.gameState.getHousesToPutOrdersForPlayer(this.player);
    }

    get forVassals(): boolean {
        return this.props.gameState.forVassals;
    }

    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row>
                        <Col xs={12}>
                            {!this.forVassals ? (
                                <>Players may now assign orders in each region where they possess at least one unit</>
                            ) : (
                                <>Players may now assign orders for their vassals</>
                            )}
                        </Col>
                        <Col xs={12}>
                        {this.props.gameClient.authenticatedPlayer && (
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button
                                            disabled={!this.props.gameState.canReady(this.props.gameClient.authenticatedPlayer).status}
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
            return _.flatMap(
                this.props.gameState.getHousesToPutOrdersForPlayer(this.props.gameClient.authenticatedPlayer).map(h => this.props.gameState.getPossibleRegionsForOrders(h).map(r => [
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
                                        <OrderGridComponent orders={this.props.gameState.getOrdersList(r.getController() as House)}
                                            selectedOrder={null}
                                            availableOrders={
                                                this.props.gameState.getAvailableOrders(r.getController() as House)
                                            }
                                            onOrderClick={o => {
                                                this.props.gameState.assignOrder(r, o);
                                                // @ts-ignore `hide` is not a public method of OverlayTrigger, but it does the job
                                                this.overlayTriggers.get(r).hide();
                                        }}/>
                                    </Popover>
                                }
                            >
                                {child}
                            </OverlayTrigger>
                        )
                    }
                ] as [Region, PartialRecursive<RegionOnMapProperties>]))
            );
        }

        return [];
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.authenticatedPlayer) {
            return _.flatMap(
                this.props.gameState.getHousesToPutOrdersForPlayer(this.props.gameClient.authenticatedPlayer).map(h => this.props.gameState.getPossibleRegionsForOrders(h).map(r => [
                    r,
                    {
                        highlight: {active: true},
                        onClick: () => this.onOrderClick(r)
                    }
                ] as [Region, PartialRecursive<OrderOnMapProperties>]))
            );
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
