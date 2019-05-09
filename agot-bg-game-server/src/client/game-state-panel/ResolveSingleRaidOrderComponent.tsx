import {observer} from "mobx-react";
import {Component} from "react";
import ResolveSingleRaidOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/resolve-single-raid-order-game-state/ResolveSingleRaidOrderGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import React from "react";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Button from "react-bootstrap/Button";
import * as _ from "lodash";
import RaidOrderType from "../../common/ingame-game-state/game-data-structure/order-types/RaidOrderType";
import Order from "../../common/ingame-game-state/game-data-structure/Order";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

@observer
export default class ResolveSingleRaidOrderComponent extends Component<GameStateComponentProps<ResolveSingleRaidOrderGameState>> {
    @observable selectedOrderRegion: Region | null;
    @observable orderInOrderRegion: RaidOrderType | null;
    @observable selectedTargetRegion: Region | null;

    orderClickListener: any;
    shouldHighlightOrderListener: any;
    shouldHighlightRegionListener: any;

    render() {
        return (
            <>
                <p>
                    A raid order may be resolved by {this.props.gameState.house.name}.
                </p>
                <p>
                    {this.props.gameClient.authenticatedPlayer && this.props.gameState.house == this.props.gameClient.authenticatedPlayer.house ? (
                        <div className="text-center">
                            {this.selectedOrderRegion == null ? (
                                <>Select a raid order token to resolve it</>
                            ) : (
                                <>
                                    {this.selectedTargetRegion == null ? (
                                        <>Select a target region to raid</>
                                    ) : (
                                        <>Target: {this.selectedTargetRegion.name}</>
                                    )}

                                    <Row className="justify-content-center">
                                        <Col xs="auto">
                                            <Button onClick={() => this.confirm()}>Confirm</Button>
                                        </Col>
                                        <Col xs="auto">
                                            <Button onClick={() => this.reset()}>Reset</Button>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name}...
                        </div>
                    )}
                </p>
            </>
        );
    }

    confirm() {
        if (this.selectedOrderRegion) {
            this.props.gameState.resolveRaid(this.selectedOrderRegion, this.selectedTargetRegion);
        }
    }

    reset() {
        this.selectedOrderRegion = null;
        this.orderInOrderRegion = null;
        this.selectedTargetRegion = null;
    }

    onOrderClick(r: Region, order: Order) {
        if (this.props.gameClient.authenticatedPlayer && this.props.gameState.house == this.props.gameClient.authenticatedPlayer.house) {
            if (this.selectedOrderRegion == null || this.orderInOrderRegion == null) {
                if (r.getController() != this.props.gameState.house) {
                    return;
                }

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
                if (!this.props.gameState.getRaidableRegions(this.selectedOrderRegion, this.orderInOrderRegion).includes(r)) {
                    return;
                }

                this.selectedTargetRegion = r;
            }
        }
    }

    shouldHighlightRegion(r: Region): boolean {
        if (this.props.gameClient.authenticatedPlayer && this.props.gameState.house == this.props.gameClient.authenticatedPlayer.house) {
            if (this.selectedOrderRegion != null && this.orderInOrderRegion != null) {
                return this.props.gameState.getRaidableRegions(this.selectedOrderRegion, this.orderInOrderRegion).includes(r);
            }
        }

        return false;
    }

    shouldHighlightOrder(r: Region, o: Order): boolean {
        if (this.props.gameClient.authenticatedPlayer && this.props.gameState.house == this.props.gameClient.authenticatedPlayer.house) {
            if (this.selectedOrderRegion == null || this.orderInOrderRegion == null) {
                return this.props.gameState.getRegionWithRaidOrders().includes(r);
            } else if (this.selectedTargetRegion == null) {
                return this.props.gameState.getRaidableRegions(this.selectedOrderRegion, this.orderInOrderRegion).includes(r);
            }
        }

        return false;
    }

    componentDidMount(): void {
        this.props.mapControls.onOrderClick.push(this.orderClickListener = (r: Region, o: Order) => this.onOrderClick(r, o));
        this.props.mapControls.shouldHighlightOrder.push(this.shouldHighlightOrderListener = (r: Region, o: Order) => this.shouldHighlightOrder(r, o));
        this.props.mapControls.shouldHighlightRegion.push(this.shouldHighlightRegionListener = (r: Region) => this.shouldHighlightRegion(r));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onOrderClick, this.orderClickListener);
        _.pull(this.props.mapControls.shouldHighlightOrder, this.shouldHighlightOrderListener);
        _.pull(this.props.mapControls.shouldHighlightRegion, this.shouldHighlightRegionListener);
    }
}
