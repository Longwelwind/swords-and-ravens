import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import React from "react";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";

@observer
export default class SelectRegionComponent extends Component<GameStateComponentProps<SelectRegionGameState<any>>> {
    @observable selectedRegion: Region | null;

    regionClickListener: any;
    highlightRegionListener: any;

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
                            <Button onClick={() => this.confirm()} disabled={this.selectedRegion == null}>
                                Confirm
                            </Button>
                        </>
                    ) : (
                        <div className="text-center">Waiting for {this.props.gameState.house.name}...</div>
                    )}
                </Col>
            </>
        );
    }

    componentDidMount(): void {
        this.props.mapControls.onRegionClick.push(this.regionClickListener = (r: Region) => this.onRegionClick(r));
        this.props.mapControls.shouldHighlightRegion.push(this.highlightRegionListener = (r: Region) => this.shouldHighlightRegion(r));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onRegionClick, this.regionClickListener);
        _.pull(this.props.mapControls.shouldHighlightRegion, this.highlightRegionListener);
    }

    shouldHighlightRegion(r: Region): boolean {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.selectedRegion == null) {
                return this.props.gameState.regions.includes(r);
            } else {
                return this.selectedRegion == r;
            }
        }

        return false;
    }

    private onRegionClick(r: Region): void {
        if (!this.props.gameState.regions.includes(r)) {
            return;
        }

        if (this.selectedRegion == r) {
            this.selectedRegion = null;
        } else {
            this.selectedRegion = r;
        }
    }

    private confirm(): void {
        if (!this.selectedRegion) {
            return;
        }

        this.props.gameState.select(this.selectedRegion);
    }
}
