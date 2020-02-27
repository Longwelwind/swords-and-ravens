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

@observer
export default class PlayerReconcileArmiesComponent extends Component<GameStateComponentProps<PlayerReconcileArmiesGameState>> {
    @observable unitsToRemove: BetterMap<Region, Unit[]> = new BetterMap();

    modifyUnitsOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <strong>{this.props.gameState.house.name}</strong> must reconcile their armies according to their supply limits.
                </Col>
                {this.props.gameClient.doesControlHouse(this.house) ? (
                    <>
                        <Col xs={12}>
                            {this.unitsToRemove.entries.map(([region, units]) => (
                                <div key={region.id}>{region.name}: {units.map(u => u.type.name).join(", ")}</div>
                            ))}
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <Button disabled={!this.props.gameState.isEnoughToReconcile(this.unitsToRemove)} onClick={() => this.confirm()}>Confirm</Button>
                                </Col>
                                <Col xs="auto">
                                    <Button disabled={this.unitsToRemove.size == 0} onClick={() => this.reset()}>Reset</Button>
                                </Col>
                            </Row>
                        </Col>
                    </>
                ) : (
                    <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
                )}
            </>
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
            return this.props.gameState.game.world.getUnitsOfHouse(this.house).map(u => [
                u,
                {
                    highlight: {active: !_.flatMap(this.unitsToRemove.map((_, us) => us)).includes(u)},
                    onClick: () => this.onUnitClick(u)
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
