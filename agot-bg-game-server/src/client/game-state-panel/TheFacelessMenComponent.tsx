import { Component, ReactNode } from "react";
import React from "react";
import BetterMap from "../../utils/BetterMap";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { observable } from "mobx";
import Row from "react-bootstrap/Row";
import { UnitOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import TheFacelessMenGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/the-faceless-men-game-state/TheFacelessMenGameState";

@observer
export default class TheFacelessMenComponent extends Component<GameStateComponentProps<TheFacelessMenGameState>> {
    @observable unitsToRemove: BetterMap<Region, Unit> = new BetterMap();

    modifyUnitsOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    get selectedUnits(): Unit[] {
        return this.unitsToRemove.values;
    }

    get selectableUnits(): Unit[] {
        const selected = this.selectedUnits;
        if (selected.length == 0) {
            return this.props.gameState.availableUnits;
        } else if (selected.length == 1) {
            return _.concat(this.props.gameState.availableUnits.filter(u => u.region != selected[0].region && u.type != selected[0].type), selected);
        }
        else {
            return selected;
        }
    }

    render(): ReactNode {
        return (
            this.props.gameClient.doesControlHouse(this.house) ? (
                <>
                    <Col xs={12} className="mt-3">
                        {this.unitsToRemove.entries.map(([region, unit]) => (
                            <Row key={region.id} className="justify-content-center" style={{ paddingBottom: 10 }}>
                                <div><b>{unit.type.name} <small>of {unit.allegiance.name}</small></b> in <b>{region.name}</b></div>
                            </Row>
                        ))}
                        <Row className="justify-content-center mt-3">
                            <Col xs="auto">
                                <Button variant="success" onClick={() => this.confirm()}>Confirm</Button>
                            </Col>
                            <Col xs="auto">
                                <Button variant="danger" disabled={this.unitsToRemove.size == 0} onClick={() => this.reset()}>Reset</Button>
                            </Col>
                        </Row>
                    </Col>
                </>
            ) : (
                <Col xs={12} className="text-center">Waiting for {this.house.name}...</Col>
            )
        );
    }

    onUnitClick(unit: Unit): void {
        if (this.unitsToRemove.has(unit.region)) {
            this.unitsToRemove.delete(unit.region);
            return;
        }

        this.unitsToRemove.set(unit.region, unit);
    }

    confirm(): void {
        if (this.unitsToRemove.size < 2 && !window.confirm("You haven't selected all the targets yet. Are you sure you want to continue?")) {
            return;
        }
        this.props.gameState.sendSelectUnits(this.unitsToRemove.entries);
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
