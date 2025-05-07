import React, { Component, ReactNode } from "react";
import {
  Card,
  OverlayTrigger,
  Tooltip,
  Spinner,
  Tab,
  Nav,
  Dropdown,
} from "react-bootstrap";
// @ts-expect-error Somehow this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";

import classNames from "classnames";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { isMobile } from "react-device-detect";
import * as _ from "lodash";

import IngameGameState from "../common/ingame-game-state/IngameGameState";
import Player from "../common/ingame-game-state/Player";
import User from "../server/User";
import GameClient from "./GameClient";
import MapControls from "./MapControls";
import ChatComponent from "./chat-client/ChatComponent";
import VotesListComponent from "./VotesListComponent";
import GameLogListComponent from "./GameLogListComponent";
import GameSettingsComponent from "./GameSettingsComponent";
import UserSettingsComponent from "./UserSettingsComponent";
import ObjectivesInfoComponent from "./ObjectivesInfoComponent";
import IronBankTabComponent from "./IronBankTabComponent";
import NoteComponent from "./NoteComponent";

import { Channel, Message } from "./chat-client/ChatClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckToSlot,
  faGear,
  faComment,
  faComments,
  faEdit,
  faHistory,
  faUniversity,
} from "@fortawesome/free-solid-svg-icons";

import cardRandomImage from "../../public/images/icons/card-random.svg";
import expandImage from "../../public/images/icons/expand.svg";
import ConditionalWrap from "./utils/ConditionalWrap";
import getUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";

interface GameTabsComponentProps {
  ingame: IngameGameState;
  gameClient: GameClient;
  mapControls: MapControls;
  border?: string; // used if it is the own turn in full sceen mode
}

@observer
export default class GameTabsComponent extends Component<GameTabsComponentProps> {
  onVisibilityChangedCallback: (() => void) | null = null;

  private gameClient = this.props.gameClient;
  private user = this.gameClient.authenticatedUser;
  private player = this.gameClient.authenticatedPlayer;

  private ingame = this.props.ingame;
  private gameSettings = this.ingame.entireGame.gameSettings;

  @observable currentOpenedTab = this.lastOpenedTab;
  @observable unseenNotes = false;

  @observable gameRoundElems: ReactNode | null = null;

  get lastOpenedTab(): string {
    return localStorage.getItem("lastOpenedTab") ?? "chat";
  }

  set lastOpenedTab(value: string) {
    localStorage.setItem("lastOpenedTab", value);
  }

  get logChatFullScreen(): boolean {
    return this.gameClient.logChatFullScreen;
  }

  set logChatFullScreen(value: boolean) {
    this.gameClient.logChatFullScreen = value;
  }

  private get publicChatRoom(): Channel {
    return this.gameClient.chatClient.channels.get(
      this.ingame.entireGame.publicChatRoomId
    );
  }

