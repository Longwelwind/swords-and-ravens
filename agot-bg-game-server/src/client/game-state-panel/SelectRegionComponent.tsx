import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import { Row, Col, Button } from "react-bootstrap";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import {RegionOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";

@observer
export default class SelectRegionComponent extends Component<GameStateComponentProps<SelectRegionGameState<any>>> {
    @observable selectedRegion: Region | null;

    modifyRegionsOnMapCallback: any;

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <>
                            {this.selectedRegion && (
                                <p className="text-center">
                                    Selected region: {this.selectedRegion.name}
                                </p>
                            )}
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <Button onClick={() => this.confirm()} disabled={this.selectedRegion == null}>
                                        Confirm
                                    </Button>
                                </Col>
                                <Col xs="auto">
                                    <Button onClick={() => this.reset()} disabled={this.selectedRegion == null}>
                                        Reset
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : (
                        <div className="text-center">Waiting for {this.props.gameState.house.name}...</div>
                    )}
                </Col>
            </>
        );
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.selectedRegion == null) {
                return this.props.gameState.regions.map(r => ([
                    r,
                    {highlight: {active: true}, onClick: () => this.onRegionClick(r)}
                ]));
            } else {
                return [[
                    this.selectedRegion,
                    {highlight: {active: true}, onClick: () => this.onRegionClick(this.selectedRegion as Region)}
                ]];
            }
        }

        return [];
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
    }

    private reset(): void {
        this.selectedRegion = null;
    }

    private onRegionClick(r: Region): void {
        if (this.selectedRegion == r) {
            this.reset();
        } else {
            this.selectedRegion = r;
        }
    }

    private confirm(): void {
        if (!this.selectedRegion) {
            return;
        }

        this.props.gameState.select(this.selectedRegion);
        this.reset();
    }
}
