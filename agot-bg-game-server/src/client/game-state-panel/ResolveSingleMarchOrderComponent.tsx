import {Component} from "react";
import ResolveSingleMarchOrderGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import React from "react";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import * as _ from "lodash";
import Order from "../../common/ingame-game-state/game-data-structure/Order";
import {observer} from "mobx-react";
import {Button, Form} from "react-bootstrap";
import MarchOrderType from "../../common/ingame-game-state/game-data-structure/order-types/MarchOrderType";
import BetterMap from "../../utils/BetterMap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class ResolveSingleMarchOrderComponent extends Component<GameStateComponentProps<ResolveSingleMarchOrderGameState>> {
    @observable selectedMarchOrderRegion: Region | null;
    @observable selectedUnits: Unit[] = [];
    @observable plannedMoves = new BetterMap<Region, Unit[]>();
    @observable placePowerToken = false;

    regionClickListener: any;
    unitClickListener: any;
    orderClickListener: any;
    shouldHighlightRegionListener: any;
    shouldHighlightOrderListener: any;
    shouldHighlightUnitListener: any;

    render() {
        return (
            <>
                <p>
                    <strong>{this.props.gameState.house.name}</strong> must resolve one of
                    its march orders.
                </p>
                {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                    <>
                        <p className="text-center">
                            {this.selectedMarchOrderRegion == null ? (
                                "Click on one of your march order"
                            ) : this.selectedUnits.length == 0 ? (
                                "Click on a subset of the troops in the marching region"
                            ) : (
                                "Click on a neighbouring region, or click on other units of the marching region"
                            )}
                        </p>
                        {this.plannedMoves.size > 0 && (
                            <p>
                                {this.plannedMoves.entries.map(([region, units]) => (
                                    <div key={region.id}>
                                        {units.map(u => u.type.name).join(", ")} => {region.name}
                                    </div>
                                ))}
                            </p>
                        )}
                        <div>
                            {this.selectedMarchOrderRegion != null && (
                                <>
                                    {this.props.gameState.canDecideToLeavePowerToken(
                                        this.selectedMarchOrderRegion,
                                        this.plannedMoves
                                    ) && (
                                        <Row className="justify-content-center">
                                            <Col xs="auto">
                                                <Form.Check
                                                    label="Place an Power Token"
                                                    checked={this.placePowerToken}
                                                    onChange={() => this.placePowerToken = !this.placePowerToken}
                                                />
                                            </Col>
                                        </Row>
                                    )}
                                    <Row className="justify-content-center">
                                        <Col xs="auto">
                                            <Button onClick={() => this.confirm()}>
                                                Confirm
                                            </Button>
                                        </Col>
                                        <Col xs="auto">
                                            <Button
                                                variant="danger"
                                                onClick={() => this.reset()}
                                            >
                                                Cancel
                                            </Button>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div>
                        Waiting for {this.props.gameState.house.name} to resolve one of its march order...
                    </div>
                )}
            </>
        );
    }

    onUnitClick(region: Region, unit: Unit): void {
        if (this.selectedMarchOrderRegion != null && this.selectedMarchOrderRegion == region) {
            if (!this.isUnitAvailable(region, unit)) {
                return;
            }

            this.selectedUnits.push(unit);
        }
    }

    isUnitAvailable(region: Region, unit: Unit): boolean {
        if (this.selectedUnits.indexOf(unit) != -1) {
            return false;
        }

        if (this.plannedMoves.values.some(units => units.indexOf(unit) != -1)) {
            return false;
        }

        return true;
    }

    shouldHighlightRegion(region: Region): boolean {
        if (this.selectedMarchOrderRegion != null && this.selectedUnits.length > 0) {
            if (this.props.gameState.world.getReachableRegions(this.selectedMarchOrderRegion, this.props.gameState.house, this.selectedUnits).includes(region)) {
                return true;
            }
        }
        return false;
    }

    shouldHighlightOrder(region: Region, order: Order): boolean {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.selectedMarchOrderRegion == null) {
                return this.props.gameState.getRegionsWithMarchOrder().includes(region);
            }
        }

        return false;
    }

    shouldHighlightUnit(region: Region, unit: Unit): boolean {
        if (this.selectedMarchOrderRegion != null) {
            return this.selectedMarchOrderRegion == region && this.isUnitAvailable(region, unit);
        }

        return false;
    }

    onRegionClick(region: Region): void {
        if (!this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            return;
        }

        if (this.selectedMarchOrderRegion != null && this.selectedUnits.length > 0) {
            const alreadyGoingUnits = this.plannedMoves.has(region) ? this.plannedMoves.get(region) as Unit[] : [];

            const newGoingArmy = alreadyGoingUnits.concat(this.selectedUnits);

            // Check if this army can go there
            if (this.props.gameState.world.getReachableRegions(
                this.selectedMarchOrderRegion,
                this.props.gameState.house,
                newGoingArmy
            ).indexOf(region) == -1) {
                return;
            }

            this.plannedMoves.set(region, newGoingArmy);

            this.selectedUnits = [];
        }
    }

    onOrderClick(region: Region, order: Order): void {
        if (!this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            return;
        }

        if (this.selectedMarchOrderRegion == null && order.type instanceof MarchOrderType) {
            this.selectedMarchOrderRegion = region;
        }
    }

    reset(): void {
        this.selectedMarchOrderRegion = null;
        this.selectedUnits = [];
        this.plannedMoves = new BetterMap<Region, Unit[]>();
    }

    confirm(): void {
        if (!this.selectedMarchOrderRegion) {
            return;
        }

        this.props.gameState.sendMoves(
            this.selectedMarchOrderRegion,
            this.plannedMoves,
            this.placePowerToken
        );

        this.reset();
    }

    componentDidMount(): void {
        this.props.mapControls.onUnitClick.push(this.unitClickListener = (r: Region, u: Unit) => this.onUnitClick(r, u));
        this.props.mapControls.onOrderClick.push(this.orderClickListener = (r: Region, o: Order) => this.onOrderClick(r, o));
        this.props.mapControls.onRegionClick.push(this.regionClickListener = (r: Region) => this.onRegionClick(r));
        this.props.mapControls.shouldHighlightRegion.push(this.shouldHighlightRegionListener = (r: Region) => this.shouldHighlightRegion(r));
        this.props.mapControls.shouldHighlightOrder.push(this.shouldHighlightOrderListener = (r: Region, o: Order) => this.shouldHighlightOrder(r, o));
        this.props.mapControls.shouldHighlightUnit.push(this.shouldHighlightUnitListener = (r: Region, u: Unit) => this.shouldHighlightUnit(r, u));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onUnitClick, this.unitClickListener);
        _.pull(this.props.mapControls.onRegionClick, this.regionClickListener);
        _.pull(this.props.mapControls.onOrderClick, this.orderClickListener);
        _.pull(this.props.mapControls.shouldHighlightRegion, this.shouldHighlightRegionListener);
        _.pull(this.props.mapControls.shouldHighlightOrder, this.shouldHighlightOrderListener);
        _.pull(this.props.mapControls.shouldHighlightUnit, this.shouldHighlightUnitListener);
    }
}
