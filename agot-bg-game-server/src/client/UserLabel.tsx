import { t, Trans } from "./i18n";
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
      <Navbar variant="dark" className="no-space-around">
        <Navbar.Brand className="no-space-around">
          <small>
            <OverlayTrigger
              overlay={
                <Tooltip id={`${this.user.id}-connection-tooltip`}>
                  {this.user.connected
                    ? t("userLabel.connected229655")
                    : t("userLabel.disconnected04dfac")}
                </Tooltip>
              }
            >
              <FontAwesomeIcon
                icon={faWifi}
                className={this.user.connected ? "text-success" : "text-danger"}
              />
            </OverlayTrigger>
            {!this.props.gameState.entireGame.gameSettings.private &&
              this.user.otherUsersFromSameNetwork.size > 0 &&
              this.renderOtherUsersFromSameNetworkTooltip()}
            {canActAsOwner && (
              <>
                <OverlayTrigger
                  overlay={
                    <Tooltip id={`${this.user.id}-owner-tooltip`}>
                      <Trans
                        i18nKey="userLabel.gameHost8c6ec6"
                        values={{
                          deputyLabel: !isRealOwner
                            ? t("userLabel.deputy2cadf4")
                            : ""
                        }}
                      />
                    </Tooltip>
                  }
                >
                  <FontAwesomeIcon
                    icon={faUserGear}
                    style={{ marginLeft: 5 }}
                  />
                </OverlayTrigger>
              </>
            )}
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
              className="g-0"
              title={
                <span
                  className={classNames("userlabel", {
                    "might-overflow ingame-userlabel": this.ingame != null
                  })}
                >
                  {this.user.name}
                </span>
              }
            >
              {this.props.gameState.entireGame.gameSettings.faceless ? (
                <NavDropdown.Item className="text-center px-1 enabled" disabled>
                  {this.renderNameAndTimeElapsedDropDownItem()}
                </NavDropdown.Item>
              ) : (
                <NavDropdown.Item
                  className="text-center px-1"
                  href={`/user/${this.user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Trans
                    i18nKey="userLabel.showProfileOff6cf26"
                    components={{
                      userLabel: (
                        <>{this.renderNameAndTimeElapsedDropDownItem()}</>
                      )
                    }}
                  />
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
                    <Trans
                      i18nKey="userLabel.timeElapsedSinceWaitingForPlayerActionHhMm386b38"
                      components={{ emphasis: <i /> }}
                    />
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
            <Trans
              i18nKey="userLabel.theseUsersFromTheSameNetworkAs5f4ff5"
              values={{
                activity: this.ingame
                  ? t("userLabel.playaba4cc")
                  : t("userLabel.joined6b963c"),
                user: this.user.name
              }}
              components={{
                lineBreak: <br />,
                lineBreak2: <br />,
                users: (
                  <>
                    {Array.from(this.user.otherUsersFromSameNetwork).map(
                      (usr) => (
                        <div key={`same-network-user_${usr}`}>{usr}</div>
                      )
                    )}
                  </>
                )
              }}
            />
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
      reason: canLaunchReplacePlayerVoteReason
    } = ingame.canLaunchReplacePlayerVote(
      this.props.gameClient.authenticatedUser
    );
    const {
      result: canLaunchReplacePlayerByVassalVote,
      reason: canLaunchReplacePlayerByVassalVoteReason
    } = ingame.canLaunchReplacePlayerVote(
      this.props.gameClient.authenticatedUser,
      true,
      this.player!.house
    );
    const {
      result: canLaunchSwapHousesVote,
      reason: canLaunchSwapHousesVoteReason
    } = ingame.canLaunchSwapHousesVote(
      this.props.gameClient.authenticatedUser,
      this.player!
    );
    const {
      result: canLaunchDeclareWinnerVote,
      reason: canLaunchDeclareWinnerVoteReason
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
                    ? t("common.alreadyPlaying")
                    : canLaunchReplacePlayerVoteReason == "ongoing-vote"
                      ? t("common.voteOngoing")
                      : canLaunchReplacePlayerVoteReason == "game-cancelled"
                        ? t("common.gameCancelled")
                        : canLaunchReplacePlayerVoteReason == "game-ended"
                          ? t("common.gameEnded")
                          : canLaunchReplacePlayerVoteReason == "game-paused"
                            ? t("common.resumeFirst")
                            : canLaunchReplacePlayerVoteReason ==
                                "forbidden-in-tournament-mode"
                              ? t(
                                  "userLabel.replacingPlayersIsNotAllowedInTournaments753fd5"
                                )
                              : t("common.voteNotPossible")}
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
              {t("userLabel.offerToReplaceThisPlayer7fa696")}
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
                    ? t("common.voteOngoing")
                    : canLaunchReplacePlayerByVassalVoteReason ==
                        "game-cancelled"
                      ? t("common.gameCancelled")
                      : canLaunchReplacePlayerByVassalVoteReason == "game-ended"
                        ? t("common.gameEnded")
                        : canLaunchReplacePlayerByVassalVoteReason ==
                            "only-players-can-vote"
                          ? t("userLabel.onlyPlayersCanVote98b5bf")
                          : canLaunchReplacePlayerByVassalVoteReason ==
                              "game-paused"
                            ? t("common.resumeFirst")
                            : canLaunchReplacePlayerByVassalVoteReason ==
                                "min-player-count-reached"
                              ? t("userLabel.minimumPlayerCountReachedc2dd9b")
                              : canLaunchReplacePlayerByVassalVoteReason ==
                                  "vassalizing-yourself-is-forbidden"
                                ? t(
                                    "userLabel.toAvoidAbuseYouCanNoLongerVassalizeYourselfd7162d"
                                  )
                                : canLaunchReplacePlayerByVassalVoteReason ==
                                    "only-possible-when-defeated"
                                  ? t(
                                      "userLabel.vassalReplacementIsAllowedOnlyWhenTheHouseIs159cf1"
                                    )
                                  : canLaunchReplacePlayerByVassalVoteReason ==
                                      "ongoing-draft"
                                    ? t(
                                        "userLabel.duringDraftModePlayersCannotBeReplacedByVassalsab148b"
                                      )
                                    : t("common.voteNotPossible")}
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
              {t("userLabel.launchAVoteToReplaceThisPlayerByA73142f")}
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
                    ? t("common.voteOngoing")
                    : canLaunchSwapHousesVoteReason == "game-cancelled"
                      ? t("common.gameCancelled")
                      : canLaunchSwapHousesVoteReason == "game-ended"
                        ? t("common.gameEnded")
                        : canLaunchSwapHousesVoteReason ==
                            "only-players-can-vote"
                          ? t("userLabel.onlyPlayersCanVote98b5bf")
                          : canLaunchSwapHousesVoteReason ==
                              "cannot-swap-with-yourself"
                            ? t(
                                "userLabel.youCannotSwapHousesWithYourself5db098"
                              )
                            : canLaunchSwapHousesVoteReason ==
                                "secret-objectives-chosen"
                              ? t("userLabel.secretObjectivesAlreadyChosen", {
                                  player: this.player!.user.name
                                })
                              : canLaunchSwapHousesVoteReason ==
                                  "forbidden-in-tournament-mode"
                                ? t(
                                    "userLabel.swappingHousesIsNotAllowedInTournaments0b4056"
                                  )
                                : t("common.voteNotPossible")}
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
              {t("userLabel.launchAVoteToSwapHousesWithThisPlayer8ce596")}
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
                    ? t("common.voteOngoing")
                    : canLaunchDeclareWinnerVoteReason == "game-cancelled"
                      ? t("common.gameCancelled")
                      : canLaunchDeclareWinnerVoteReason == "game-ended"
                        ? t("common.gameEnded")
                        : canLaunchDeclareWinnerVoteReason ==
                            "only-players-can-vote"
                          ? t("userLabel.onlyPlayersCanVote98b5bf")
                          : canLaunchDeclareWinnerVoteReason ==
                              "forbidden-in-tournament-mode"
                            ? t(
                                "userLabel.declaringAWinnerIsNotAllowedInTournamentsd8ee2a"
                              )
                            : t("common.voteNotPossible")}
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
              <Trans
                i18nKey="userLabel.launchAVoteToDeclareTheWinner77ca8c"
                values={{ playerHouse: this.player!.house.name }}
              />
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
        t("userLabel.doYouWantToLaunchAVoteToReplacece2ed7", {
          playerUser: this.player!.user.name,
          playerHouse: this.player!.house.name
        })
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
        t("userLabel.doYouWantToLaunchAVoteToReplace1838ba", {
          playerUser: this.player!.user.name,
          playerHouse: this.player!.house.name
        })
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
        t("userLabel.doYouWantToLaunchAVoteToSwap4ecc84", {
          playerUser: this.player!.user.name,
          playerHouse: this.player!.house.name
        })
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
        t("userLabel.doYouWantToLaunchAVoteToDeclared1d231", {
          playerHouse: this.player!.house.name
        })
      )
    ) {
      this.ingame.launchDeclareWinnerVote(this.player!.house);
    }
  }
}
