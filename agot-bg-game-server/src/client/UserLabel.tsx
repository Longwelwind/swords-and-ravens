import { Component, ReactNode, FunctionComponent } from "react";
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
import {faCaretDown} from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { Dropdown } from "react-bootstrap";
import Player from "../common/ingame-game-state/Player";
import ConditionalWrap from "./utils/ConditionalWrap";

interface UserLabelProps {
    gameClient: GameClient;
    gameState: IngameGameState | LobbyGameState;
    user: User;
}

// eslint-disable-next-line react/display-name
const DropdownContainer: FunctionComponent<{onClick: (e: any) => void}> = React.forwardRef(
    // eslint-disable-next-line react/prop-types
    ({children, onClick}) => <a className="text-body" href="" onClick={e => {e.preventDefault(); onClick(e)}}>
        {children}
    </a>
);

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
        return (
            <Dropdown>
                <Dropdown.Toggle as={DropdownContainer} id={"dropdown-" + this.props.user.id}>
                    <div className="small">
                        <OverlayTrigger overlay={<Tooltip id ={`${this.user.id}-connected`}>{this.user.connected ? "Connected" : "Disconnected"}</Tooltip>}>
                            <FontAwesomeIcon icon={faWifi} className={this.user.connected ? "text-success" : "text-danger"} />
                        </OverlayTrigger>
                        {" "}
                        {this.user.name}
                        {" "}
                        <FontAwesomeIcon icon={faCaretDown} />
                    </div>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item href={`/user/${this.user.id}`} target="_blank" rel="noopener noreferrer">See Profile</Dropdown.Item>
                    {this.props.gameState instanceof IngameGameState && this.renderIngameDropdownItems(this.props.gameState)}
                </Dropdown.Menu>
            </Dropdown>
        );
    }

    renderIngameDropdownItems(ingame: IngameGameState): ReactNode {
        const {result: canLaunchReplacePlayerVote, reason: canLaunchReplacePlayerVoteReason} = ingame.canLaunchReplacePlayerVote(this.props.gameClient.authenticatedUser as User, this.player);
        return (
            <>
                <Dropdown.Divider />
                {/* Add a button to replace a place */}
                <ConditionalWrap
                    condition={!canLaunchReplacePlayerVote}
                    wrap={children =>
                        <OverlayTrigger
                            overlay={
                                <Tooltip id="replace-player-tooltip">
                                    {canLaunchReplacePlayerVoteReason == "already-playing" ?
                                        <>You are already playing in this game</>
                                        : canLaunchReplacePlayerVoteReason == "ongoing-vote" ?
                                        <>A vote is already ongoing</>
                                        : canLaunchReplacePlayerVoteReason == "game-cancelled" ?
                                        <>The game has been cancelled</>
                                        : canLaunchReplacePlayerVoteReason == "game-ended" &&
                                        <>The game has ended</>
                                    }
                                </Tooltip>
                            }
                        >
                            {children}
                        </OverlayTrigger>
                    }
                >
                    <Dropdown.Item
                        onClick={() => this.onLaunchReplacePlayerVoteClick()}
                        disabled={!canLaunchReplacePlayerVote}
                    >
                        Offer to replace this player
                    </Dropdown.Item>
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
}