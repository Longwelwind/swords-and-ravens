import {Component, ReactNode} from "react";
import {observer} from "mobx-react";
import ResolveTiesGameState
    from "../../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/resolve-ties-game-state/ResolveTiesGameState";
import React from "react";
import {observable} from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import {faAngleLeft} from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import {faAngleRight} from "@fortawesome/free-solid-svg-icons/faAngleRight";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import SimpleInfluenceIconComponent from "./utils/SimpleInfluenceIconComponent";
import HouseNumberResultsComponent from "../HouseNumberResultsComponent";

@observer
export default class ResolveTiesComponent extends Component<GameStateComponentProps<ResolveTiesGameState>> {
    @observable currentOrdering: House[];

    constructor(props: GameStateComponentProps<ResolveTiesGameState>) {
        super(props);

        this.currentOrdering = _.flatten(props.gameState.bidResults.map(([_bid, houses]) => houses));
    }

    render(): ReactNode {
        const results = _.flatMap(this.props.gameState.bidResults.map(([bid, houses]) => houses.map(h => [h, bid] as [House, number])));
        return (
            <>
                <Col xs={12} className="text-center">
                    The holder of the Iron Throne can resolve the ties of the bidding.
                </Col>
                {this.props.gameClient.doesControlHouse(this.props.gameState.decider) ? (
                    <>
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                {this.currentOrdering.map((h, i) => (
                                    <Col xs="auto" key={h.id} className="d-flex flex-md-column align-items-center">
                                        <div className="mb-2">
                                            <SimpleInfluenceIconComponent house={h}/>
                                        </div>
                                        <div className="text-center" style={{fontSize: "18px", marginBottom: "5px"}}>{this.props.gameState.getBidOfHouse(h)}</div>
                                        <div className="btn-group btn-group-xs">
                                            <button
                                                className="btn btn-primary"
                                                style={{visibility: this.displayArrow(i, -1) ? "initial": "hidden"}}
                                                onClick={() => this.changeOrder(i, -1)}
                                            >
                                                <FontAwesomeIcon icon={faAngleLeft}/>
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                style={{visibility: this.displayArrow(i, 1) ? "initial": "hidden"}}
                                                onClick={() => this.changeOrder(i, 1)}
                                            >
                                                <FontAwesomeIcon icon={faAngleRight}/>
                                            </button>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                        <Col xs={12}>
                            <Button onClick={() => this.submit()}>Resolve</Button>
                        </Col>
                    </>
                ) : <>
                    <Col xs={12}>
                        <p>Bidding results:</p>
                        <HouseNumberResultsComponent results={results} key="cok"/>
                    </Col>
                    <Col xs={12} className="text-center">Waiting for {this.props.gameState.decider.name}...</Col>
                </>}
            </>
        );
    }

    displayArrow(spot: number, direction: number): boolean {
        return this.props.gameState.getTiesToResolve().some(({trackerPlace, houses}) => {
            if (direction == 1) {
                return trackerPlace <= spot && spot + 1 < trackerPlace + houses.length ;
            } else if (direction == -1) {
                return trackerPlace <= spot - 1 && spot < trackerPlace + houses.length;
            }

            return false;
        });
    }

    changeOrder(spot: number, direction: number): void {
        // Swap the element of this.currentOrdering at index [spot] and [spot + direction]
        this.currentOrdering[spot] = this.currentOrdering.splice(spot + direction, 1, this.currentOrdering[spot])[0];
    }

    submit(): void {
        const resolvedTies = this.props.gameState.getTiesToResolve().map(({trackerPlace, houses}) =>
            this.currentOrdering.slice(trackerPlace, trackerPlace + houses.length)
        );

        this.props.gameState.resolveTies(resolvedTies);
    }
}
