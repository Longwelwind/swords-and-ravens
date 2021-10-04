import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import React from "react";
import { Button, Col, Row } from "react-bootstrap";
import Region from "../../../common/ingame-game-state/game-data-structure/Region";
import { observable } from "mobx";
import _ from "lodash";
import PartialRecursive from "../../../utils/PartialRecursive";
import { RegionOnMapProperties } from "../../MapControls";
import ResolveMoveLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/resolve-move-loyalty-token-game-state/ResolveMoveLoyaltyTokenGameState";

@observer
export default class ResolveMoveLoyaltyTokenComponent extends Component<GameStateComponentProps<ResolveMoveLoyaltyTokenGameState>> {
    @observable from: Region | null;
    @observable to: Region | null;

    modifyRegionsOnMapCallback: any;

    get gameState(): ResolveMoveLoyaltyTokenGameState {
        return this.props.gameState;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <p>House <b>{this.gameState.house.name}</b> must move a loyalty&nbsp;token to an adjacent land area.</p>
                </Col>
                <Col xs={12} className="mt-2">
                    {this.props.gameClient.doesControlHouse(this.gameState.house) ? (
                        <>
                            <p className="text-center">
                                Move a loyalty&nbsp;token from {this.from ? <><b>{this.from.name}</b> to </> : ""}{this.to ? <b>{this.to.name}</b> : ""}
                            </p>
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <Button variant="success" onClick={() => this.confirm()} disabled={this.from == null || this.to == null}>
                                        Confirm
                                    </Button>
                                </Col>
                                <Col xs="auto">
                                    <Button variant="danger" onClick={() => this.reset()} disabled={this.from == null && this.to == null}>
                                        Reset
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : (
                        <div className="text-center">Waiting for {this.gameState.house.name}...</div>
                    )}
                </Col>
            </>
        );
    }

    confirm(): void {
        if (this.from == null || this.to == null) {
            return;
        }

        this.gameState.sendMovePowerTokens(this.from, this.to);
    }

    reset(): void {
        if (this.from != null && this.to != null) {
            this.from.loyaltyTokens += 1;
            this.to.loyaltyTokens -= 1;
        }
        this.from = null;
        this.to = null;
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.from == null) {
                return this.props.gameState.parentGameState.validFromRegions.map(r => ([
                    r,
                    {highlight: {active: true}, onClick: () => this.onRegionClick(r)}
                ]));
            } else if (this.from != null && this.to == null) {
                return this.props.gameState.parentGameState.getValidTargetRegions(this.from).map(r => ([
                    r,
                    {highlight: {active: true}, onClick: () => this.onRegionClick(r)}
                ]));
            }
        }

        return [];
    }

    onRegionClick(region: Region): void {
        if (this.from == null) {
            this.from = region;
        } else if (this.from != null && this.to == null) {
            this.to = region;
            this.from.loyaltyTokens -= 1;
            this.to.loyaltyTokens += 1;
        }
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
    }
}
