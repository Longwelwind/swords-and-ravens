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
import Order from "../../common/ingame-game-state/game-data-structure/Order";
import _ from "lodash";

@observer
export default class SelectOrdersComponent extends Component<GameStateComponentProps<SelectOrdersGameState<ParentGameState>>> {
    @observable selectedRegions: Region[] = [];

    orderClickListener: any;
    shouldHighlightOrderListener: any;

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <Button onClick={() => this.reset()} variant="danger" disabled={this.selectedRegions.length == 0}>
                                    Reset
                                </Button>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.confirm()} disabled={this.selectedRegions.length != this.props.gameState.count}>
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

    reset(): void {
        this.selectedRegions = [];
    }

    confirm(): void {
        this.props.gameState.selectOrders(this.selectedRegions);
    }

    onOrderClick(region: Region, _order: Order): void {
        if (this.props.gameState.possibleRegions.includes(region) && !this.selectedRegions.includes(region)) {
            this.selectedRegions.push(region);
        }
    }

    shouldHighlightOrder(region: Region, _order: Order): boolean {
        if (this.selectedRegions.includes(region)) {
            return false;
        }

        return this.props.gameState.possibleRegions.includes(region);
    }

    componentDidMount(): void {
        this.props.mapControls.onOrderClick.push(this.orderClickListener = (r: Region, o: Order) => this.onOrderClick(r, o));
        this.props.mapControls.shouldHighlightOrder.push(this.shouldHighlightOrderListener= (r: Region, o: Order) => this.shouldHighlightOrder(r, o));
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.onOrderClick, this.orderClickListener);
        _.pull(this.props.mapControls.shouldHighlightOrder, this.shouldHighlightOrderListener);
    }
}
