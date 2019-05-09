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

@observer
export default class SelectUnitsComponent extends Component<GameStateComponentProps<SelectUnitsGameState>> {
    @observable selectedUnits = new BetterMap<Region, Unit[]>();

    unitClickListener: any;
    shouldHighlightUnitListener: any;

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
                                <Button onClick={() => this.confirm()} disabled={this.countSelectedUnits() != this.props.gameState.count}>
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
        this.props.gameState.selectUnits(this.selectedUnits);
    }

    onUnitClick(region: Region, unit: Unit): void {
        if (this.getSelectableUnits().includes(unit)) {
            if (!this.selectedUnits.has(region)) {
                this.selectedUnits.set(region, []);
            }

            this.selectedUnits.get(region).push(unit);
        }
    }

    shouldHighlightUnit(region: Region, unit: Unit): boolean {
        return this.getSelectableUnits().includes(unit);
    }

    getSelectableUnits(): Unit[] {
        if (this.countSelectedUnits() == this.props.gameState.count) {
            return [];
        }

        return _.difference(this.props.gameState.possibleUnits, _.flatMap(this.selectedUnits.map((_r, us) => us)));
    }

    componentDidMount(): void {
        this.props.mapControls.onUnitClick.push(this.unitClickListener = (r: Region, u: Unit) => this.onUnitClick(r, u));
        this.props.mapControls.shouldHighlightUnit.push(this.shouldHighlightUnitListener = (r: Region, u: Unit) => this.shouldHighlightUnit(r, u));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onUnitClick, this.unitClickListener);
        _.pull(this.props.mapControls.shouldHighlightUnit, this.shouldHighlightUnitListener);
    }

    reset(): void {
        this.selectedUnits = new BetterMap<Region, Unit[]>();
    }
}
