import { observer } from "mobx-react";
import React, { Component, ReactElement, ReactNode } from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { observable } from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { OrderOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import ResolveSingleConsolidatePowerGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../../common/ingame-game-state/game-data-structure/order-types/ConsolidatePowerOrderType";
import IronBankOrderType from "../../common/ingame-game-state/game-data-structure/order-types/IronBankOrderType";
import DefenseMusterOrderType from "../../common/ingame-game-state/game-data-structure/order-types/DefenseMusterOrderType";
import IronBank from "../../common/ingame-game-state/game-data-structure/IronBank";
import _ from "lodash";

@observer
export default class ResolveSingleConsolidatePowerComponent extends Component<GameStateComponentProps<ResolveSingleConsolidatePowerGameState>> {
    @observable selectedOrderRegion: Region | null = null;
    @observable selectedOrderType: ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType | null = null;

    modifyOrdersOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    get doesControlCurrentHouse(): boolean {
        return this.props.gameClient.doesControlHouse(this.house);
    }

    get gameState(): ResolveSingleConsolidatePowerGameState {
        return this.props.gameState;
    }

    get defenseMusterOrderRegion(): Region | null {
        const regions = this.gameState.actionGameState.getRegionsWithDefenseMusterOrderOfHouse(this.house);
        if (regions.length == 1) {
            return regions[0][0];
        }

        return null;
    }

    get ironBank(): IronBank | null {
        return this.gameState.ingame.game.ironBank;
    }

    render(): ReactNode {
        const availableOrders =this.props.gameState.parentGameState.getAvailableOrdersOfHouse(this.house);
        return (
            <>
                <Col xs={12} className="text-center">
                    {this.gameState.ingame.isVassalHouse(this.house)
                        ? <>Vassal house <b>{this.house.name}</b> must resolve their Muster&nbsp;order{this.defenseMusterOrderRegion && <> in <b>{this.defenseMusterOrderRegion.name}</b></>}.</>
                        : <>House <b>{this.house.name}</b> must resolve one of its Consolidate&nbsp;Power{availableOrders.values.some(ot => ot instanceof IronBankOrderType) ? " or Iron\xa0Bank" : ""} orders.</>}
                </Col>
                {this.doesControlCurrentHouse ?
                    <>{this.selectedOrderRegion && this.selectedOrderType
                        ? this.renderGameStateControls(this.selectedOrderRegion, this.selectedOrderType)
                        : <Col xs={12} className="text-center"><p>Click the order you want to resolve.</p></Col>}
                        <Col xs={12} className="d-flex justify-content-center">
                            <Button type="button"
                                variant="danger"
                                onClick={() => this.reset()}
                            >
                                Reset
                            </Button>
                        </Col>
                    </>
                    :
                    <Col xs={12} className="text-center">
                        Waiting for {this.gameState.ingame.getControllerOfHouse(this.house).house.name}...
                    </Col>}
            </>
        );
    }

    private renderGameStateControls(orderRegion: Region, orderType: ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType) {
        return <>
            <Col xs={12} className="text-center">
                <p><b>{orderType.name}</b> in <b>{orderRegion.name}</b></p>
            </Col>
            <Col xs={12}>
                <Row className="justify-content-center">
                    {orderType instanceof DefenseMusterOrderType && <>
                        <Col xs={12} className="d-flex justify-content-center">
                            <Button type="button" variant="success" onClick={() => {
                                this.gameState.chooseMustering(orderRegion as Region);
                                this.reset();
                            } }>
                                Muster in {orderRegion.name}
                            </Button>
                        </Col>
                        <Col xs={12} className="d-flex justify-content-center">
                            <Button type="button" variant="warning" onClick={() => {
                                this.gameState.chooseRemoveOrder(orderRegion as Region);
                                this.reset();
                            } }>
                                Ignore and remove order
                            </Button>
                        </Col>
                    </>}
                    {orderType instanceof ConsolidatePowerOrderType && <>
                        {orderType.starred && orderRegion.castleLevel > 0 &&
                            <Col xs="auto">
                                <Button type="button" variant="success" onClick={() => {
                                    this.gameState.chooseMustering(orderRegion as Region);
                                    this.reset();
                                } }>
                                    Muster in {orderRegion.name}
                                </Button>
                            </Col>}
                        <Col xs="auto">
                            <Button type="button" onClick={() => {
                                this.gameState.chooseGainPowerTokens(orderRegion as Region);
                                this.reset();
                            } }>
                                {this.getPowerTokenButtonText(this.gameState.getPotentialGainedPowerTokens(orderRegion, this.house))}
                            </Button>
                        </Col>
                    </>}
                    {orderType instanceof IronBankOrderType && this.ironBank && <>
                        {this.ironBank.getPurchasableLoans(this.house).map(purchasable => <Col xs={12} className="d-flex justify-content-center" key={`loan-button-${purchasable.loan.id}`}>
                            <Button type="button" variant="success" onClick={() => {
                                this.gameState.choosePurchaseLoan(purchasable.slotIndex, orderRegion as Region);
                                this.reset();
                            } }>
                                Pay {purchasable.costs} Power token{purchasable.costs != 1 ? "s" : ""} to purchase {purchasable.loan.name}
                            </Button>
                        </Col>
                        )}
                        <Col xs={12} className="d-flex justify-content-center">
                            <Button type="button" variant="warning" onClick={() => {
                                this.gameState.chooseRemoveOrder(orderRegion as Region);
                                this.reset();
                            } }>
                                Ignore and remove order
                            </Button>
                        </Col>
                    </>}
                </Row>
            </Col>
        </>;
    }

    private getPowerTokenButtonText(powerTokenCount: number): string {
        return `Gain ${powerTokenCount} Power token${powerTokenCount != 1 ? "s" : ""}`;
    }

    private modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.doesControlCurrentHouse) {
            const availableOrders = this.gameState.parentGameState.getAvailableOrdersOfHouse(this.gameState.house);
            return availableOrders.entries.map(([r, ot]) => [
                r,
                {
                    highlight: { active: true },
                    onClick: () => this.onOrderClick(r, ot),
                    wrap: (child: ReactElement) => (
                        <OverlayTrigger
                            placement="auto-start"
                            trigger="click"
                            rootClose
                            overlay={
                                <Popover id={"resolve-cp-order-popover_region_" + r.id} className="p-1">
                                    {this.renderGameStateControls(r, ot)}
                                </Popover>
                            }
                        >
                            {child}
                        </OverlayTrigger>
                    )
                }
            ]);
        }

        return [];
    }

    private onOrderClick(region: Region, orderType: ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType): void {
        if (this.selectedOrderRegion == region) {
            this.reset();
        } else {
            this.selectedOrderRegion = region;
            this.selectedOrderType = orderType;
        }
    }

    private reset(): void {
        this.selectedOrderRegion = null;
        this.selectedOrderType = null;
        document.body.click();
    }

    componentDidMount(): void {
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }
}