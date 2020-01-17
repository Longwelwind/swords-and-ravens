import {observer} from "mobx-react";
import {Component} from "react";
import ReplaceOrderGameState
    from "../../common/ingame-game-state/action-game-state/use-raven-game-state/replace-order-game-state/ReplaceOrderGameState";
import React from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import {observable} from "mobx";
import Order from "../../common/ingame-game-state/game-data-structure/Order";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OrderGridComponent from "./utils/OrderGridComponent";
import orders from "../../common/ingame-game-state/game-data-structure/orders";

@observer
export default class ReplaceOrderComponent extends Component<GameStateComponentProps<ReplaceOrderGameState>> {
    @observable selectedRegion: Region | null;
    @observable selectedOrder: Order | null;

    orderClickListener: any;

    render() {
        return (
            <>
                <Col xs={12}>
                    The holder of the Raven token may now choose to replace one of its order.
                </Col>
                {this.props.gameClient.doesControlHouse(this.props.gameState.ravenHolder) ? (
                    <>
                        {this.selectedRegion == null ? (
                            <Col xs={12}>Click on the order you want to replace on the map</Col>
                        ) : (
                            <Col xs={12}>
                                Choose which order to place on {this.selectedRegion.name}:
                                <OrderGridComponent orders={orders.values}
                                                    selectedOrder={this.selectedOrder}
                                                    availableOrders={this.props.gameState.getAvailableOrders(this.props.gameState.actionGameState.ordersOnBoard.get(this.selectedRegion))}
                                                    onOrderClick={o => this.selectOrder(o)}/>
                            </Col>
                        )}
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                {this.selectedOrder != null && this.selectedRegion != null && (
                                    <Col xs="auto">
                                        <Button onClick={() => this.replaceOrder()}>Confirm</Button>
                                    </Col>
                                )}
                                <Col xs="auto">
                                    <Button onClick={() => this.skip()}>Skip</Button>
                                </Col>
                            </Row>
                        </Col>
                    </>
                ) : (
                    <Col xs={12}>
                        Waiting for {this.props.gameState.ravenHolder.name}...
                    </Col>
                )}
            </>
        );
    }

    onOrderClick(region: Region, order: Order) {
        if (region.getController() == this.props.gameState.ravenHolder) {
            if (this.selectedRegion == region) {
                this.selectedRegion = null;
            } else {
                this.selectedRegion = region;
            }
            this.selectedOrder = null;
        }
    }

    selectOrder(order: Order): void {
        if (this.selectedOrder == order) {
            this.selectedOrder = null;
        } else {
            this.selectedOrder = order;
        }
    }

    replaceOrder() {
        if (this.selectedRegion && this.selectedOrder) {
            this.props.gameState.replaceOrder(this.selectedRegion, this.selectedOrder);
        }
    }

    componentDidMount(): void {
        this.props.mapControls.onOrderClick.push(this.orderClickListener = (r: Region, o: Order) => this.onOrderClick(r, o));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onOrderClick, this.orderClickListener);
    }

    private skip() {
        this.props.gameState.skip();
    }
}
