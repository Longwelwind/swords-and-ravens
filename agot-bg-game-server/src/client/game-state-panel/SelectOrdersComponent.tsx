import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import {observer} from "mobx-react";
import SelectOrdersGameState, {ParentGameState} from "../../common/ingame-game-state/select-orders-game-state/SelectOrdersGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import {Row} from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import {observable} from "mobx";
import _ from "lodash";
import {OrderOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import joinReactNodes from "../utils/joinReactNodes";

@observer
export default class SelectOrdersComponent extends Component<GameStateComponentProps<SelectOrdersGameState<ParentGameState>>> {
    @observable selectedRegions: Region[] = [];

    modifyOrdersOnMapCallback: any;

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <>
                            {this.selectedRegions.length > 0 &&
                            <Row className="justify-content-center">
                                <p>Selected region{this.selectedRegions.length > 1 && "s"}: {joinReactNodes(this.selectedRegions.map(r => <b key={r.id}>{r.name}</b>), ', ')}</p>
                            </Row>}
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <Button onClick={() => this.confirm()} disabled={this.selectedRegions.length != this.props.gameState.count}>
                                        Confirm
                                    </Button>
                                </Col>
                                <Col xs="auto">
                                    <Button onClick={() => this.reset()} variant="danger" disabled={this.selectedRegions.length == 0}>
                                        Reset
                                    </Button>
                                </Col>
                            </Row>
                        </>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name}...
                        </div>
                    )}
                </Col>
            </>
        );
    }

    reset(): void {
        this.selectedRegions = [];
    }

    confirm(): void {
        this.props.gameState.selectOrders(this.selectedRegions);
    }

    onOrderClick(region: Region): void {
        if (!this.selectedRegions.includes(region)) {
            this.selectedRegions.push(region);
        } else {
            _.pull(this.selectedRegions, region);
        }
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.selectedRegions.length < this.props.gameState.count) {
                return this.props.gameState.possibleRegions.map(r => [
                    r,
                    {highlight: {active: true}, onClick: () => this.onOrderClick(r)}
                ]);
            }
        }

        return [];
    }

    componentDidMount(): void {
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }
}
