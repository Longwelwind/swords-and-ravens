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
                {this.props.gameClient.authenticatedPlayer
                    && this.props.gameState.canBid(this.props.gameClient.authenticatedPlayer.house) ? (
                    <>
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <input
                                        type="range"
                                        className="custom-range"
                                        min={0}
                                        max={this.props.gameClient.authenticatedPlayer.house.powerTokens}
                                        value={this.powerTokens}
                                        onChange={e => this.powerTokens = parseInt(e.target.value)}
                                    />
                                </Col>
                                <Col xs="auto">
                                    <div style={{marginLeft: "10px"}}>
                                        {this.powerTokens}
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                        <Col xs={12} className="text-center">
                            <Button onClick={() => this.bid(this.powerTokens)}>Confirm</Button>
                        </Col>
                    </>
                ) : (
                    <Col xs={12} className="text-center">
                        Waiting for {this.props.gameState.getHousesLeftToBid().map(h => h.name).join(", ")}
                    </Col>
                )}
            </>
        );
    }

    bid(powerTokens: number) {
        this.props.gameState.bid(powerTokens);
    }
}
