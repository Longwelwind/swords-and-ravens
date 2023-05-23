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
import RaidSupportOrderType from "../../common/ingame-game-state/game-data-structure/order-types/RaidSupportOrderType";
import House from "../../common/ingame-game-state/game-data-structure/House";

@observer
export default class ResolveSingleRaidOrderComponent extends Component<GameStateComponentProps<ResolveSingleRaidOrderGameState>> {
    @observable selectedOrderRegion: Region | null;
    @observable selectedTargetRegion: Region | null;

    modifyOrdersOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    get orderInOrderRegion(): RaidOrderType | RaidSupportOrderType | null {
        if (!this.selectedOrderRegion) {
            return null;
        }

        return this.props.gameState.actionGameState.ordersOnBoard.get(this.selectedOrderRegion).type as RaidOrderType | RaidSupportOrderType;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    House <b>{this.house.name}</b> must resolve one of its Raid Orders.
                </Col>
                {this.props.gameClient.doesControlHouse(this.house) ? (
                    this.selectedOrderRegion == null ? (
                        <Col xs={12} className="text-center">
                            Select a Raid Order token to resolve it.
                        </Col>
                    ) : (
                        <>
                            <Col xs={12} className="text-center">
                                <p>Chosen Raid order: <b>{this.selectedOrderRegion.name}</b></p>
                                {this.selectedTargetRegion == null ? (
                                    <>
                                        <p>Click the target order to raid it, or click on <b>Confirm</b> to {this.orderInOrderRegion instanceof RaidSupportOrderType ? "use the order as Support+1 order" : "remove your Raid order"}.</p>
                                    </>
                                ) : (
                                    <>Target: {this.selectedTargetRegion.name}</>
                                )}
                            </Col>
                            <Col xs={12}>
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button type="button" variant="success" onClick={() => this.confirm()}>Confirm</Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button type="button" variant="danger" onClick={() => this.reset()}>Reset</Button>
                                    </Col>
                                </Row>
                            </Col>
                        </>
                    )
                ) : (
                    <Col xs={12} className="text-center">
                        Waiting for {this.props.gameState.ingameGameState.getControllerOfHouse(this.house).house.name}...
                    </Col>
                )}
            </>
        );
    }

    confirm(): void {
        if (this.selectedOrderRegion) {
            if (!this.selectedTargetRegion) {
                if (!window.confirm('Are you sure not to use your Raid order?')) {
                    return;
                }
            }

            this.props.gameState.resolveRaid(this.selectedOrderRegion, this.selectedTargetRegion);
            this.reset();
        }
    }

    reset(): void {
        this.selectedOrderRegion = null;
        this.selectedTargetRegion = null;
    }

    onOrderClick(r: Region, _orderType: RaidOrderType | RaidSupportOrderType | null): void {
        if (this.props.gameClient.doesControlHouse(this.house)) {
            if (this.selectedOrderRegion == null) {
                this.selectedOrderRegion = r;
            } else {
                this.selectedTargetRegion = r;
            }
        }
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.house)) {
            if (this.selectedOrderRegion == null || this.orderInOrderRegion == null) {
                // Highlight the Raid orders of the house
                return this.props.gameState.parentGameState.getRegionsWithRaidOrderOfHouse(this.house).map(([r, ot]) => [
                    r,
                    {highlight: {active: true}, onClick: () => this.onOrderClick(r, ot)}
                ])
            } else {
                // Highlight the possible raidable orders from the selected Raid order
                return this.props.gameState.getRaidableRegions(this.selectedOrderRegion, this.orderInOrderRegion).map(r => [
                    r,
                    {highlight: {active: true}, onClick: () => this.onOrderClick(r, null)}
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
