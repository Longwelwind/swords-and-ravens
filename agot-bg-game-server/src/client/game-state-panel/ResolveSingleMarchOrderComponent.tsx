import {Component, ReactNode} from "react";
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
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

@observer
export default class ResolveSingleMarchOrderComponent extends Component<GameStateComponentProps<ResolveSingleMarchOrderGameState>> {
    @observable selectedMarchOrderRegion: Region | null;
    @observable selectedUnits: Unit[] = [];
    @observable plannedMoves = new BetterMap<Region, Unit[]>();
    @observable leavePowerToken = false;

    regionClickListener: any;
    unitClickListener: any;
    orderClickListener: any;
    shouldHighlightRegionListener: any;
    shouldHighlightOrderListener: any;
    shouldHighlightUnitListener: any;

    render() {

        return (
            <>
                <Col xs={12} className="text-center">
                    <strong>{this.props.gameState.house.name}</strong> must resolve one of
                    its march orders.
                </Col>
                {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                    <>
                        <Col xs={12} className="text-center">
                            {this.selectedMarchOrderRegion == null ? (
                                "Click on one of your march order"
                            ) : this.selectedUnits.length == 0 ? (
                                "Click on a subset of the troops in the marching region"
                            ) : (
                                "Click on a neighbouring region, or click on other units of the marching region"
                            )}
                        </Col>
                        {this.plannedMoves.size > 0 && (
                            <Col xs={12} className="text-center">
                                {this.plannedMoves.entries.map(([region, units]) => (
                                    <div key={region.id}>
                                        {units.map(u => u.type.name).join(", ")} => {region.name}
                                    </div>
                                ))}
                            </Col>
                        )}
                        {this.selectedMarchOrderRegion != null && (
                            <>
                                {this.renderLeavePowerToken(this.selectedMarchOrderRegion)}
                                <Col xs={12}>
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
                                </Col>
                            </>
                        )}
                    </>
                ) : (
                    <Col xs={12} className="text-center">
                        Waiting for {this.props.gameState.house.name} to resolve one of its march order...
                    </Col>
                )}
            </>
        );
    }

    renderLeavePowerToken(startingRegion: Region): ReactNode | null {
        const {success, reason} = this.props.gameState.canLeavePowerToken(
            startingRegion,
            this.plannedMoves
        );

        return (
            <Col xs={12} className="text-center">
                <OverlayTrigger overlay={
                    <Tooltip id={"leave-power-token"}>
                        {reason == "already-capital" ? (
                            <>Your capital is always controlled by your house, thus not requiring a Power
                                token to be left when leaving the area to keep control of it.</>
                        ) : reason == "already-power-token" ? (
                            <>A Power token is already present.</>
                        ) : reason == "no-power-token-available" ? (
                            "You don't have any available Power token."
                        ) : reason == "not-a-land" ? (
                            "Power tokens can only be left on land areas."
                        ) : reason == "no-all-units-go" ? (
                            "All units must leave the area in order to leave a Power token."
                        ) : "Leaving a Power token in an area maintain the control your house has on it, even"
                            + " if all units your units leave the area."}
                    </Tooltip>
                }>
                    <Form.Check
                        id="chk-leave-pt"
                        label="Leave a Power Token"
                        checked={this.leavePowerToken}
                        onChange={() => this.leavePowerToken = !this.leavePowerToken}
                        disabled={!success}
                    />
                </OverlayTrigger>
            </Col>
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
            if (this.props.gameState.getValidTargetRegions(this.selectedMarchOrderRegion, this.plannedMoves.entries, this.selectedUnits).includes(region)) {
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
        this.leavePowerToken = false;
    }

    confirm(): void {
        if (!this.selectedMarchOrderRegion) {
            return;
        }

        if(this.plannedMoves.size == 0) {
            if(!confirm("Do you want to remove your march order?")) {
                return;
            }
        }

        this.props.gameState.sendMoves(
            this.selectedMarchOrderRegion,
            this.plannedMoves,
            this.leavePowerToken
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
