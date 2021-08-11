import { Component, ReactNode } from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import GameClient from "./GameClient";
import Vote, { VoteState } from "../common/ingame-game-state/vote-system/Vote";
import React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";
import voteImage from "../../public/images/icons/vote.svg";
import Button from "react-bootstrap/Button";
import {faCheck} from "@fortawesome/free-solid-svg-icons/faCheck";
import {faBan} from "@fortawesome/free-solid-svg-icons/faBan";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";

interface VoteComponentProps {
    vote: Vote;
    ingame: IngameGameState;
    gameClient: GameClient;
}

export default class VoteComponent extends Component<VoteComponentProps> {
    get vote(): Vote {
        return this.props.vote;
    }

    render(): ReactNode {
        const state = this.vote.state;

        return (
            <Row key={this.vote.id} className="flex-row">
                <Col xs={"auto"}>
                    <img src={voteImage} width={32}/>
                </Col>
                <Col>
                    <b>{this.vote.initiator.name}</b> initiated a vote to <b>{this.vote.type.verb()}</b>. <b>{this.vote.positiveCountToPass} players must accept to pass the vote.</b>
                    <Row className="mt-1">
                        <Col xs="auto" className={classNames({"display-none": state != VoteState.ONGOING || this.props.gameClient.authenticatedPlayer == null})}>
                            <Button className="mb-1" variant="success" size="sm" onClick={() => this.vote.vote(true)}>Accept</Button><br/>
                            <Button variant="danger" size="sm" onClick={() => this.vote.vote(false)}>Refuse</Button>
                        </Col>
                        <Col>
                            <Row>
                                {this.vote.participatingHouses.map(h => (
                                    <Col xs={"auto"} key={`vote-${this.vote.id}-${h.id}`}>
                                        <div className="mb-2">
                                            <SimpleInfluenceIconComponent house={h}/>
                                        </div>
                                        <div className="text-center">
                                            {this.vote.votes.has(h) ? (
                                                this.vote.votes.get(h) ? (
                                                    <FontAwesomeIcon className="text-success" icon={faCheck} />
                                                ) : (
                                                    <FontAwesomeIcon className="text-danger" icon={faBan} />
                                                )
                                            ) : (
                                                state == VoteState.ONGOING && (
                                                    <Spinner animation="border" variant="info" size="sm" />
                                                )
                                            )}
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                    </Row>
                </Col>
            </Row>
        );
    }
}