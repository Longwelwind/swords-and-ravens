import { observer } from "mobx-react";
import React, { Component, ReactNode } from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { observable } from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { Button } from "react-bootstrap";
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

    get theIronBank(): IronBank {
        return this.gameState.ingame.game.theIronBank;
    }

    render(): ReactNode {
        const availableOrders =this.props.gameState.parentGameState.getAvailableOrdersOfHouse(this.house);
        return (
            <>
                <Col xs={12} className="text-center">
                    {this.gameState.ingame.isVassalHouse(this.house)
                        ? <>Vassal house <b>{this.house.name}</b> must resolve their Muster Order{this.defenseMusterOrderRegion && <> in <b>{this.defenseMusterOrderRegion.name}</b></>}.</>
                        : <>House <b>{this.house.name}</b> must resolve one of its Consolidate Power{availableOrders.values.some(ot => ot instanceof IronBankOrderType) ? " or Iron Bank" : ""} Orders.</>}
                </Col>
                {this.doesControlCurrentHouse ?
                    this.selectedOrderRegion && this.selectedOrderType ?
                        <>
                            <Col xs={12} className="text-center">
                                <p><b>{this.selectedOrderType.name}</b> in <b>{this.selectedOrderRegion.name}</b></p>
                            </Col>
                            <Col xs={12}>
                                <Row className="justify-content-center">
                                    {this.selectedOrderType instanceof DefenseMusterOrderType && <>
                                        <Col xs="auto">
                                            <Button variant="success" onClick={() => {
                                                this.gameState.chooseMustering(this.selectedOrderRegion as Region);
                                                this.reset();
                                            }}>
                                                Muster in {this.selectedOrderRegion.name}
                                            </Button>
                                        </Col>
                                        <Col xs="auto">
                                            <Button variant="warning" onClick={() => {
                                                this.gameState.chooseRemoveOrder(this.selectedOrderRegion as Region);
                                                this.reset();
                                            }}>
                                                Ignore and remove order
                                            </Button>
                                        </Col>
                                    </>}
                                    {this.selectedOrderType instanceof ConsolidatePowerOrderType && <>
                                        {this.selectedOrderType.starred && this.selectedOrderRegion.castleLevel > 0 && <Col xs="auto">
                                            <Button variant="success" onClick={() => {
                                                this.gameState.chooseMustering(this.selectedOrderRegion as Region);
                                                this.reset();
                                            }}>
                                                Muster in {this.selectedOrderRegion.name}
                                            </Button>
                                        </Col>}
                                        <Col xs="auto">
                                            <Button onClick={() => {
                                                this.gameState.chooseGainPowerTokens(this.selectedOrderRegion as Region);
                                                this.reset();
                                            }}>
                                                {this.getPowerTokenButtonText(this.gameState.getPotentialGainedPowerTokens(this.selectedOrderRegion, this.house))}
                                            </Button>
                                        </Col>
                                    </>}
                                    {this.selectedOrderType instanceof IronBankOrderType && this.ironBank && <>
                                        {this.ironBank.getPurchasableLoans(this.house).map(purchasable =>
                                            <Col xs="auto" key={`loan-button-${purchasable.loan.id}`}>
                                                <Button variant="success" onClick={() => {
                                                    this.gameState.choosePurchaseLoan(purchasable.slotIndex, this.selectedOrderRegion as Region);
                                                    this.reset();
                                                }}>
                                                    Pay {purchasable.costs} Power tokens to purchase {purchasable.loan.name}
                                                </Button>
                                            </Col>
                                        )}
                                        <Col xs="auto">
                                            <Button variant="warning" onClick={() => {
                                                this.gameState.chooseRemoveOrder(this.selectedOrderRegion as Region);
                                                this.reset();
                                            }}>
                                                Ignore and remove order
                                            </Button>
                                        </Col>
                                    </>}
                                    <Col xs="auto">
                                        <Button
                                            variant="danger"
                                            onClick={() => this.reset()}
                                        >
                                            Reset selection
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </>
                        : <Col xs={12} className="text-center"><p>Click the order you want to resolve.</p></Col>
                    :
                    <Col xs={12} className="text-center">
                        Waiting for {this.house.name}...
                    </Col>}
            </>
        );
    }

    private getPowerTokenButtonText(powerTokenCount: number): string {
        return `Gain ${powerTokenCount} Power token${powerTokenCount > 1 ? "s" : ""}`;
    }

    private modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.doesControlCurrentHouse) {
            const availableOrders = this.gameState.parentGameState.getAvailableOrdersOfHouse(this.gameState.house);
            if (this.selectedOrderRegion && this.selectedOrderType) {
                availableOrders.clear();
                availableOrders.set(this.selectedOrderRegion, this.selectedOrderType);
            }
            return availableOrders.entries.map(([r, ot]) => [
                r,
                {
                    highlight: { active: true },
                    onClick: () => this.onOrderClick(r, ot)
                }
            ]);
        }

        return [];
    }

    private onOrderClick(region: Region, orderType: ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType): void {
        if (!this.selectedOrderRegion) {
            this.selectedOrderRegion = region;
            this.selectedOrderType = orderType;
        } else if (this.selectedOrderRegion == region) {
            this.reset();
        }
    }

    private reset(): void {
        this.selectedOrderRegion = null;
        this.selectedOrderType = null;
    }

    componentDidMount(): void {
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }
}