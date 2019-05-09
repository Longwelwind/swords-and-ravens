import PlayerReconcileArmiesGameState
    from "../../common/ingame-game-state/westeros-game-state/reconcile-armies-game-state/player-reconcile-armies-game-state/PlayerReconcileArmiesGameState";
import {Component} from "react";
import React from "react";
import BetterMap from "../../utils/BetterMap";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import {observer} from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";

@observer
export default class PlayerReconcileArmiesComponent extends Component<GameStateComponentProps<PlayerReconcileArmiesGameState>> {
    unitsToRemove: BetterMap<Region, Unit[]> = new BetterMap();
    unitClickListener: any;

    render() {
        return (
            <>
                <div>
                    Players need to reconcile their armies according to the supply track.
                </div>
                <div>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <>
                            {this.unitsToRemove.entries.map(([region, units]) => (
                                <div>{region.name}: {units.map(u => u.type.name).join(", ")}</div>
                            ))}
                            <Button disabled={!this.props.gameState.isEnoughToReconcile(this.unitsToRemove)} onClick={() => this.confirm()}>Confirm</Button>
                            <Button disabled={this.unitsToRemove.size != 0} onClick={() => this.reset()}>Reset</Button>
                        </>
                    ) : (
                        <>Waiting for {this.props.gameState.house.name}...</>
                    )}
                </div>
            </>
        );
    }

    onUnitClick(region: Region, unit: Unit) {
        if (region.getController() != this.props.gameState.house) {
            return;
        }
    }

    confirm() {
        this.props.gameState.reconcileArmies(this.unitsToRemove);
    }

    reset() {
        this.unitsToRemove = new BetterMap();
    }

    componentDidMount(): void {
        this.props.mapControls.onUnitClick.push(this.unitClickListener = (r: Region, u: Unit) => this.onUnitClick(r, u));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onRegionClick, this.unitClickListener);
    }
}
