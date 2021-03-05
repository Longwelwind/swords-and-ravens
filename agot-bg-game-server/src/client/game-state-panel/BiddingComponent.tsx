import {observer} from "mobx-react";
import BiddingGameState, {BiddingGameStateParent} from "../../common/ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import {Component, ReactNode} from "react";
import * as React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Player from "../../common/ingame-game-state/Player";

@observer
export default class BiddingComponent<ParentGameState extends BiddingGameStateParent> extends Component<GameStateComponentProps<BiddingGameState<ParentGameState>>> {
    get gameState(): BiddingGameState<ParentGameState> {
        return this.props.gameState;
    }

    get authenticatedPlayer(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    get powerTokensToBid(): number {
        return this.gameState.powerTokensToBid;
    }

    get biddenPowerTokens(): number {
        return this.authenticatedPlayer
            ? this.gameState.bids.tryGet(this.authenticatedPlayer.house, -1)
            : -1;
    }

    get dirty(): boolean {
        return this.powerTokensToBid != this.biddenPowerTokens;
    }

    constructor(props: GameStateComponentProps<BiddingGameState<ParentGameState>>) {
        super(props);

        this.gameState.powerTokensToBid = Math.max(this.biddenPowerTokens, 0);
    }

    render(): ReactNode {
        return (
            <>
                {this.authenticatedPlayer && this.gameState.participatingHouses.includes(this.authenticatedPlayer.house) && (
                    <>
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <input
                                        type="range"
                                        className="custom-range"
                                        min={0}
                                        max={this.authenticatedPlayer.house.powerTokens}
                                        value={this.powerTokensToBid}
                                        onChange={e => {
                                            this.gameState.powerTokensToBid = parseInt(e.target.value);
                                        }}
                                        disabled={this.authenticatedPlayer.house.powerTokens==0}
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
                            <Button
                                onClick={() => this.bid(this.powerTokensToBid)}
                                disabled={!this.dirty}
                            >
                                Confirm
                            </Button>
                        </Col>
                    </>
                )}
                <Col xs={12} className="text-center">
                    Waiting for {this.gameState.getHousesLeftToBid().map(h => h.name).join(", ")}
                </Col>
            </>
        );
    }

    bid(powerTokens: number): void {
        this.gameState.bid(powerTokens);
    }
}
