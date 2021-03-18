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
import { OverlayTrigger, Popover } from "react-bootstrap";
import BetterMap from "../../utils/BetterMap";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import PlanningRestriction from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import { noMarchPlusOneOrder, noDefenseOrder, noSupportOrder, noRaidOrder, noConsolidatePowerOrder } from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import WesterosCardType from "../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import { rainsOfAutumn, stormOfSwords, webOfLies, seaOfStorms, feastForCrows } from "../../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";

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
                                <>Players must assign orders in each region where they possess at least one unit now.</>
                            ) : (
                                <>Players must assign orders for their vassals now.</>
                            )}
                        </Col>
                        {this.props.gameState.parentGameState.planningRestrictions.map(pr => this.restrictionToWesterosCardTypeMap.tryGet(pr, null))
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

    showButtons(): boolean {
        return !this.props.gameState.forVassals || this.props.gameState.ingame.getVassalsControlledByPlayer(this.player).length > 0;
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
            const possibleRegions = _.flatMap(this.housesToPlaceOrdersFor.map(h => this.props.gameState.getPossibleRegionsForOrders(h)));

            return possibleRegions.map(r => [
                    r,
                    {
                        // Highlight areas with no order
                        highlight: {active: !this.props.gameState.placedOrders.has(r)},
                        wrap: (child: ReactElement) => (
                            <OverlayTrigger
                                placement="auto"
                                trigger="click"
                                rootClose
                                overlay={
                                    <Popover id={"region" + r.id}>
                                        <p className="text-strong text-center">{r.name}</p>
                                        <OrderGridComponent orders={this.props.gameState.getOrdersList(r.getController() as House)}
                                            selectedOrder={null}
                                            availableOrders={
                                                this.props.gameState.getAvailableOrders(r.getController() as House, r)
                                            }
                                            onOrderClick={o => {
                                                this.props.gameState.assignOrder(r, o);
                                                document.body.click();
                                        }}/>
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
                this.housesToPlaceOrdersFor.map(h => this.props.gameState.getPossibleRegionsForOrders(h).map(r => [
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
