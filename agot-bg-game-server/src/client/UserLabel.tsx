import { Component, ReactNode } from "react";
import User from "../server/User";
import React from "react";
import { observer } from "mobx-react";
import {faWifi} from "@fortawesome/free-solid-svg-icons/faWifi";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import GameClient from "./GameClient";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import { Dropdown, Nav, Navbar, NavDropdown } from "react-bootstrap";
import Player from "../common/ingame-game-state/Player";
import ConditionalWrap from "./utils/ConditionalWrap";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import clonesImage from "../../public/images/icons/clones.svg"

interface UserLabelProps {
    gameClient: GameClient;
    gameState: IngameGameState | LobbyGameState;
    user: User;
}


@observer
export default class UserLabel extends Component<UserLabelProps> {
    get user(): User {
        return this.props.user;
    }

    get player(): Player {
        if (!(this.props.gameState instanceof IngameGameState)) {
            throw new Error("`player` called when the game was not in IngameGameState");
        }

        return this.props.gameState.players.get(this.user);
    }

    render(): ReactNode {
        const isOwner = this.props.gameState.entireGame.isOwner(this.user);
        return (
            <Navbar variant="dark" className="no-space-around">
                <Navbar.Brand className="no-space-around">
                    <small>
                        {isOwner &&
                                <><OverlayTrigger overlay={<Tooltip id={`${this.user.id}-owner-tooltip`}>Owner</Tooltip>}>
                                    <FontAwesomeIcon icon={faUser}/>
                                </OverlayTrigger>&nbsp;&nbsp;</>}
                        <OverlayTrigger overlay={<Tooltip id={`${this.user.id}-connection-tooltip`}>{this.user.connected ? "Connected" : "Disconnected"}</Tooltip>}>
                            <FontAwesomeIcon icon={faWifi} className={this.user.connected ? "text-success" : "text-danger"} />
                        </OverlayTrigger>
                        {this.user.otherUsersFromSameNetwork.length > 0 && <OverlayTrigger placement="auto" overlay={this.renderOtherUsersFromSameNetworkTooltip()}>
                            <img src={clonesImage} width="18" style={{marginLeft: 5, marginTop: -3}}/>
                        </OverlayTrigger>}
                    </small>
                </Navbar.Brand>
                <Navbar.Collapse id={`navbar-${this.user.id}`} className="no-space-around">
                    <Nav className="no-space-around">
                        <NavDropdown id={`nav-dropdown-${this.user.id}`} title={<span className="userlabel">{this.user.name}</span>} className="no-gutters">
                            <Dropdown.Item href={`/user/${this.user.id}`} target="_blank" rel="noopener noreferrer">See Profile</Dropdown.Item>
                            {this.props.gameState instanceof IngameGameState && this.renderIngameDropdownItems(this.props.gameState)}
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        );
    }

    renderOtherUsersFromSameNetworkTooltip(): OverlayChildren {
        return <Tooltip id={`${this.user.id}-other-users-with-same-ip-tooltip`}>
            These users {this.props.gameState instanceof IngameGameState ? "play" : "joined"} from the same network as {this.user.name}:
            <br/><br/>{this.user.otherUsersFromSameNetwork.map(usr => <div key={usr}>{usr}</div>)}
        </Tooltip>
    }

