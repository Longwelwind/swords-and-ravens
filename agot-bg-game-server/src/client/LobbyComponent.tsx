import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import LobbyGameState, {
  LobbyHouse,
} from "../common/lobby-game-state/LobbyGameState";
import GameClient from "./GameClient";
import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import classNames from "classnames";
import ChatComponent from "./chat-client/ChatComponent";
import GameSettingsComponent from "./GameSettingsComponent";
import User from "../server/User";
import ConditionalWrap from "./utils/ConditionalWrap";
import { Badge, OverlayTrigger, Popover, Spinner } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import UserLabel from "./UserLabel";
import EntireGame from "../common/EntireGame";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { observable } from "mobx";
import DebouncedPasswordComponent from "./utils/DebouncedPasswordComponent";
import { faCheck, faLock } from "@fortawesome/free-solid-svg-icons";
import { setBoltonIconImage, setStarkIconImage } from "./houseIconImages";
import settingsKnobsImage from "../../public/images/icons/settings-knobs.svg";
import speakerImage from "../../public/images/icons/speaker.svg";
import speakerOffImage from "../../public/images/icons/speaker-off.svg";
import getUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";
// @ts-expect-error Somehow ts complains that this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";
import _ from "lodash";
import VolumeSliderComponent from "./utils/VolumeSliderComponent";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";

interface LobbyComponentProps {
  gameClient: GameClient;
  gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
  @observable password = this.props.gameClient.isRealOwner()
    ? this.lobby.password
    : "";

  get authenticatedUser(): User {
    return this.props.gameClient.authenticatedUser as User;
  }

  get entireGame(): EntireGame {
    return this.lobby.entireGame;
  }

  get randomHouses(): boolean {
    return this.entireGame.gameSettings.randomHouses;
  }

  get lobby(): LobbyGameState {
    return this.props.gameState;
  }

  get readyCheckOngoing(): boolean {
    return this.lobby.readyUsers != null;
  }

  @observable chatHeight = 430;

