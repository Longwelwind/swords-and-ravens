import { Component, ReactElement, ReactNode } from "react";
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
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import ConditionalWrap from "./utils/ConditionalWrap";
import getUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";
import { observer } from "mobx-react";

interface VoteComponentProps {
    vote: Vote;
    ingame: IngameGameState;
    gameClient: GameClient;
}

@observer
export default class VoteComponent extends Component<VoteComponentProps> {
    get vote(): Vote {
        return this.props.vote;
    }

    render(): ReactNode {
        const state = this.vote.state;
        const {result: canVote, reason } = this.props.vote.canVote;
        const disabled = !canVote;

        return (
            <Row key={this.vote.id} className="flex-row">
                <Col xs={"auto"}>
                    <OverlayTrigger
                        placement="auto"
                        overlay={<Tooltip id={"vote-date-" + this.vote.id}>{this.vote.createdAt.toLocaleString()}</Tooltip>}
                        popperConfig={{ modifiers: [preventOverflow] }}
                    >
                        <div>
                            <img src={voteImage} width={32} />
                            {this.vote.state == VoteState.ACCEPTED
                                ? <FontAwesomeIcon className="text-success" icon={faCheck} size="2x" style={{position: "absolute", top: 8, left: 8}} />
                                : this.vote.state == VoteState.REFUSED
                                    ? <FontAwesomeIcon className="text-danger" icon={faBan} size="2x" style={{position: "absolute", top: 8, left: 8}} />
                                    : this.vote.state == VoteState.CANCELLED
                                        ? <FontAwesomeIcon className="text-warning" icon={faXmark} size="2x" style={{position: "absolute", top: 8, left: 12}} />
                                        : <></>}
                        </div>
                    </OverlayTrigger>
                </Col>
                <Col>
                    <b>{getUserLinkOrLabel(this.vote.ingame.entireGame, this.vote.initiator, this.vote.ingame.players.tryGet(this.vote.initiator, null))}</b> initiated a vote to <b>{this.vote.type.verb()}</b>. {this.vote.positiveCountToPass} player{this.vote.positiveCountToPass != 1 ? "s" : ""} must accept to pass the vote.
                    <Row className="mt-1">
                        <Col xs="auto" className={classNames({ "display-none": state != VoteState.ONGOING || this.props.gameClient.authenticatedPlayer == null })}>
                            <Button className="mb-1" variant="success" size="sm" style={{ minWidth: "60px" }} disabled={disabled} onClick={() => this.vote.vote(true)}>{this.wrapVoteButtons(<>Accept</>, disabled, reason)}</Button><br />
                            <Button variant="danger" size="sm" style={{ minWidth: "60px" }} disabled={disabled} onClick={() => this.vote.vote(false)}>{this.wrapVoteButtons(<>Refuse</>, disabled, reason)}</Button>
                        </Col>
                        <Col>
                            <Row>
                                {this.vote.participatingHouses.map(h => (
                                    <Col xs={"auto"} key={`vote-${this.vote.id}-${h.id}`}>
                                        <div className="mb-2">
                                            <HouseIconComponent house={h} />
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

    wrapVoteButtons(button: ReactElement, disabled: boolean, reason: string): ReactNode {
        return <ConditionalWrap
            condition={disabled}
            wrap={children =>
                <OverlayTrigger
                    overlay={
                        <Tooltip id="voting-currently-disabled">
                            {reason == "ongoing-combat" ?
                                "You cannot vote during combat phase"
                                : reason == "ongoing-claim-vassals" ?
                                "You cannot vote during claim vassals phase"
                                : reason == "ongoing-bidding" ?
                                "You cannot vote during bidding phase"
                                : reason == "secret-orders-placed" ?
                                "You cannot vote because the houses to be swapped have already placed orders"
                                : "Voting is currently not possible"
                            }
                        </Tooltip>
                    }
                    placement="auto"
                >
                    {children}
                </OverlayTrigger>
            }
        >
            <span>{button}</span>
        </ConditionalWrap>
    }
}