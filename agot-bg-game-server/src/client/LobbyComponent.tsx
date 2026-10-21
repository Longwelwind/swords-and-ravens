import { t } from "./i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import LobbyGameState, {
  LobbyHouse
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
import AutoScroll from "./utils/AutoScroll";
import _ from "lodash";
import VolumeSliderComponent from "./utils/VolumeSliderComponent";
import { OverlayChildren } from "react-bootstrap/Overlay";

interface LobbyComponentProps {
  gameClient: GameClient;
  gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
  private lobbyHousesListRef = React.createRef<HTMLDivElement>();

  @observable accessor password = this.props.gameClient.isRealOwner()
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

  @observable accessor chatHeight = 430;

  render(): ReactNode {
    const { success: canStartGame, reason: canStartGameReason } =
      this.lobby.canStartGame(this.authenticatedUser);
    const { success: canCancelGame, reason: canCancelGameReason } =
      this.lobby.canCancel(this.authenticatedUser);

    const connectedSpectators = this.getConnectedSpectators();

    return (
      <Row className="justify-content-center no-space-around">
        <Col xs={10} lg="auto" className="mb-2" style={{ minWidth: 400 }}>
          <Card>
            <Card.Body
              ref={this.lobbyHousesListRef}
              className="no-space-around"
            >
              <ListGroup variant="flush">
                {this.lobby.lobbyHouses.values.map((h, i) => (
                  <ListGroupItem
                    key={`lobby-house_${h.id}`}
                    style={{
                      minHeight: "50px",
                      paddingTop: "6px",
                      paddingBottom: "6px"
                    }}
                  >
                    <Row
                      className="align-items-center"
                      style={{
                        opacity: this.isHouseAvailable(h) ? 1 : 0.3
                      }}
                    >
                      {!this.randomHouses && (
                        <Col xs="auto" style={{ width: "48px" }}>
                          <HouseIconComponent house={h} />
                        </Col>
                      )}
                      <Col xs="auto" style={{ width: "100px" }}>
                        <b>
                          {this.randomHouses
                            ? t("lobby.seat9f2b77", { value0: i + 1 })
                            : h.name}
                        </b>
                      </Col>
                      <Col
                        className={classNames({
                          invisible: !this.lobby.players.has(h)
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
        <Col xs={10} lg xl={6} className="mb-2 col-xxl-5">
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
                <Card className="ms-2">
                  <Card.Body
                    style={{ height: this.chatHeight, padding: "1rem" }}
                  >
                    <div className="d-flex flex-column h-100">
                      <span>{t("common.spectators")}</span>
                      <AutoScroll
                        className="mb-2 flex-fill-remaining"
                        scrollViewClassName="overflow-x-hidden"
                      >
                        {connectedSpectators.map((u) => (
                          <div key={`specatator_${u.id}`}>
                            <b>{getUserLinkOrLabel(u)}</b>
                          </div>
                        ))}
                      </AutoScroll>
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
                      className="w-100"
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
                                  ? t("lobby.readyCheckIsOngoingeccafe")
                                  : canStartGameReason == "not-enough-players"
                                    ? t(
                                        "lobby.morePlayersMustJoinToBeAbleToStart458adb"
                                      )
                                    : canStartGameReason ==
                                        "targaryen-must-be-a-player-controlled-house"
                                      ? t(
                                          "lobby.houseTargaryenMustBeChosenByAPlayer957ff1"
                                        )
                                      : canStartGameReason == "not-owner"
                                        ? t(
                                            "lobby.onlyTheOwnerOfTheGameCanStartIt5c87b7"
                                          )
                                        : null}
                              </Tooltip>
                            }
                          >
                            {children}
                          </OverlayTrigger>
                        )}
                      >
                        {this.lobby.settings.pbem ? (
                          <span>{t("lobby.starte4bb9f")}</span>
                        ) : (
                          <span>
                            {t("lobby.launchReadyCheckToStartTheGame2c0e86")}
                          </span>
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
                                  ? t("lobby.readyCheckIsOngoingeccafe")
                                  : canCancelGameReason == "not-owner"
                                    ? t(
                                        "lobby.onlyTheOwnerOfTheGameCanCancelIt1e3ea8"
                                      )
                                    : null}
                              </Tooltip>
                            }
                          >
                            {children}
                          </OverlayTrigger>
                        )}
                      >
                        <>{t("lobby.cancel19766e")}</>
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
                          <Tooltip id="lobby-mute-tooltip">
                            {this.props.gameClient.muted
                              ? t("common.unmute")
                              : t("common.mute")}
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
      </Row>
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
            name={t("common.notifications")}
            onVolumeChange={(val) =>
              this.props.gameClient.sfxManager.notificationVolumeChanged(
                val / 100
              )
            }
          />
          <VolumeSliderComponent
            volume={this.props.gameClient.musicVolume * 100}
            name={t("common.music")}
            onVolumeChange={(val) =>
              this.props.gameClient.sfxManager.musicVolumeChanged(val / 100)
            }
          />
          <VolumeSliderComponent
            volume={this.props.gameClient.sfxVolume * 100}
            name={t("common.soundEffects")}
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
                <>{t("lobby.youCanSetAPasswordHereToPreventStrangers358b96")}</>
              ) : this.lobby.password != "" ? (
                <>{t("lobby.enterThePasswordHereToUnlockAndJoinThef9cb12")}</>
              ) : (
                <></>
              )}
            </Tooltip>
          }
          placeHolder={
            isOwner
              ? t("lobby.setPassword4e4116")
              : t("lobby.enterThePasswordToUnlockTheGame31e38f")
          }
          width={300}
        />
      </Row>
    );
  }

  getConnectedSpectators(): User[] {
    return _.difference(
      this.entireGame.users.values.filter((u) => u.connected),
      this.lobby.players.values
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
              {t("lobby.invisibleDummy6080df")}
            </Button>
          </Col>
        );
      }
      return this.lobby.readyUsers.includes(this.lobby.players.get(h)) ? (
        <Col xs="auto">
          <Badge bg="success">
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
            {t("common.ready")}
          </Button>
          <Spinner
            className="ms-3"
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
          {t("lobby.choosec7f937")}
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
          {t("lobby.leavefc6e4a")}
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
            {t("lobby.kick37ca3c")}
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
    if (confirm(t("lobby.areYouSureYouWantToCancelTheGamec7f270"))) {
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
      this.lobbyHousesListRef.current?.getBoundingClientRect()?.height ?? 400;
  }
}
