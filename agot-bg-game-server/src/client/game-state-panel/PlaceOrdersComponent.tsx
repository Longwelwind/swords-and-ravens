import {Component, ReactNode, ReactElement} from "react";
import {observer} from "mobx-react";
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
import { OverlayTrigger, Popover } from "react-bootstrap";
import BetterMap from "../../utils/BetterMap";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import PlanningRestriction from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import { noMarchPlusOneOrder, noDefenseOrder, noSupportOrder, noRaidOrder, noConsolidatePowerOrder } from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import WesterosCardType from "../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import { rainsOfAutumn, stormOfSwords, webOfLies, seaOfStorms, feastForCrows } from "../../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";
import { renderRegionTooltip } from "../regionTooltip";
import info from "../../../public/images/icons/info.svg"
import { preventOverflow } from "@popperjs/core";

@observer
export default class PlaceOrdersComponent extends Component<GameStateComponentProps<PlaceOrdersGameState>> {
    restrictionToWesterosCardTypeMap = new BetterMap<PlanningRestriction, {deckId: number; westerosCardType: WesterosCardType}>([
        [noMarchPlusOneOrder, { deckId: 2, westerosCardType: rainsOfAutumn } ],
        [noDefenseOrder, { deckId: 2, westerosCardType: stormOfSwords } ],
        [noSupportOrder, { deckId: 2, westerosCardType: webOfLies } ],
        [noRaidOrder, { deckId: 2, westerosCardType: seaOfStorms } ],
        [noConsolidatePowerOrder, { deckId: 2, westerosCardType: feastForCrows} ]
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

    get forVassals(): boolean {
        return this.placeOrders.forVassals;
    }

    get placeOrders(): PlaceOrdersGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                <ListGroupItem style={{borderStyle: "none"}}>
                    <Row className="justify-content-center">
                        <Col xs={12} className="text-center">
                            {!this.forVassals ? (
                                <>Players must assign orders in each region where they possess at least one unit now.</>
                            ) : (
                                <>Players must assign orders for their vassals now.</>
                            )}
                        </Col>
                        {this.placeOrders.parentGameState.planningRestrictions.map(pr => this.restrictionToWesterosCardTypeMap.tryGet(pr, null))
                            .map(prWc => prWc != null ?
                                <Col xs={12} key={`prwc_${prWc.westerosCardType.id}`} className="d-flex flex-column align-items-center">
                                    <WesterosCardComponent cardType={prWc.westerosCardType} size="medium" tooltip={true} westerosDeckI={prWc.deckId}/>
                                </Col> : <></>)
                        }
                        <Col xs={12}>
                        {this.props.gameClient.authenticatedPlayer && this.showButtons() && (
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button
                                            disabled={!this.placeOrders.canReady(this.props.gameClient.authenticatedPlayer).status}
                                            onClick={() => this.onReadyClick()}
                                        >
                                            Ready
                                        </Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button
                                            disabled={!this.placeOrders.canUnready(this.props.gameClient.authenticatedPlayer).status}
                                            onClick={() => this.onUnreadyClick()}
                                        >
                                            Unready
                                        </Button>
                                    </Col>
                                </Row>
                            )}
                            <Row>
                                <Col xs={12} className="text-center" style={{marginTop: 10}}>
                                    Waiting for {this.placeOrders.getNotReadyPlayers().map(p => p.house.name).join(', ')}...
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </ListGroupItem>
            </>
        );
    }

    showButtons(): boolean {
        return !this.placeOrders.forVassals || this.placeOrders.ingame.getVassalsControlledByPlayer(this.player).length > 0;
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
                        highlight: {active: !this.placeOrders.placedOrders.has(r)},
                        wrap: (child: ReactElement) => (
                            <OverlayTrigger
                                placement="auto"
                                trigger="click"
                                rootClose
                                overlay={
                                    <Popover id={"region" + r.id}>
                                        <Row className="justify-content-center align-items-center mt-2">
                                            <Col xs="auto"><b>{r.name}</b></Col>
                                            <Col xs="auto">
                                                <OverlayTrigger overlay={renderRegionTooltip(r)}
                                                    popperConfig={{modifiers: [preventOverflow]}}
                                                    placement="auto">
                                                <div style={{backgroundImage: `url(${info})`, width: 16, height: 16, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat"}}/>
                                                </OverlayTrigger>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <OrderGridComponent orders={this.placeOrders.getOrdersList(r.getController() as House)}
                                                selectedOrder={null}
                                                availableOrders={
                                                    this.placeOrders.getAvailableOrders(r.getController() as House)
                                                }
                                                restrictedOrders={this.placeOrders.ingame.game.getRestrictedOrders(r, this.placeOrders.planningGameState.planningRestrictions)}
                                                onOrderClick={o => {
                                                    this.placeOrders.assignOrder(r, o);
                                                    document.body.click();
                                            }}/>
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
