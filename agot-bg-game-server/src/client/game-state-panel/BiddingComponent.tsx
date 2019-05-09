import {observer} from "mobx-react";
import BiddingGameState, {BiddingGameStateParent} from "../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import {Component} from "react";
import * as React from "react";
import {observable} from "mobx";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class BiddingComponent<ParentGameState extends BiddingGameStateParent> extends Component<GameStateComponentProps<BiddingGameState<ParentGameState>>> {
    @observable powerTokens = 0;

    render() {
        return (
            <>
                <p>
                    All houses of Westeros can bid a certain amount of power tokens
                </p>
                <p className="text-center">
                    {this.props.gameClient.authenticatedPlayer
                        && this.props.gameState.canBid(this.props.gameClient.authenticatedPlayer.house) ? (
                        <>
                            <Row className="justify-content-center">
                                <Col xs="auto" className="d-flex align-items-center">
                                    <input
                                        type="range"
                                        className="custom-range"
                                        min={0}
                                        max={this.props.gameClient.authenticatedPlayer.house.powerTokens}
                                        value={this.powerTokens}
                                        onChange={e => this.powerTokens = parseInt(e.target.value)}
                                    />
                                    <div style={{marginLeft: "10px"}}>
                                        {this.powerTokens}
                                    </div>
                                </Col>
                            </Row>
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <Button onClick={() => this.bid(this.powerTokens)}>Confirm</Button>
                                </Col>
                            </Row>
                        </>
                    ) : (
                        <>Waiting for {this.props.gameState.getHousesLeftToBid().map(h => h.name).join(", ")}...</>
                    )}
                </p>
            </>
        );
    }

    bid(powerTokens: number) {
        this.props.gameState.bid(powerTokens);
    }
}
