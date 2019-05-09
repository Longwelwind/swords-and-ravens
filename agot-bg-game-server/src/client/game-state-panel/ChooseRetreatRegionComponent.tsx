import {observer} from "mobx-react";
import {Component} from "react";
import ChooseRetreatRegionGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-retreat-region-game-state/ChooseRetreatRegionGameState";
import React from "react";
import {observable} from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class ChooseRetreatRegionComponent extends Component<GameStateComponentProps<ChooseRetreatRegionGameState>> {
    @observable selectedRegion: Region | null;

    regionClickListener: any;
    highlightRegionListener: any;

    render() {
        return (
            <Row>
                <Col xs={12}>The defender must choose a region for its unit to retreat to</Col>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <>
                            Click on the region for your defending units to retreat to
                            {this.selectedRegion != null && (
                                <Button onClick={() => this.confirm()}>Confirm</Button>
                            )}
                        </>
                    ) : (
                        <div className="text-center">Waiting for {this.props.gameState.house.name}...</div>
                    )}
                </Col>
            </Row>
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
                return this.props.gameState.getValidRetreatRegions().includes(r);
            } else {
                return this.selectedRegion == r;
            }
        }

        return false;
    }

    private onRegionClick(r: Region) {
        if (!this.props.gameState.getValidRetreatRegions().includes(r)) {
            return;
        }

        if (this.selectedRegion == r) {
            this.selectedRegion = null;
        } else {
            this.selectedRegion = r;
        }
    }

    private confirm() {
        if (!this.selectedRegion) {
            return;
        }

        this.props.gameState.choose(this.selectedRegion);
    }
}
