import { Component, ReactNode } from "react";
import User from "../server/User";
import React from "react";
import { observer } from "mobx-react";
import { faWifi } from "@fortawesome/free-solid-svg-icons/faWifi";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import GameClient from "./GameClient";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Nav, Navbar, NavDropdown } from "react-bootstrap";
import Player from "../common/ingame-game-state/Player";
import ConditionalWrap from "./utils/ConditionalWrap";
import { faUserGear } from "@fortawesome/free-solid-svg-icons";
import clonesImage from "../../public/images/icons/clones.svg";
import getElapsedSeconds from "../utils/getElapsedSeconds";
import { secondsToString } from "./utils/secondsToString";
import classNames from "classnames";

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

  get ingame(): IngameGameState | null {
    if (this.props.gameState instanceof IngameGameState) {
      return this.props.gameState;
    }
    return null;
  }

  get player(): Player | null {
    if (!this.ingame) {
      return null;
    }

    return this.ingame.players.get(this.user);
  }

  render(): ReactNode {
    const canActAsOwner =
      this.props.gameState.entireGame.canActAsOwner(this.user) &&
      !this.props.gameState.entireGame.gameSettings.faceless;
    const isRealOwner = this.props.gameState.entireGame.isRealOwner(this.user);

    return (
      <Navbar variant="dark" className="no-space-around pr-0">
        <Navbar.Brand className="no-space-around">
          <small>
            {canActAsOwner && (
              <>
                <OverlayTrigger
                  overlay={
                    <Tooltip id={`${this.user.id}-owner-tooltip`}>
                      Game host{!isRealOwner ? " deputy" : ""}
                    </Tooltip>
                  }
                >
                  <FontAwesomeIcon icon={faUserGear} />
                </OverlayTrigger>
                &nbsp;&nbsp;
              </>
            )}
            <OverlayTrigger
              overlay={
                <Tooltip id={`${this.user.id}-connection-tooltip`}>
                  {this.user.connected ? "Connected" : "Disconnected"}
                </Tooltip>
              }
            >
              <FontAwesomeIcon
                icon={faWifi}
                className={this.user.connected ? "text-success" : "text-danger"}
              />
            </OverlayTrigger>
            {!this.props.gameState.entireGame.gameSettings.private &&
              this.user.otherUsersFromSameNetwork.length > 0 &&
              this.renderOtherUsersFromSameNetworkTooltip()}
          </small>
        </Navbar.Brand>
        <Navbar.Collapse
          id={`navbar-${this.user.id}`}
          className="no-space-around"
        >
          <Nav className="no-space-around">
            <NavDropdown
              id={`nav-dropdown-${this.user.id}`}
              style={{ position: "static" }}
              className="no-gutters"
              title={
                <span
                  className={classNames("userlabel", {
                    "might-overflow ingame-userlabel": this.ingame != null,
                  })}
                >
                  {this.user.name}
                </span>
              }
            >
              {this.props.gameState.entireGame.gameSettings.faceless ? (
                <NavDropdown.Item className="text-center px-2 enabled" disabled>
                  {this.renderNameAndTimeElapsedDropDownItem()}
                </NavDropdown.Item>
              ) : (
                <NavDropdown.Item
                  className="text-center px-2"
                  href={`/user/${this.user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Show profile of
                  {this.renderNameAndTimeElapsedDropDownItem()}
                </NavDropdown.Item>
              )}
              {this.renderIngameDropdownItems()}
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }

  private renderNameAndTimeElapsedDropDownItem(): ReactNode {
    return (
      <>
        <div className="text-larger">
          <b>{this.user.name}</b>
        </div>
        {this.player?.waitedForData != null &&
          !this.player.waitedForData.handled &&
          this.props.gameState.entireGame.now.getTime() > 0 && (
            <OverlayTrigger
              overlay={
                <Tooltip id={`waiting-for-user-${this.user.id}-action-tooltip`}>
                  <small>
                    Time elapsed since waiting for player action <i>(hh:mm)</i>
                  </small>
                </Tooltip>
              }
            >
              <small>
                {secondsToString(
                  getElapsedSeconds(this.player.waitedForData.date)
                )}
              </small>
            </OverlayTrigger>
          )}
      </>
    );
  }

  renderOtherUsersFromSameNetworkTooltip(): ReactNode {
    if (this.props.gameState.entireGame.gameSettings.faceless && this.ingame) {
      return null;
    }

    return (
      <OverlayTrigger
        placement="auto"
        overlay={
          <Tooltip id={`${this.user.id}-other-users-with-same-ip-tooltip`}>
            These users {this.ingame ? "play" : "joined"} from the same network
            as {this.user.name}:
            <br />
            <br />
            {this.user.otherUsersFromSameNetwork.map((usr) => (
              <div key={`same-network-user_${usr}`}>{usr}</div>
            ))}
          </Tooltip>
        }
      >
        <img
          src={clonesImage}
          width="18"
          style={{ marginLeft: 5, marginTop: -3 }}
        />
      </OverlayTrigger>
    );
  }

  renderIngameDropdownItems(): ReactNode {
    if (!this.ingame) {
      return null;
    }

    const ingame = this.ingame;

    const {
      result: canLaunchReplacePlayerVote,
      reason: canLaunchReplacePlayerVoteReason,
    } = ingame.canLaunchReplacePlayerVote(
      this.props.gameClient.authenticatedUser
    );
    const {
      result: canLaunchReplacePlayerByVassalVote,
      reason: canLaunchReplacePlayerByVassalVoteReason,
    } = ingame.canLaunchReplacePlayerVote(
      this.props.gameClient.authenticatedUser,
      true,
      this.player!.house
    );
    const {
      result: canLaunchSwapHousesVote,
      reason: canLaunchSwapHousesVoteReason,
    } = ingame.canLaunchSwapHousesVote(
      this.props.gameClient.authenticatedUser,
      this.player!
    );
    const {
      result: canLaunchDeclareWinnerVote,
      reason: canLaunchDeclareWinnerVoteReason,
    } = ingame.canLaunchDeclareWinnerVote(
      this.props.gameClient.authenticatedUser
    );
    return (
      <>
        <NavDropdown.Divider />
        <ConditionalWrap
          condition={!canLaunchReplacePlayerVote}
          wrap={(children) => (
            <OverlayTrigger
              overlay={
                <Tooltip id="replace-player-tooltip">
                  {canLaunchReplacePlayerVoteReason == "already-playing"
                    ? "You are already playing in this game"
                    : canLaunchReplacePlayerVoteReason == "ongoing-vote"
                      ? "A vote is already ongoing"
                      : canLaunchReplacePlayerVoteReason == "game-cancelled"
                        ? "The game has been cancelled"
                        : canLaunchReplacePlayerVoteReason == "game-ended"
                          ? "The game has ended"
                          : canLaunchReplacePlayerVoteReason == "game-paused"
                            ? "The game must be resumed first"
                            : canLaunchReplacePlayerVoteReason ==
                                "forbidden-in-tournament-mode"
                              ? "Replacing players is not allowed in tournaments"
                              : "Vote not possible"}
                </Tooltip>
              }
              placement="auto"
            >
              {children}
            </OverlayTrigger>
          )}
        >
          <div id="replace-player-tooltip-wrapper">
            <NavDropdown.Item
              className="px-2"
              onClick={() => this.onLaunchReplacePlayerVoteClick()}
              disabled={!canLaunchReplacePlayerVote}
            >
              Offer to replace this player
            </NavDropdown.Item>
          </div>
        </ConditionalWrap>
        <NavDropdown.Divider />
        <ConditionalWrap
          condition={!canLaunchReplacePlayerByVassalVote}
          wrap={(children) => (
            <OverlayTrigger
              overlay={
                <Tooltip id="replace-player-by-vassal-tooltip">
                  {canLaunchReplacePlayerByVassalVoteReason == "ongoing-vote"
                    ? "A vote is already ongoing"
                    : canLaunchReplacePlayerByVassalVoteReason ==
                        "game-cancelled"
                      ? "The game has been cancelled"
                      : canLaunchReplacePlayerByVassalVoteReason == "game-ended"
                        ? "The game has ended"
                        : canLaunchReplacePlayerByVassalVoteReason ==
                            "only-players-can-vote"
                          ? "Only players can vote"
                          : canLaunchReplacePlayerByVassalVoteReason ==
                              "game-paused"
                            ? "The game must be resumed first"
                            : canLaunchReplacePlayerByVassalVoteReason ==
                                "min-player-count-reached"
                              ? "Minimum player count reached"
                              : canLaunchReplacePlayerByVassalVoteReason ==
                                  "vassalizing-yourself-is-forbidden"
                                ? "To avoid abuse you can no longer vassalize yourself"
                                : canLaunchReplacePlayerByVassalVoteReason ==
                                    "only-possible-when-defeated"
                                  ? "Vassal replacement is allowed only when the house is considered defeated"
                                  : canLaunchReplacePlayerByVassalVoteReason ==
                                      "ongoing-draft"
                                    ? "During draft mode players cannot be replaced by vassals"
                                    : "Vote not possible"}
                </Tooltip>
              }
              placement="auto"
            >
              {children}
            </OverlayTrigger>
          )}
        >
          <div id="replace-by-vassal-tooltip-wrapper">
            <NavDropdown.Item
              className="px-2"
              onClick={() => this.onLaunchReplacePlayerByVassalVoteClick()}
              disabled={!canLaunchReplacePlayerByVassalVote}
            >
              Launch a vote to replace this player by a vassal
            </NavDropdown.Item>
          </div>
        </ConditionalWrap>
        <NavDropdown.Divider />
        <ConditionalWrap
          condition={!canLaunchSwapHousesVote}
          wrap={(children) => (
            <OverlayTrigger
              overlay={
                <Tooltip id="swap-houses-tooltip">
                  {canLaunchSwapHousesVoteReason == "ongoing-vote"
                    ? "A vote is already ongoing"
                    : canLaunchSwapHousesVoteReason == "game-cancelled"
                      ? "The game has been cancelled"
                      : canLaunchSwapHousesVoteReason == "game-ended"
                        ? "The game has ended"
                        : canLaunchSwapHousesVoteReason ==
                            "only-players-can-vote"
                          ? "Only players can vote"
                          : canLaunchSwapHousesVoteReason ==
                              "cannot-swap-with-yourself"
                            ? "You cannot swap houses with yourself"
                            : canLaunchSwapHousesVoteReason ==
                                "secret-objectives-chosen"
                              ? `You or ${this.player!.user.name} has already chosen their secret objectives`
                              : canLaunchSwapHousesVoteReason ==
                                  "forbidden-in-tournament-mode"
                                ? "Swapping houses is not allowed in tournaments"
                                : "Vote not possible"}
                </Tooltip>
              }
              placement="auto"
            >
              {children}
            </OverlayTrigger>
          )}
        >
          <div id="swap-houses-tooltip-wrapper">
            <NavDropdown.Item
              className="px-2"
              onClick={() => this.onLaunchSwapHousesVoteClick()}
              disabled={!canLaunchSwapHousesVote}
            >
              Launch a vote to swap houses with this player
            </NavDropdown.Item>
          </div>
        </ConditionalWrap>
        <NavDropdown.Divider />
        <ConditionalWrap
          condition={!canLaunchDeclareWinnerVote}
          wrap={(children) => (
            <OverlayTrigger
              overlay={
                <Tooltip id="declare-winner-tooltip">
                  {canLaunchDeclareWinnerVoteReason == "ongoing-vote"
                    ? "A vote is already ongoing"
                    : canLaunchDeclareWinnerVoteReason == "game-cancelled"
                      ? "The game has been cancelled"
                      : canLaunchDeclareWinnerVoteReason == "game-ended"
                        ? "The game has ended"
                        : canLaunchDeclareWinnerVoteReason ==
                            "only-players-can-vote"
                          ? "Only players can vote"
                          : canLaunchDeclareWinnerVoteReason ==
                              "forbidden-in-tournament-mode"
                            ? "Declaring a winner is not allowed in tournaments"
                            : "Vote not possible"}
                </Tooltip>
              }
              placement="auto"
            >
              {children}
            </OverlayTrigger>
          )}
        >
          <div id="declare-winner-tooltip-wrapper">
            <NavDropdown.Item
              className="px-2"
              onClick={() => this.onLaunchDeclareWinnerClick()}
              disabled={!canLaunchDeclareWinnerVote}
            >
              Launch a vote to declare {this.player!.house.name} the winner
            </NavDropdown.Item>
          </div>
        </ConditionalWrap>
      </>
    );
  }

  onLaunchReplacePlayerVoteClick(): void {
    if (!this.ingame) {
      throw new Error(
        "`launchReplacePlayerVote` called when the game was not in IngameGameState"
      );
    }

    if (
      window.confirm(
        `Do you want to launch a vote to replace ${this.player!.user.name} who controls house ${this.player!.house.name}?`
      )
    ) {
      this.ingame.launchReplacePlayerVote(this.player!);
    }
  }

  onLaunchReplacePlayerByVassalVoteClick(): void {
    if (!this.ingame) {
      throw new Error(
        "`launchReplacePlayerVote` called when the game was not in IngameGameState"
      );
    }

    if (
      window.confirm(
        `Do you want to launch a vote to replace ${this.player!.user.name} who controls house ${this.player!.house.name} by a vassal?`
      )
    ) {
      this.ingame.launchReplacePlayerByVassalVote(this.player!);
    }
  }

  onLaunchSwapHousesVoteClick(): void {
    if (!this.ingame) {
      throw new Error(
        "`onLaunchSwapHousesVoteClick` called when the game was not in IngameGameState"
      );
    }

    if (
      window.confirm(
        `Do you want to launch a vote to swap houses with ${this.player!.user.name} who controls house ${this.player!.house.name}?`
      )
    ) {
      this.ingame.launchSwapHousesVote(this.player!);
    }
  }

  onLaunchDeclareWinnerClick(): void {
    if (!this.ingame) {
      throw new Error(
        "`onLaunchDeclareWinnerClick` called when the game was not in IngameGameState"
      );
    }

    if (
      window.confirm(
        `Do you want to launch a vote to declare House ${this.player!.house.name} the winner?`
      )
    ) {
      this.ingame.launchDeclareWinnerVote(this.player!.house);
    }
  }
}
