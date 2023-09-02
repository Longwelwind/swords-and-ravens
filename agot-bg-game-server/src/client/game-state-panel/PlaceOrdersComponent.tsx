import { Component, ReactNode, ReactElement } from "react";
import { observer } from "mobx-react";
import React from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OrderGridComponent from "./utils/OrderGridComponent";
import { OrderOnMapProperties, RegionOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import PlaceOrdersGameState from "../../common/ingame-game-state/planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import Player from "../../common/ingame-game-state/Player";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { OverlayTrigger, Popover } from "react-bootstrap";
import BetterMap from "../../utils/BetterMap";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import PlanningRestriction from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import { noMarchPlusOneOrder, noDefenseOrder, noSupportOrder, noRaidOrder, noConsolidatePowerOrder } from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import WesterosCardType from "../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import { rainsOfAutumn, stormOfSwords, webOfLies, seaOfStorms, feastForCrows } from "../../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";
import { renderRegionTooltip } from "../regionTooltip";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";

@observer
export default class PlaceOrdersComponent extends Component<GameStateComponentProps<PlaceOrdersGameState>> {
    restrictionToWesterosCardTypeMap = new BetterMap<PlanningRestriction, { deckId: number; westerosCardType: WesterosCardType }>([
        [noMarchPlusOneOrder, { deckId: 2, westerosCardType: rainsOfAutumn }],
        [noDefenseOrder, { deckId: 2, westerosCardType: stormOfSwords }],
        [noSupportOrder, { deckId: 2, westerosCardType: webOfLies }],
        [noRaidOrder, { deckId: 2, westerosCardType: seaOfStorms }],
        [noConsolidatePowerOrder, { deckId: 2, westerosCardType: feastForCrows }],
    ]);

    modifyRegionsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

    get player(): Player {
        if (!this.props.gameClient.authenticatedPlayer) {
            throw new Error();
        }

        return this.props.gameClient.authenticatedPlayer;
    }

    get housesToPlaceOrdersFor(): House[] {
        return this.placeOrders.getHousesToPutOrdersForPlayer(this.player);
    }

    get placeOrders(): PlaceOrdersGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                <Row className="justify-content-center">
                    <Col xs={12} className="text-center">
                        Players must now place orders in every area where they have at least one unit.
                    </Col>
                    {this.placeOrders.parentGameState.planningRestrictions.map(pr => this.restrictionToWesterosCardTypeMap.tryGet(pr, null))
                        .map(prWc => prWc != null ?
                            <Col xs={12} key={`prwc_${prWc.westerosCardType.id}`} className="d-flex flex-column align-items-center">
                                <WesterosCardComponent cardType={prWc.westerosCardType} size="medium" tooltip={true} westerosDeckI={prWc.deckId} />
                            </Col> : <></>)
                    }
                    <Col xs={12}>
                        {this.props.gameClient.authenticatedPlayer && (
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <Button type="button"
                                        disabled={!this.placeOrders.canReady(this.props.gameClient.authenticatedPlayer).status}
                                        onClick={() => this.onReadyClick()}
                                        variant="success"
                                    >
                                        Ready
                                    </Button>
                                </Col>
                                <Col xs="auto">
                                    <Button type="button"
                                        disabled={!this.placeOrders.canUnready(this.props.gameClient.authenticatedPlayer).status}
                                        onClick={() => this.onUnreadyClick()}
                                        variant="danger"
                                    >
                                        Unready
                                    </Button>
                                </Col>
                            </Row>
                        )}
                        <Row>
                            <Col xs={12} className="text-center" style={{ marginTop: 10 }}>
                                Waiting for {this.placeOrders.getNotReadyPlayers().map(p => p.house.name).join(', ')}...
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </>
        );
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
            const possibleRegions = _.flatMap(this.housesToPlaceOrdersFor.map(h => this.placeOrders.getPossibleRegionsForOrders(h)));

            return possibleRegions.map(r => [
                r,
                {
                    // Highlight areas with no order
                    highlight: { active: !this.placeOrders.placedOrders.has(r) },
                    wrap: (child: ReactElement) => (
                        <OverlayTrigger
                            placement="auto-start"
                            trigger="click"
                            rootClose
                            overlay={
                                <Popover id={"place-order-popover_region_" + r.id} className="p-3">
                                    <Row className="justify-content-center align-items-center mb-2">
                                        <Col xs="auto"><h5 className="my-0"><b>{r.name}</b></h5></Col>
                                        <Col xs="auto">
                                            <OverlayTrigger overlay={renderRegionTooltip(r)}
                                                popperConfig={{ modifiers: [preventOverflow] }}
                                                placement="auto"
                                            >
                                                <div style={{width: 28, height: 28}} className="circle-border d-flex justify-content-center align-items-center">
                                                    <FontAwesomeIcon icon={faInfo} fontSize="16px" />
                                                </div>
                                            </OverlayTrigger>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <OrderGridComponent orders={this.placeOrders.getOrdersList(r.getController() as House)}
                                            selectedOrder={null}
                                            availableOrders={
                                                this.placeOrders.getAvailableOrders(r.getController() as House)
                                            }
                                            restrictedOrders={this.placeOrders.ingame.game.getRestrictedOrders(r, this.placeOrders.planningGameState.planningRestrictions, true)}
                                            onOrderClick={o => {
                                                this.placeOrders.assignOrder(r, o);
                                                document.body.click();
                                            }} />
                                    </Row>
                                </Popover>
                            }
                        >
                            {child}
                        </OverlayTrigger>
                    )
                }
            ] as [Region, PartialRecursive<RegionOnMapProperties>]);
        }

        return [];
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.authenticatedPlayer) {
            return _.flatMap(
                this.housesToPlaceOrdersFor.map(h => this.placeOrders.getPossibleRegionsForOrders(h).map(r => [
                    r,
                    {
                        highlight: { active: true },
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

        this.placeOrders.assignOrder(region, null);
    }

    onReadyClick(): void {
        if (!this.props.gameClient.authenticatedPlayer) {
            return;
        }

        if (this.placeOrders.getHousesToPutOrdersForPlayer(this.props.gameClient.authenticatedPlayer).some(
            h => this.placeOrders.game.getPlacedOrders(this.placeOrders.placedOrders, h).entries.some(
                ([region, order]) => this.placeOrders.game.isOrderRestricted(region, order, this.placeOrders.planningGameState.planningRestrictions)))) {
            if (!window.confirm("You have placed restricted orders. They will be removed after the messenger raven has been used. Do you want to continue?")) {
                return;
            }
        }

        this.placeOrders.ready();
    }

    onUnreadyClick(): void {
        this.placeOrders.unready();
    }
}
