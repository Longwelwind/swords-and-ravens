import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import _ from "lodash";
import * as React from "react";
import {Row} from "react-bootstrap";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import BetterMap from "../../utils/BetterMap";
import {observable} from "mobx";
import {observer} from "mobx-react";
import {UnitOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";

@observer
export default class SelectUnitsComponent extends Component<GameStateComponentProps<SelectUnitsGameState<any>>> {
    @observable selectedUnits = new BetterMap<Region, Unit[]>();

    modifyUnitOnMapCallback: any;

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button onClick={() => this.reset()} variant="danger" disabled={this.countSelectedUnits() == 0}>
                                    Reset
                                </Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.confirm()} disabled={!this.props.gameState.selectedCountMatchesExpectedCount(this.selectedUnits.entries)}>
                                    Confirm
                                </Button>
                            </Col>
                        </Row>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name}...
                        </div>
                    )}
                </Col>
            </>
        );
    }

    countSelectedUnits(): number {
        return _.sum(this.selectedUnits.map((r, us) => us.length));
    }

    confirm(): void {
        if (this.selectedUnits.size == 0) {
            if (!window.confirm("You haven't selected any unit yet. Continue anyway?")) {
                return;
            }
        }

        this.props.gameState.selectUnits(this.selectedUnits);
        this.selectedUnits = new BetterMap();
    }

    getSelectableUnits(): Unit[] {
        if (this.countSelectedUnits() == this.props.gameState.count) {
            return [];
        }

        let result = _.difference(this.props.gameState.possibleUnits, _.flatMap(this.selectedUnits.map((_r, us) => us)));

        if (this.props.gameState.selectedUnitsMustBeOfSameRegion && this.selectedUnits.size > 0) {
            const selectedRegion = this.selectedUnits.entries[0][0];

            result = result.filter(u => u.region == selectedRegion);
        }

        return result;
    }

    modifyUnitOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            return this.getSelectableUnits().map(u => [
                u,
                {highlight: {active: true}, onClick: () => this.onUnitClick(u.region, u)}
            ] as [Unit, PartialRecursive<UnitOnMapProperties>]);
        }

        return [];
    }

    onUnitClick(region: Region, unit: Unit): void {
        if (this.getSelectableUnits().includes(unit)) {
            if (!this.selectedUnits.has(region)) {
                this.selectedUnits.set(region, []);
            }

            this.selectedUnits.get(region).push(unit);
        }
    }

    componentDidMount(): void {
        this.props.mapControls.modifyUnitsOnMap.push(this.modifyUnitOnMapCallback = () => this.modifyUnitOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyUnitsOnMap, this.modifyUnitOnMapCallback);
    }

    reset(): void {
        this.selectedUnits = new BetterMap<Region, Unit[]>();
    }
}