  render(): ReactNode {
    const { success: canStartGame, reason: canStartGameReason } =
      this.lobby.canStartGame(this.authenticatedUser);
    const { success: canCancelGame, reason: canCancelGameReason } =
      this.lobby.canCancel(this.authenticatedUser);

    const connectedSpectators = this.getConnectedSpectators();

    return (
      <>
        <Col xs={10} lg={"auto"} className="mb-2">
          <Card>
            <Card.Body id="lobby-houses-list" className="no-space-around">
              <ListGroup variant="flush">
                {this.lobby.lobbyHouses.values.map((h, i) => (
                  <ListGroupItem
                    key={`lobby-house_${h.id}`}
                    style={{
                      minHeight: "50px",
                      paddingTop: "6px",
                      paddingBottom: "6px",
                    }}
                  >
                    <Row
                      className="align-items-center"
                      style={{ opacity: this.isHouseAvailable(h) ? 1 : 0.3 }}
                    >
                      {!this.randomHouses && (
                        <Col xs="auto" style={{ width: "48px" }}>
                          <HouseIconComponent house={h} />
                        </Col>
                      )}
                      <Col xs="auto" style={{ width: "100px" }}>
                        <b>{this.randomHouses ? "Seat " + (i + 1) : h.name}</b>
                      </Col>
                      <Col
                        className={classNames({
                          invisible: !this.lobby.players.has(h),
                        })}
                      >
                        {this.lobby.players.has(h) && (
                          <UserLabel
                            gameClient={this.props.gameClient}
                            gameState={this.lobby}
                            user={this.lobby.players.get(h)}
                          />
                        )}
                      </Col>
                      {this.renderLobbyHouseButtons(h)}
                    </Row>
                  </ListGroupItem>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={10} lg className="mb-2">
          <Row className="no-space-around">
            <Col
              xs={connectedSpectators.length > 0 ? 8 : 12}
              className="no-space-around"
            >
              <Card>
                <Card.Body style={{ height: this.chatHeight }}>
                  <ChatComponent
                    gameClient={this.props.gameClient}
                    entireGame={this.lobby.entireGame}
                    roomId={this.lobby.entireGame.publicChatRoomId}
                    currentlyViewed={true}
                    getUserDisplayName={(u) => (
                      <a
                        href={`/user/${u.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "white" }}
                      >
                        <b>{u.name}</b>
                      </a>
                    )}
                  />
                </Card.Body>
              </Card>
            </Col>
            {connectedSpectators.length > 0 && (
              <Col className="no-space-around">
                <Card className="ml-2">
                  <Card.Body
                    style={{ height: this.chatHeight, padding: "1rem" }}
                  >
                    <div className="d-flex flex-column h-100">
                      <span>Spectators:</span>
                      <ScrollToBottom
                        className="mb-2 flex-fill-remaining"
                        scrollViewClassName="overflow-x-hidden"
                      >
                        {connectedSpectators.map((u) => (
                          <div key={`specatator_${u.id}`}>
                            <b>{getUserLinkOrLabel(u)}</b>
                          </div>
                        ))}
                      </ScrollToBottom>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Col>
        <Col xs={12}>
          <Row className="justify-content-center no-space-around">
            <Card>
              <Card.Body className="py-2">
                {!this.props.gameClient.isRealOwner() &&
                  this.lobby.password != "" &&
                  !this.readyCheckOngoing &&
                  this.renderPasswordInput()}
                <Row>
                  <GameSettingsComponent
                    gameClient={this.props.gameClient}
                    entireGame={this.lobby.entireGame}
                  />
                </Row>
                {this.props.gameClient.isRealOwner() &&
                  !this.readyCheckOngoing &&
                  this.renderPasswordInput()}
                <Row className="mt-2">
                  <Col>
                    <Button
                      type="button"
                      block
                      onClick={() => this.lobby.start()}
                      disabled={!canStartGame || this.readyCheckOngoing}
                    >
                      <ConditionalWrap
                        condition={!canStartGame || this.readyCheckOngoing}
                        wrap={(children) => (
                          <OverlayTrigger
                            overlay={
                              <Tooltip id="start-game">
                                {this.readyCheckOngoing
                                  ? "Ready check is ongoing"
                                  : canStartGameReason == "not-enough-players"
                                    ? "More players must join to be able to start the game."
                                    : canStartGameReason ==
                                        "targaryen-must-be-a-player-controlled-house"
                                      ? "House Targaryen must be chosen by a player"
                                      : canStartGameReason == "not-owner"
                                        ? "Only the owner of the game can start it"
                                        : null}
                              </Tooltip>
                            }
                          >
                            {children}
                          </OverlayTrigger>
                        )}
                      >
                        {this.lobby.settings.pbem ? (
                          <span>Start</span>
                        ) : (
                          <span>Launch Ready Check to start the game</span>
                        )}
                      </ConditionalWrap>
                    </Button>
                  </Col>
                  <Col xs="auto">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => this.cancel()}
                      disabled={!canCancelGame || this.readyCheckOngoing}
                    >
                      <ConditionalWrap
                        condition={!canCancelGame || this.readyCheckOngoing}
                        wrap={(children) => (
                          <OverlayTrigger
                            overlay={
                              <Tooltip id="start-game">
                                {this.readyCheckOngoing
                                  ? "Ready check is ongoing"
                                  : canCancelGameReason == "not-owner"
                                    ? "Only the owner of the game can cancel it"
                                    : null}
                              </Tooltip>
                            }
                          >
                            {children}
                          </OverlayTrigger>
                        )}
                      >
                        <>Cancel</>
                      </ConditionalWrap>
                    </Button>
                  </Col>
                  <Col xs="auto">
                    <button
                      type="button"
                      className="btn btn-outline-light btn-sm"
                      onClick={() =>
                        (this.props.gameClient.muted =
                          !this.props.gameClient.muted)
                      }
                    >
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="mute-tooltip">
                            {this.props.gameClient.muted ? "Unmute" : "Mute"}
                          </Tooltip>
                        }
                      >
                        <img
                          src={
                            this.props.gameClient.muted
                              ? speakerOffImage
                              : speakerImage
                          }
                          height={26}
                        />
                      </OverlayTrigger>
                    </button>
                  </Col>
                  <Col xs="auto">
                    <div className="btn btn-outline-light btn-sm">
                      <OverlayTrigger
                        overlay={this.renderVolumeControlPopover()}
                        placement="top"
                        trigger="click"
                        rootClose
                      >
                        <img src={settingsKnobsImage} height={26} />
                      </OverlayTrigger>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Row>
        </Col>
      </>
    );
  }

  renderVolumeControlPopover(): OverlayChildren {
    return (
      <Popover
        id="game-controls-popover"
        style={{ maxWidth: "100%", borderColor: "white" }}
      >
        <Col className="m-2 p-2">
          <VolumeSliderComponent
            volume={this.props.gameClient.notificationsVolume * 100}
            name="Notifications"
            onVolumeChange={(val) =>
              this.props.gameClient.sfxManager.notificationVolumeChanged(
                val / 100,
              )
            }
          />
          <VolumeSliderComponent
            volume={this.props.gameClient.musicVolume * 100}
            name="Music"
            onVolumeChange={(val) =>
              this.props.gameClient.sfxManager.musicVolumeChanged(val / 100)
            }
          />
          <VolumeSliderComponent
            volume={this.props.gameClient.sfxVolume * 100}
            name="Sfx"
            onVolumeChange={(val) =>
              this.props.gameClient.sfxManager.sfxVolumeChanged(val / 100)
            }
          />
        </Col>
      </Popover>
    );
  }

  renderPasswordInput(): ReactNode {
    const isOwner = this.props.gameClient.isRealOwner();
    return (
      <Row className="justify-content-center mt-0">
        <DebouncedPasswordComponent
          password={this.password}
          onChangeCallback={(newPassword) => {
            this.password = newPassword;
            this.lobby.sendPassword(newPassword);
          }}
          tooltip={
            <Tooltip id="game-password-tooltip">
              {isOwner ? (
                <>
                  You can set a password here to prevent strangers from joining
                  your game.
                </>
              ) : this.lobby.password != "" ? (
                <>Enter the password here to unlock and join the game.</>
              ) : (
                <></>
              )}
            </Tooltip>
          }
          placeHolder={
            isOwner ? "Set password" : "Enter the password to unlock the game"
          }
          width={300}
        />
      </Row>
    );
  }

  getConnectedSpectators(): User[] {
    return _.difference(
      this.entireGame.users.values.filter((u) => u.connected),
      this.lobby.players.values,
    );
  }

  renderLobbyHouseButtons(h: LobbyHouse): React.ReactNode {
    const invisible = !this.isHouseAvailable(h);

    if (this.lobby.readyUsers != null) {
      // Ready-check ongoing
      if (!this.lobby.players.has(h) || invisible) {
        return (
          <Col xs="auto">
            <Button type="button" size="sm" className="invisible">
              INVISIBLE DUMMY
            </Button>
          </Col>
        );
      }
      return this.lobby.readyUsers.includes(this.lobby.players.get(h)) ? (
        <Col xs="auto">
          <Badge variant="success">
            <FontAwesomeIcon icon={faCheck} size="sm" />
          </Badge>
        </Col>
      ) : this.lobby.players.get(h) == this.authenticatedUser ? (
        <Col xs="auto" className="d-flex align-items-center">
          <Button
            type="button"
            size="sm"
            variant="outline-success"
            onClick={() => this.ready()}
          >
            Ready
          </Button>
          <Spinner
            className="ml-3"
            size="sm"
            animation="border"
            variant="info"
          />
        </Col>
      ) : (
        <Col xs="auto">
          <Spinner size="sm" animation="border" variant="info" />
        </Col>
      );
    }

    if (
      !this.props.gameClient.isRealOwner() &&
      this.lobby.password != "" &&
      this.password != this.lobby.password &&
      // If user is already seated, allow them to "Leave"
      (!this.lobby.players.has(h) ||
        this.lobby.players.get(h) != this.authenticatedUser)
    ) {
      return (
        <Col xs="auto" className={invisible ? "invisible" : ""}>
          <FontAwesomeIcon icon={faLock} size="sm" />
        </Col>
      );
    }

    return !this.lobby.players.has(h) ? (
      <Col xs="auto" className={invisible ? "invisible" : ""}>
        <Button type="button" size="sm" onClick={() => this.choose(h)}>
          Choose
        </Button>
      </Col>
    ) : this.lobby.players.get(h) == this.authenticatedUser ? (
      <Col xs="auto" className={invisible ? "invisible" : ""}>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => this.leave()}
        >
          Leave
        </Button>
      </Col>
    ) : (
      this.props.gameClient.isRealOwner() && (
        <Col xs="auto" className={invisible ? "invisible" : ""}>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => this.kick(h)}
          >
            Kick
          </Button>
        </Col>
      )
    );
  }

  isHouseAvailable(house: LobbyHouse): boolean {
    return this.lobby.getAvailableHouses().includes(house);
  }

  choose(house: LobbyHouse): void {
    this.lobby.chooseHouse(house, this.password);
  }

  kick(house: LobbyHouse): void {
    this.lobby.kick(this.lobby.players.get(house));
  }

  cancel(): void {
    if (confirm("Are you sure you want to cancel the game?")) {
      this.lobby.cancel();
    }
  }

  leave(): void {
    this.lobby.chooseHouse(null, this.password);
  }

  ready(): void {
    this.lobby.ready();
  }

  UNSAFE_componentWillUpdate(): void {
    if (this.entireGame.gameSettings.adwdHouseCards) {
      setBoltonIconImage();
      this.lobby.lobbyHouses.get("stark").name = "Bolton";
    } else {
      setStarkIconImage();
      this.lobby.lobbyHouses.get("stark").name = "Stark";
    }
  }

  componentDidMount(): void {
    this.setChatHeight();
  }

  setChatHeight(): void {
    this.chatHeight =
      document.getElementById("lobby-houses-list")?.getBoundingClientRect()
        ?.height ?? 400;
  }
}