  render(): ReactNode {
    const height = this.logChatFullScreen
      ? "85%"
      : this.gameClient.isMapScrollbarSet
        ? "auto"
        : "800px";

    return (
      <Card
        border={this.props.border}
        style={{
          height: height,
          maxHeight: height,
          borderWidth: "3px",
        }}
        className={classNames(
          { "flex-fill-remaining": this.gameClient.isMapScrollbarSet },
          "text-large"
        )}
      >
        <Tab.Container
          activeKey={this.currentOpenedTab}
          onSelect={(k) => {
            this.currentOpenedTab = k ?? "chat";
          }}
        >
          <Card.Header>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="game-logs">
                  <OverlayTrigger
                    overlay={<Tooltip id="logs-tooltip">Game Logs</Tooltip>}
                    placement="top"
                  >
                    <span>
                      <FontAwesomeIcon
                        style={{ color: "white" }}
                        icon={faHistory}
                      />
                    </span>
                  </OverlayTrigger>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <div
                  className={classNames({
                    "orange-border": this.publicChatRoom.areThereUnreadMessages,
                    disconnected: !this.publicChatRoom.connected,
                  })}
                >
                  <Nav.Link eventKey="chat">
                    <OverlayTrigger
                      overlay={<Tooltip id="chat-tooltip">Game Chat</Tooltip>}
                      placement="top"
                    >
                      <span>
                        <FontAwesomeIcon
                          style={{ color: "white" }}
                          icon={faComments}
                        />
                      </span>
                    </OverlayTrigger>
                  </Nav.Link>
                </div>
              </Nav.Item>
              {this.ingame.votes.size > 0 && (
                <Nav.Item>
                  <div
                    className={classNames({
                      "orange-border":
                        this.gameClient.authenticatedPlayer?.isNeededForVote,
                    })}
                  >
                    <Nav.Link eventKey="votes">
                      <OverlayTrigger
                        overlay={<Tooltip id="votes-tooltip">Votes</Tooltip>}
                        placement="top"
                      >
                        <span>
                          <FontAwesomeIcon
                            style={{ color: "white" }}
                            icon={faCheckToSlot}
                          />
                        </span>
                      </OverlayTrigger>
                    </Nav.Link>
                  </div>
                </Nav.Item>
              )}
              {this.ingame.entireGame.isFeastForCrows && (
                <Nav.Item>
                  <Nav.Link eventKey="objectives">
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="objectives-tooltip">Objectives</Tooltip>
                      }
                      placement="top"
                    >
                      <span>
                        <img src={cardRandomImage} width={20} />
                      </span>
                    </OverlayTrigger>
                  </Nav.Link>
                </Nav.Item>
              )}
              {this.ingame.game.ironBank &&
                this.gameSettings.playerCount < 8 && (
                  <Nav.Item>
                    <Nav.Link eventKey="iron-bank">
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="iron-bank-tooltip">
                            The Iron Bank
                          </Tooltip>
                        }
                        placement="top"
                      >
                        <span>
                          <FontAwesomeIcon
                            style={{ color: "white" }}
                            icon={faUniversity}
                          />
                        </span>
                      </OverlayTrigger>
                    </Nav.Link>
                  </Nav.Item>
                )}
              <Nav.Item>
                <div
                  className={classNames({ "orange-border": this.unseenNotes })}
                >
                  <Nav.Link eventKey="note">
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="note-tooltip">Personal note</Tooltip>
                      }
                      placement="top"
                    >
                      <span>
                        <FontAwesomeIcon
                          style={{ color: "white" }}
                          icon={faEdit}
                        />
                      </span>
                    </OverlayTrigger>
                  </Nav.Link>
                </div>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="settings">
                  <OverlayTrigger
                    overlay={<Tooltip id="settings-tooltip">Settings</Tooltip>}
                    placement="top"
                  >
                    <span>
                      <FontAwesomeIcon
                        style={{ color: "white" }}
                        icon={faGear}
                      />
                    </span>
                  </OverlayTrigger>
                </Nav.Link>
              </Nav.Item>
              {this.player && !this.gameSettings.noPrivateChats && (
                <Nav.Item>
                  <Dropdown>
                    <Dropdown.Toggle
                      id="private-chat-room-dropdown"
                      variant="link"
                    >
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="private-chat-tooltip">
                            Private Chat
                          </Tooltip>
                        }
                        placement="top"
                      >
                        <FontAwesomeIcon
                          style={{ color: "white" }}
                          icon={faComment}
                        />
                      </OverlayTrigger>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {this.getOtherPlayers().map((p) => (
                        <Dropdown.Item
                          onClick={() => this.onNewPrivateChatRoomClick(p)}
                          key={`new-chat_${p.user.id}`}
                        >
                          {this.getUserDisplayNameLabel(p.user)}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </Nav.Item>
              )}
              {this.getPrivateChatRooms().map(({ user, roomId }) => (
                <Nav.Item key={roomId}>
                  <div
                    className={classNames({
                      "orange-border":
                        this.getPrivateChatRoomForPlayer(user)
                          .areThereUnreadMessages,
                      disconnected: !this.publicChatRoom.connected,
                    })}
                  >
                    <Nav.Link eventKey={roomId}>
                      {this.getUserDisplayNameLabel(user)}
                    </Nav.Link>
                  </div>
                </Nav.Item>
              ))}
              {this.currentOpenedTab == "game-logs" && (
                <Dropdown className="ml-auto mt-1">
                  <Dropdown.Toggle variant="secondary" size="sm">
                    Jump to
                  </Dropdown.Toggle>
                  <Dropdown.Menu>{this.gameRoundElems}</Dropdown.Menu>
                </Dropdown>
              )}
              {isMobile && !this.logChatFullScreen && (
                <button
                  className="btn btn-secondary ml-auto"
                  onClick={() => {
                    this.logChatFullScreen = true;
                  }}
                >
                  <img src={expandImage} width={24} />
                </button>
              )}
            </Nav>
          </Card.Header>
          <Card.Body id="game-log-panel" className="px-1">
            <Tab.Content className="h-100">
              <Tab.Pane eventKey="chat" className="h-100">
                <ChatComponent
                  gameClient={this.gameClient}
                  entireGame={this.ingame.entireGame}
                  roomId={this.ingame.entireGame.publicChatRoomId}
                  currentlyViewed={this.currentOpenedTab == "chat"}
                  injectBetweenMessages={(p, n) =>
                    this.injectBetweenMessages(p, n)
                  }
                  getUserDisplayName={(u) => (
                    <b>
                      {getUserLinkOrLabel(
                        this.ingame.entireGame,
                        u,
                        this.ingame.players.tryGet(u, null),
                        this.user?.settings.chatHouseNames
                      )}
                    </b>
                  )}
                />
              </Tab.Pane>
              {this.ingame.votes.size > 0 && (
                <Tab.Pane eventKey="votes" className="h-100">
                  <ScrollToBottom
                    className="h-100"
                    scrollViewClassName="overflow-x-hidden"
                  >
                    <VotesListComponent
                      gameClient={this.gameClient}
                      ingame={this.ingame}
                    />
                  </ScrollToBottom>
                </Tab.Pane>
              )}
              <Tab.Pane eventKey="game-logs" className="h-100">
                <div className="d-flex flex-column h-100">
                  <ScrollToBottom
                    className="flex-fill-remaining"
                    scrollViewClassName="overflow-x-hidden"
                    initialScrollBehavior="auto"
                  >
                    <GameLogListComponent
                      ingameGameState={this.ingame}
                      gameClient={this.gameClient}
                      currentlyViewed={this.currentOpenedTab == "game-logs"}
                    />
                  </ScrollToBottom>
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="settings" className="h-100">
                <GameSettingsComponent
                  gameClient={this.gameClient}
                  entireGame={this.ingame.entireGame}
                />
                <div style={{ marginTop: -20 }}>
                  <UserSettingsComponent
                    user={this.user}
                    entireGame={this.ingame.entireGame}
                  />
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="objectives" className="h-100">
                <div
                  className="d-flex flex-column h-100"
                  style={{ overflowY: "scroll" }}
                >
                  <ObjectivesInfoComponent
                    ingame={this.ingame}
                    gameClient={this.gameClient}
                  />
                </div>
              </Tab.Pane>
              {this.ingame.game.ironBank && (
                <Tab.Pane eventKey="iron-bank" className="h-100">
                  <div
                    className="d-flex flex-column h-100"
                    style={{ overflowY: "scroll" }}
                  >
                    <IronBankTabComponent
                      ingame={this.ingame}
                      ironBank={this.ingame.game.ironBank}
                    />
                  </div>
                </Tab.Pane>
              )}
              <Tab.Pane eventKey="note" className="h-100">
                <NoteComponent
                  gameClient={this.gameClient}
                  ingame={this.ingame}
                />
              </Tab.Pane>
              {this.getPrivateChatRooms().map(({ roomId }) => (
                <Tab.Pane
                  eventKey={roomId}
                  key={`chat_${roomId}`}
                  className="h-100"
                >
                  <ChatComponent
                    gameClient={this.gameClient}
                    entireGame={this.ingame.entireGame}
                    roomId={roomId}
                    currentlyViewed={this.currentOpenedTab == roomId}
                    getUserDisplayName={(u) => (
                      <b>
                        {getUserLinkOrLabel(
                          this.ingame.entireGame,
                          u,
                          this.ingame.players.tryGet(u, null),
                          this.user?.settings.chatHouseNames
                        )}
                      </b>
                    )}
                  />
                </Tab.Pane>
              ))}
            </Tab.Content>
          </Card.Body>
        </Tab.Container>
        {this.logChatFullScreen && this.props.border && (
          <Spinner
            animation="grow"
            variant="warning"
            size="sm"
            style={{ position: "absolute", bottom: "4px", left: "4px" }}
          />
        )}
      </Card>
    );
  }

  getUserDisplayNameLabel(user: User): React.ReactNode {
    const player = this.ingame.players.tryGet(user, null);
    const displayName =
      !this.user?.settings.chatHouseNames || !player
        ? user.name
        : player.house.name;

    return (
      <ConditionalWrap
        condition={!player}
        wrap={(children) => (
          <OverlayTrigger
            overlay={
              <Tooltip id="user-is-spectator-tooltip">
                This user does not participate in the game
              </Tooltip>
            }
            placement="auto"
            delay={{ show: 250, hide: 0 }}
          >
            {children}
          </OverlayTrigger>
        )}
      >
        <b style={{ color: player?.house.color ?? "#deb887" }}>{displayName}</b>
      </ConditionalWrap>
    );
  }

  onNewPrivateChatRoomClick(p: Player): void {
    const users = _.sortBy([this.user as User, p.user], (u) => u.id);

    if (
      !this.ingame.entireGame.privateChatRoomsIds.has(users[0]) ||
      !this.ingame.entireGame.privateChatRoomsIds.get(users[0]).has(users[1])
    ) {
      this.ingame.entireGame.sendMessageToServer({
        type: "create-private-chat-room",
        otherUser: p.user.id,
      });
    } else {
      this.currentOpenedTab = this.ingame.entireGame.privateChatRoomsIds
        .get(users[0])
        .get(users[1]);
    }
  }

  getPrivateChatRooms(): { user: User; roomId: string }[] {
    return this.ingame.entireGame.getPrivateChatRoomsOf(this.user as User);
  }

  getPrivateChatRoomForPlayer(u: User): Channel {
    const users = _.sortBy([this.user as User, u], (u) => u.id);

    return this.gameClient.chatClient.channels.get(
      this.ingame.entireGame.privateChatRoomsIds.get(users[0]).get(users[1])
    );
  }

  getOtherPlayers(): Player[] {
    return _.sortBy(this.ingame.players.values, (p) =>
      this.user?.settings.chatHouseNames ? p.house.name : p.user.name
    ).filter((p) => p.user != this.user);
  }

  injectBetweenMessages(
    _previous: Message | null,
    _next: Message | null
  ): ReactNode {
    return null;
  }

  renderGameLogRoundsDropDownItems(): ReactNode {
    const gameRoundElements = document.querySelectorAll(
      '*[id^="gamelog-round-"]'
    );

    const result: JSX.Element[] = [];

    gameRoundElements.forEach((gameRoundElem) => {
      const round = gameRoundElem.id.replace("gamelog-round-", "");

      result.push(
        <Dropdown.Item
          className="text-center"
          key={`dropdownitem-for-${gameRoundElem.id}`}
          onClick={() => {
            const elemToScroll = document.getElementById(gameRoundElem.id);
            elemToScroll?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }}
        >
          Round {round}
        </Dropdown.Item>
      );
    });

    return result;
  }

  onVisibilityChanged(): void {
    if (document.visibilityState == "visible" || !this.user) {
      return;
    }

    if (this.currentOpenedTab != this.lastOpenedTab) {
      this.lastOpenedTab = this.currentOpenedTab;
    }
  }

  onNewPrivateChatRoomCreated(roomId: string): void {
    this.currentOpenedTab = roomId;
  }

  componentDidMount(): void {
    const visibilityChangedCallback = (): void => this.onVisibilityChanged();
    document.addEventListener("visibilitychange", visibilityChangedCallback);
    this.onVisibilityChangedCallback = visibilityChangedCallback;

    this.ingame.entireGame.onNewPrivateChatRoomCreated = (roomId: string) =>
      this.onNewPrivateChatRoomCreated(roomId);

    if (this.gameClient.authenticatedUser?.note.length ?? 0 > 0) {
      this.unseenNotes = true;
    }

    this.gameRoundElems = this.renderGameLogRoundsDropDownItems();
  }

  componentDidUpdate(
    _prevProps: Readonly<GameTabsComponentProps>,
    _prevState: Readonly<any>,
    _snapshot?: any
  ): void {
    if (this.currentOpenedTab == "note") {
      this.unseenNotes = false;
    }
  }

  componentWillUnmount(): void {
    const visibilityChangedCallback = this.onVisibilityChangedCallback;
    if (visibilityChangedCallback) {
      document.removeEventListener(
        "visibilitychange",
        visibilityChangedCallback
      );
    }
  }
}
