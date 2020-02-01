import PlayerReconcileArmiesGameState
    from "../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/player-reconcile-armies-game-state/PlayerReconcileArmiesGameState";
import {Component, ReactNode} from "react";
import React from "react";
import BetterMap from "../../utils/BetterMap";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import {observer} from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import {observable} from "mobx";
import Row from "react-bootstrap/Row";
import { ListGroupItem } from "react-bootstrap";

@observer
export default class PlayerReconcileArmiesComponent extends Component<GameStateComponentProps<PlayerReconcileArmiesGameState>> {
    @observable unitsToRemove: BetterMap<Region, Unit[]> = new BetterMap();

    unitClickListener: any;
    shouldHighlightUnitListener: any;

    get house(): House {
        return this.props.gameState.house;
    }

    render(): ReactNode {
        return (
            <ListGroupItem>
                <Row>
                    <Col xs={12} className="text-center">
                        <strong>{this.props.gameState.house.name}</strong> must reconcile their armies according to their supply limits.
                    </Col>
                    {this.props.gameClient.doesControlHouse(this.house) ? (
                        <Col xs={12}>
                            {this.renderButtonsAndReconcilementStatus()}
                        </Col>
                    ) : (
                            <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
                        )
                    }
                </Row>
            </ListGroupItem>
        );
    }

    private renderButtonsAndReconcilementStatus(): ReactNode | null {
        const { reconciled, reason } = this.props.gameState.checkReconcilement(this.unitsToRemove);

        return (<>
            {this.unitsToRemove.entries.map(([region, units]) => (
                <Row className="justify-content-center" style={{paddingBottom: 10}}>
                    <div>{region.name}: {units.map(u => u.type.name).join(", ")}</div>
                </Row>
            ))}
            <Row className="justify-content-center">
                <Col xs="auto">
                    <Button disabled={!reconciled} onClick={() => this.confirm()}>Confirm</Button>
                </Col>
                <Col xs="auto">
                    <Button disabled={this.unitsToRemove.size == 0} onClick={() => this.reset()}>Reset</Button>
                </Col>
            </Row>
            <Row>
                <div style={{paddingTop: 10}}>{reason}</div>
            </Row>
        </>);
    }

    onUnitClick(region: Region, unit: Unit): void {
        if (!this.props.gameClient.doesControlHouse(this.house)) {
            return;
        }

        if(region.units.size <= 1) {
            return;
        }

        if (region.getController() == this.house) {
            // If there's no array for this region, add one
            if (!this.unitsToRemove.has(region)) {
                this.unitsToRemove.set(region, []);
            }

            if (!this.unitsToRemove.get(region).includes(unit)) {
                // Add the clicked unit
                this.unitsToRemove.get(region).push(unit);
            } else {
                // Remove the clicked unit
                _.pull(this.unitsToRemove.get(region), unit);
            }

            // If the array for this region is now empty, remove it
            if (this.unitsToRemove.get(region).length == 0) {
                this.unitsToRemove.delete(region);
            }
        }
    }

    shouldHighlightUnit(_region: Region, unit: Unit): boolean {
        // single units doesn't count as army and thus they don't need to be removed
        const regionOfUnit = this.props.gameState.game.world.getControlledRegions(unit.allegiance).filter(r => r.units.has(unit.id));
        if(regionOfUnit.length != 1) {
            throw new Error("There must be exactly one region with that unit");
        }

        if(regionOfUnit[0].units.size == 1) {
            return false;
        }

        if (this.props.gameClient.doesControlHouse(this.house)) {
            return _.difference(this.props.gameState.game.world.getUnitsOfHouse(this.house), _.flatMap(this.unitsToRemove.map((_, u) => u))).includes(unit);
        }

        return false;
    }

    confirm(): void {
        this.props.gameState.reconcileArmies(this.unitsToRemove);
        this.reset();
    }

    reset(): void {
        this.unitsToRemove = new BetterMap();
    }

    componentDidMount(): void {
        this.props.mapControls.onUnitClick.push(this.unitClickListener = (r: Region, u: Unit) => this.onUnitClick(r, u));
        this.props.mapControls.shouldHighlightUnit.push(this.shouldHighlightUnitListener = (r: Region, u: Unit) => this.shouldHighlightUnit(r, u));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onRegionClick, this.unitClickListener);
        _.pull(this.props.mapControls.shouldHighlightUnit, this.shouldHighlightUnitListener);
    }
}
