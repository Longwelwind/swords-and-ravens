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

    onUnitClick(region: Region, unit: Unit): void {
        if (!this.props.gameClient.doesControlHouse(this.house)) {
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
