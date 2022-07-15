import {Component, ReactNode} from "react";
import {observer} from "mobx-react";
import DistributePowerTokensGameState from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/distribute-power-tokens-game-state/DistributePowerTokensGameState";
import React from "react";
import {observable} from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import HouseIconComponent from "./utils/HouseIconComponent";
import HouseNumberResultsComponent from "../HouseNumberResultsComponent";
import { faAngleDown, faAngleUp } from "@fortawesome/free-solid-svg-icons";
import BetterMap from "../../utils/BetterMap";

@observer
export default class ResolveTiesComponent extends Component<GameStateComponentProps<DistributePowerTokensGameState>> {
    currentBidResults: BetterMap<House, number>;
    @observable additionalPowerTokens: BetterMap<House, number> = new BetterMap();
    @observable availablePowerTokensForDistribution: number;

    constructor(props: GameStateComponentProps<DistributePowerTokensGameState>) {
        super(props);

        this.currentBidResults = this.props.gameState.bidsOfHouses;
        this.currentBidResults.delete(this.props.gameState.house);
        this.availablePowerTokensForDistribution = this.props.gameState.bidOfDistributor;
    }

    render(): ReactNode {
        const results = _.flatMap(this.props.gameState.bidResults.map(([bid, houses]) => houses.map(h => [h, bid] as [House, number])));
        return (
            <>
                <Col xs={12} className="text-center">
                    <b>{this.props.gameState.house.name}</b> can distribute their bid of {this.props.gameState.bidOfDistributor} to other houses.
                </Col>
                {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                    <>
                        <Col xs={12} className="text-center">Available Power tokens: {this.availablePowerTokensForDistribution}</Col>
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                {this.currentBidResults.entries.map(([h, bid]) => (
                                    <Col xs="auto" key={h.id} className="d-flex flex-md-column align-items-center">
                                        <div className="mb-2">
                                            <HouseIconComponent house={h}/>
                                        </div>
                                        <div className="text-center" style={{fontSize: "18px", marginBottom: "5px"}}>{bid + (this.additionalPowerTokens.has(h) ? this.additionalPowerTokens.get(h) : 0)}</div>
                                        <div className="btn-group btn-group-xs">
                                            <button
                                                className="btn btn-primary"
                                                style={{visibility: this.displayArrow(h, 1) ? "initial": "hidden"}}
                                                onClick={() => this.changeBid(h, 1)}
                                            >
                                                <FontAwesomeIcon icon={faAngleUp}/>
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                style={{visibility: this.displayArrow(h, -1) ? "initial": "hidden"}}
                                                onClick={() => this.changeBid(h, -1)}
                                            >
                                                <FontAwesomeIcon icon={faAngleDown}/>
                                            </button>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                            <Row className="justify-content-center mt-3">
                                <Col xs="auto">
                                    <Button variant="success" onClick={() => this.submit()}>Submit</Button>
                                </Col>
                            </Row>
                        </Col>
                    </>
                ) : <>
                    <Col xs={12}>
                        <p className="text-center">Bidding results:</p>
                        <div className="d-flex justify-content-center">
                            <HouseNumberResultsComponent results={results} keyPrefix="cok"/>
                        </div>
                    </Col>
                    <Col xs={12} className="text-center">Waiting for {this.props.gameState.house.name}...</Col>
                </>}
            </>
        );
    }

    displayArrow(house: House, direction: number): boolean {
        if (direction == 1 && this.availablePowerTokensForDistribution > 0) {
            return true;
        }

        if (direction == -1 && this.additionalPowerTokens.has(house) && this.additionalPowerTokens.get(house) > 0) {
            return true;
        }

        return false;
    }

    changeBid(house: House, powerTokens: number): void {
        if (!this.additionalPowerTokens.has(house)) {
            this.additionalPowerTokens.set(house, 0);
        }

        this.additionalPowerTokens.set(house, this.additionalPowerTokens.get(house) + powerTokens);
        this.availablePowerTokensForDistribution += -powerTokens;

        if (this.additionalPowerTokens.get(house) <= 0) {
            this.additionalPowerTokens.delete(house);
        }
    }

    submit(): void {
        this.props.gameState.distributePowerTokens(this.additionalPowerTokens.entries);
    }
}
