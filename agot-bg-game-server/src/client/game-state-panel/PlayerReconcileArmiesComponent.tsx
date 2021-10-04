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
import {UnitOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import { ListGroupItem } from "react-bootstrap";
import { union } from "lodash";

@observer
export default class PlayerReconcileArmiesComponent extends Component<GameStateComponentProps<PlayerReconcileArmiesGameState>> {
    @observable unitsToRemove: BetterMap<Region, Unit[]> = new BetterMap();

    modifyUnitsOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    get selectedUnits(): Unit[] {
        return _.flatMap(this.unitsToRemove.values);
    }

    get selectableUnits(): Unit[] {
        let result = this.selectedUnits;

        if (!this.enoughReconciled) {
            result = union(result, this.props.gameState.getAllArmyUnitsOfHouse(this.house));

            // Remove the last unit from an area from selectable units
            for (const region of this.unitsToRemove.keys) {
                const remainingUnits = _.difference(region.units.values, this.unitsToRemove.get(region));
                if (remainingUnits.length == 1) {
                    result = result.filter(u => u != remainingUnits[0]);
                }
            }
        }

        return result;
    }

    get enoughReconciled(): boolean {
        return this.props.gameState.isEnoughToReconcile(this.unitsToRemove);
    }

    get tooMuchReconciled(): boolean {
        return this.props.gameState.isTooMuchReconciled(this.unitsToRemove);
    }

    render(): ReactNode {
        const tooMuch = this.tooMuchReconciled;
        const notEnough = !this.enoughReconciled;
        return (
            <ListGroupItem className="px-2">
                <Row>
                    <Col xs={12} className="text-center">
                        <b>{this.props.gameState.house.name}</b> must reconcile their armies according to their supply limits.
                    </Col>
                    {this.props.gameClient.doesControlHouse(this.house) ? (
                        <>
                            <Col xs={12}>
                                {this.unitsToRemove.entries.map(([region, units]) => (
                                    <Row key={region.id} className="justify-content-center" style={{paddingBottom: 10}}>
                                        <div>{region.name}: {units.map(u => u.type.name).join(", ")}</div>
                                    </Row>
                                ))}
                                <Row className="justify-content-center">
                                    <Col xs="auto">
                                        <Button variant="success" disabled={notEnough || tooMuch} onClick={() => this.confirm()}>Confirm</Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button variant="danger" disabled={this.unitsToRemove.size == 0} onClick={() => this.reset()}>Reset</Button>
                                    </Col>
                                </Row>
                                {tooMuch && <Row className="mt-1 justify-content-center">You removed too much units!</Row>}
                            </Col>
                        </>
                    ) : (
                            <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
                        )}
                </Row>
            </ListGroupItem>
        );
    }

    onUnitClick(unit: Unit): void {
        // If there's no array for this region, add one
        if (!this.unitsToRemove.has(unit.region)) {
            this.unitsToRemove.set(unit.region, []);
        }

        if (!this.unitsToRemove.get(unit.region).includes(unit)) {
            // Add the clicked unit
            this.unitsToRemove.get(unit.region).push(unit);
        } else {
            // Remove the clicked unit
            _.pull(this.unitsToRemove.get(unit.region), unit);
        }

        // If the array for this region is now empty, remove it
        if (this.unitsToRemove.get(unit.region).length == 0) {
            this.unitsToRemove.delete(unit.region);
        }
    }

    confirm(): void {
        this.props.gameState.reconcileArmies(this.unitsToRemove);
        this.reset();
    }

    reset(): void {
        this.unitsToRemove = new BetterMap();
    }

    modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.house)) {
            const selected = this.selectedUnits;
            return this.selectableUnits.map(u => [
                u,
                {
                    highlight: { active: true, color: selected.includes(u) ? "red" : "white" },
                    onClick: () => {
                        this.onUnitClick(u);
                    }
                }
            ]);
        }

        return [];
    }

    componentDidMount(): void {
        this.props.mapControls.modifyUnitsOnMap.push(this.modifyUnitsOnMapCallback = () => this.modifyUnitsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyUnitsOnMap, this.modifyUnitsOnMapCallback);
    }
}
