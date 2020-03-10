import {observer} from "mobx-react";
import BiddingGameState, {BiddingGameStateParent} from "../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import {Component, ReactNode} from "react";
import * as React from "react";
import {observable} from "mobx";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

@observer
export default class BiddingComponent<ParentGameState extends BiddingGameStateParent> extends Component<GameStateComponentProps<BiddingGameState<ParentGameState>>> {
    @observable powerTokensToBid = 0;

    render(): ReactNode {
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
                                        value={this.powerTokensToBid}
                                        onChange={e => this.powerTokensToBid = parseInt(e.target.value)}
                                        disabled={this.props.gameClient.authenticatedPlayer.house.powerTokens==0}
                                    />
                                </Col>
                                <Col xs="auto">
                                    <div style={{marginLeft: "10px"}}>
                                        {this.powerTokensToBid}
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                        <Col xs={12} className="text-center">
                            <Button onClick={() => this.bid(this.powerTokensToBid)}>Confirm</Button>
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

    bid(powerTokens: number): void {
        this.props.gameState.bid(powerTokens);
        // Reset Power Tokens for next bidding.
        this.powerTokensToBid = 0;
    }
}