    renderIngameDropdownItems(ingame: IngameGameState): ReactNode {
        const {result: canLaunchReplacePlayerVote, reason: canLaunchReplacePlayerVoteReason} = ingame.canLaunchReplacePlayerVote(this.props.gameClient.authenticatedUser);
        const {result: canLaunchReplacePlayerByVassalVote, reason: canLaunchReplacePlayerByVassalVoteReason} = ingame.canLaunchReplacePlayerVote(this.props.gameClient.authenticatedUser, true, this.player.house);
        return (
            <>
                <NavDropdown.Divider />
                {/* Add a button to replace a place */}
                <ConditionalWrap
                    condition={!canLaunchReplacePlayerVote}
                    wrap={children =>
                        <OverlayTrigger
                            overlay={
                                <Tooltip id="replace-player-tooltip">
                                    {canLaunchReplacePlayerVoteReason == "already-playing" ?
                                        "You are already playing in this game"
                                        : canLaunchReplacePlayerVoteReason == "ongoing-vote" ?
                                        "A vote is already ongoing"
                                        : canLaunchReplacePlayerVoteReason == "game-cancelled" ?
                                        "The game has been cancelled"
                                        : canLaunchReplacePlayerVoteReason == "game-ended" ?
                                        "The game has ended"
                                        : "Vote not possible"
                                    }
                                </Tooltip>
                            }
                            placement="auto"
                        >
                            {children}
                        </OverlayTrigger>
                    }
                >
                    <div id="replace-player-tooltip-wrapper">
                        <NavDropdown.Item
                            onClick={() => this.onLaunchReplacePlayerVoteClick()}
                            disabled={!canLaunchReplacePlayerVote}
                        >
                            Offer to replace this player
                        </NavDropdown.Item>
                    </div>
                </ConditionalWrap>
                <NavDropdown.Divider />
                {/* Add a button to replace a place */}
                <ConditionalWrap
                    condition={!canLaunchReplacePlayerByVassalVote}
                    wrap={children =>
                        <OverlayTrigger
                            overlay={
                                <Tooltip id="replace-player-by-vassal-tooltip">
                                    {canLaunchReplacePlayerByVassalVoteReason == "ongoing-vote" ?
                                            "A vote is already ongoing"
                                        : canLaunchReplacePlayerByVassalVoteReason == "game-cancelled" ?
                                            "The game has been cancelled"
                                        : canLaunchReplacePlayerByVassalVoteReason == "game-ended" ?
                                            "The game has ended"
                                        : canLaunchReplacePlayerByVassalVoteReason == "only-players-can-vote" ?
                                            "Only players can vote"
                                        : canLaunchReplacePlayerByVassalVoteReason == "min-player-count-reached" ?
                                            "Minimum player count reached"
                                        : canLaunchReplacePlayerByVassalVoteReason == "targaryen-must-be-a-player-controlled-house" ?
                                            "Targaryen cannot be replaced by a vassal"
                                        : canLaunchReplacePlayerByVassalVoteReason == "ongoing-house-card-drafting" ?
                                            "During drafting houses cannot be replaced by vassals"
                                        : "Vote not possible"
                                    }
                                </Tooltip>
                            }
                            placement="auto"
                        >
                            {children}
                        </OverlayTrigger>
                    }
                >
                    <div id="replace-by-vassal-tooltip-wrapper">
                        <NavDropdown.Item
                            onClick={() => this.onLaunchReplacePlayerByVassalVoteClick()}
                            disabled={!canLaunchReplacePlayerByVassalVote}
                        >
                            Launch a vote to replace this player by a vassal
                        </NavDropdown.Item>
                    </div>
                </ConditionalWrap>
            </>
        );
    }

    onLaunchReplacePlayerVoteClick(): void {
        if (!(this.props.gameState instanceof IngameGameState)) {
            throw new Error("`launchReplacePlayerVote` called when the game was not in IngameGameState");
        }

        if (window.confirm(`Do you want to launch a vote to replace ${this.player.user.name} who controls house ${this.player.house.name}?`)) {
            this.props.gameState.launchReplacePlayerVote(this.player);
        }
    }

    onLaunchReplacePlayerByVassalVoteClick(): void {
        if (!(this.props.gameState instanceof IngameGameState)) {
            throw new Error("`launchReplacePlayerVote` called when the game was not in IngameGameState");
        }

        if (window.confirm(`Do you want to launch a vote to replace ${this.player.user.name} who controls house ${this.player.house.name} by a vassal?`)) {
            this.props.gameState.launchReplacePlayerByVassalVote(this.player);
        }
    }
}