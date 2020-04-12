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
    @observable dirty: boolean;

    constructor(props: GameStateComponentProps<BiddingGameState<ParentGameState>>) {
        super(props);

        const authenticatedPlayer = this.props.gameClient.authenticatedPlayer;

        this.powerTokensToBid = authenticatedPlayer
            ? this.props.gameState.hasBid(authenticatedPlayer.house)
                ? this.props.gameState.bids.get(authenticatedPlayer.house)
                : 0
            : 0;
        this.dirty = authenticatedPlayer
            ? this.props.gameState.hasBid(authenticatedPlayer.house)
                ? false
                : true
            :  false;
    }

    render(): ReactNode {
        return (
            <>
                {this.props.gameClient.authenticatedPlayer && this.props.gameState.participatingHouses.includes(this.props.gameClient.authenticatedPlayer.house) && (
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
                                        onChange={e => this.changePowerTokensToBid(parseInt(e.target.value))}
                                        disabled={!this.dirty && this.props.gameClient.authenticatedPlayer.house.powerTokens==0}
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
                    Waiting for {this.props.gameState.getHousesLeftToBid().map(h => h.name).join(", ")}
                </Col>
            </>
        );
    }

    changePowerTokensToBid(count: number): void {
        this.powerTokensToBid = count;
        this.dirty = true;
    }

    bid(powerTokens: number): void {
        this.props.gameState.bid(powerTokens);
        this.dirty = false;
    }
}
