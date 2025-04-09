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
import classNames from "classnames";
// @ts-expect-error Somehow this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";
import ConditionalWrap from "../utils/ConditionalWrap";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import GameClient from "../GameClient";
import MapControls from "../MapControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Channel, Message } from "../chat-client/ChatClient";
import cardRandomImage from "../../../public/images/icons/card-random.svg";
import expandImage from "../../../public/images/icons/expand.svg";
import {
  faCheckToSlot,
  faCog,
  faComment,
  faComments,
  faEdit,
  faHistory,
  faUniversity,
} from "@fortawesome/free-solid-svg-icons";
import Player from "../../common/ingame-game-state/Player";
import User from "../../server/User";
import { isMobile } from "react-device-detect";
import ChatComponent from "../chat-client/ChatComponent";
import getUserLinkOrLabel from "../utils/getIngameUserLinkOrLabel";
import VotesListComponent from "../VotesListComponent";
import GameLogListComponent from "../GameLogListComponent";
import GameSettingsComponent from "../GameSettingsComponent";
import UserSettingsComponent from "../UserSettingsComponent";
import ObjectivesInfoComponent from "../ObjectivesInfoComponent";
import IronBankTabComponent from "../IronBankTabComponent";
import NoteComponent from "../NoteComponent";
import _ from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";

interface GameTabsComponentProps {
  ingame: IngameGameState;
  gameClient: GameClient;
  mapControls: MapControls;
  publicChatRoom: Channel;
  authenticatedPlayer: Player | null;
  user: User | null;
  border?: string; // used if it is the own turn in full sceen mode
}

@observer
export default class GameTabsComponent extends Component<GameTabsComponentProps> {
  onVisibilityChangedCallback: (() => void) | null = null;

  @observable currentOpenedTab =
    this.props.user?.settings.lastOpenedTab ?? "chat";
  @observable unseenNotes = false;

  get logChatFullScreen(): boolean {
    return this.props.gameClient.logChatFullScreen;
  }

  set logChatFullScreen(value: boolean) {
    this.props.gameClient.logChatFullScreen = value;
  }

  get mapScrollbarEnabled(): boolean {
    return !isMobile && (this.props.user?.settings.mapScrollbar ?? true);
  }

  render(): ReactNode {
    const height = this.logChatFullScreen
      ? "85%"
      : this.mapScrollbarEnabled
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
          { "flex-fill-remaining": this.mapScrollbarEnabled },
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
                    "new-event":
                      this.props.publicChatRoom.areThereUnreadMessages,
                    disconnected: !this.props.publicChatRoom.connected,
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
              {this.props.ingame.votes.size > 0 && (
                <Nav.Item>
                  <div
                    className={classNames({
                      "new-event":
                        this.props.gameClient.authenticatedPlayer
                          ?.isNeededForVote,
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
              {this.props.ingame.entireGame.isFeastForCrows && (
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
              {this.props.ingame.game.ironBank &&
                this.props.ingame.entireGame.gameSettings.playerCount < 8 && (
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
                <div className={classNames({ "new-event": this.unseenNotes })}>
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
                        {/* &nbsp;Notes */}
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
                        icon={faCog}
                      />

                      {/* &nbsp;Settings */}
                    </span>
                  </OverlayTrigger>
                </Nav.Link>
              </Nav.Item>
              {this.props.authenticatedPlayer &&
                !this.props.ingame.entireGame.gameSettings.noPrivateChats && (
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
                          {/* &nbsp;Private Chat */}
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
                      "new-event":
                        this.getPrivateChatRoomForPlayer(user)
                          .areThereUnreadMessages,
                      disconnected: !this.props.publicChatRoom.connected,
                    })}
                  >
                    <Nav.Link eventKey={roomId}>
                      {this.getUserDisplayNameLabel(user)}
                    </Nav.Link>
                  </div>
                </Nav.Item>
              ))}
            </Nav>
            {isMobile && !this.logChatFullScreen && (
              <button
                className="btn btn-secondary"
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  zIndex: 1000,
                }}
                onClick={() => {
                  this.logChatFullScreen = true;
                }}
              >
                <img src={expandImage} width={24} />
              </button>
            )}
          </Card.Header>
          <Card.Body id="game-log-panel">
            {/* This is an invisible div to force the parent to stretch to its remaining width */}
            <div style={{ visibility: "hidden", width: "850px" }} />
            <Tab.Content className="h-100">
              <Tab.Pane eventKey="chat" className="h-100">
                <ChatComponent
                  gameClient={this.props.gameClient}
                  entireGame={this.props.ingame.entireGame}
                  roomId={this.props.ingame.entireGame.publicChatRoomId}
                  currentlyViewed={this.currentOpenedTab == "chat"}
                  injectBetweenMessages={(p, n) =>
                    this.injectBetweenMessages(p, n)
                  }
                  getUserDisplayName={(u) => (
                    <b>
                      {getUserLinkOrLabel(
                        this.props.ingame.entireGame,
                        u,
                        this.props.ingame.players.tryGet(u, null),
                        this.props.user?.settings.chatHouseNames
                      )}
                    </b>
                  )}
                />
              </Tab.Pane>
              {this.props.ingame.votes.size > 0 && (
                <Tab.Pane eventKey="votes" className="h-100">
                  <ScrollToBottom
                    className="h-100"
                    scrollViewClassName="overflow-x-hidden"
                  >
                    <VotesListComponent
                      gameClient={this.props.gameClient}
                      ingame={this.props.ingame}
                    />
                  </ScrollToBottom>
                </Tab.Pane>
              )}
              <Tab.Pane eventKey="game-logs" className="h-100">
                <div className="d-flex flex-column h-100">
                  <div className="d-flex flex-column align-items-center">
                    <Dropdown className="mb-2">
                      <Dropdown.Toggle variant="secondary" size="sm">
                        Jump to
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        {this.renderGameLogRoundsDropDownItems()}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                  <ScrollToBottom
                    className="flex-fill-remaining"
                    scrollViewClassName="overflow-x-hidden"
                  >
                    <GameLogListComponent
                      ingameGameState={this.props.ingame}
                      gameClient={this.props.gameClient}
                      currentlyViewed={this.currentOpenedTab == "game-logs"}
                    />
                  </ScrollToBottom>
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="settings" className="h-100">
                <GameSettingsComponent
                  gameClient={this.props.gameClient}
                  entireGame={this.props.ingame.entireGame}
                />
                <div style={{ marginTop: -20 }}>
                  <UserSettingsComponent
                    user={this.props.user}
                    entireGame={this.props.ingame.entireGame}
                  />
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="objectives" className="h-100">
                <div
                  className="d-flex flex-column h-100"
                  style={{ overflowY: "scroll" }}
                >
                  <ObjectivesInfoComponent
                    ingame={this.props.ingame}
                    gameClient={this.props.gameClient}
                  />
                </div>
              </Tab.Pane>
              {this.props.ingame.game.ironBank && (
                <Tab.Pane eventKey="iron-bank" className="h-100">
                  <div
                    className="d-flex flex-column h-100"
                    style={{ overflowY: "scroll" }}
                  >
                    <IronBankTabComponent
                      ingame={this.props.ingame}
                      ironBank={this.props.ingame.game.ironBank}
                    />
                  </div>
                </Tab.Pane>
              )}
              <Tab.Pane eventKey="note" className="h-100">
                <NoteComponent
                  gameClient={this.props.gameClient}
                  ingame={this.props.ingame}
                />
              </Tab.Pane>
              {this.getPrivateChatRooms().map(({ roomId }) => (
                <Tab.Pane
                  eventKey={roomId}
                  key={`chat_${roomId}`}
                  className="h-100"
                >
                  <ChatComponent
                    gameClient={this.props.gameClient}
                    entireGame={this.props.ingame.entireGame}
                    roomId={roomId}
                    currentlyViewed={this.currentOpenedTab == roomId}
                    getUserDisplayName={(u) => (
                      <b>
                        {getUserLinkOrLabel(
                          this.props.ingame.entireGame,
                          u,
                          this.props.ingame.players.tryGet(u, null),
                          this.props.user?.settings.chatHouseNames
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
    const player = this.props.ingame.players.tryGet(user, null);
    const displayName =
      !this.props.user?.settings.chatHouseNames || !player
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
        {/* Spectators are shown in burlywood brown */}
        <b style={{ color: player?.house.color ?? "#deb887" }}>{displayName}</b>
      </ConditionalWrap>
    );
  }

  onNewPrivateChatRoomClick(p: Player): void {
    const users = _.sortBy([this.props.user as User, p.user], (u) => u.id);

    if (
      !this.props.ingame.entireGame.privateChatRoomsIds.has(users[0]) ||
      !this.props.ingame.entireGame.privateChatRoomsIds
        .get(users[0])
        .has(users[1])
    ) {
      // Create a new chat room for this player
      this.props.ingame.entireGame.sendMessageToServer({
        type: "create-private-chat-room",
        otherUser: p.user.id,
      });
    } else {
      // The room already exists
      // Set the current tab to this user
      this.currentOpenedTab = this.props.ingame.entireGame.privateChatRoomsIds
        .get(users[0])
        .get(users[1]);
    }
  }

  getPrivateChatRooms(): { user: User; roomId: string }[] {
    return this.props.ingame.entireGame.getPrivateChatRoomsOf(
      this.props.user as User
    );
  }

  getPrivateChatRoomForPlayer(u: User): Channel {
    const users = _.sortBy([this.props.user as User, u], (u) => u.id);

    return this.props.gameClient.chatClient.channels.get(
      this.props.ingame.entireGame.privateChatRoomsIds
        .get(users[0])
        .get(users[1])
    );
  }

  getOtherPlayers(): Player[] {
    return _.sortBy(this.props.ingame.players.values, (p) =>
      this.props.user?.settings.chatHouseNames ? p.house.name : p.user.name
    ).filter((p) => p.user != this.props.user);
  }

  injectBetweenMessages(
    _previous: Message | null,
    _next: Message | null
  ): ReactNode {
    return null;
  }

  renderGameLogRoundsDropDownItems(): JSX.Element[] {
    const gameRoundElements = document.querySelectorAll(
      '*[id^="gamelog-round-"]'
    );
    const ordersReveleadElements = Array.from(
      document.querySelectorAll('*[id^="gamelog-orders-revealed-round-"]')
    );
    const result: JSX.Element[] = [];

    gameRoundElements.forEach((gameRoundElem) => {
      const round = gameRoundElem.id.replace("gamelog-round-", "");

      result.push(
        <Dropdown.Item
          className="text-center"
          key={`dropdownitem-for-${gameRoundElem.id}`}
          onClick={() => {
            // When game log is the active tab, items get rendered before this logic here can work
            // Therefore we search the item during onClick again to make it work
            const elemToScroll = document.getElementById(gameRoundElem.id);
            elemToScroll?.scrollIntoView();
          }}
        >
          Round {round}
        </Dropdown.Item>
      );

      const ordersRevealedElem = ordersReveleadElements.find(
        (elem) => elem.id == `gamelog-orders-revealed-round-${round}`
      );
      if (ordersRevealedElem) {
        result.push(
          <Dropdown.Item
            className="text-center"
            key={`dropdownitem-for-${ordersRevealedElem.id}`}
            onClick={() => {
              // When game log is the active tab, items get rendered before this logic here can work
              // Therefore we search the item during onClick again to make it work
              const elemToScroll = document.getElementById(
                ordersRevealedElem.id
              );
              elemToScroll?.scrollIntoView();
            }}
          >
            Orders were revealed
          </Dropdown.Item>
        );
      }
    });

    return result;
  }

  onVisibilityChanged(): void {
    if (document.visibilityState == "visible" || !this.props.user) {
      return;
    }

    if (this.currentOpenedTab != this.props.user.settings.lastOpenedTab) {
      this.props.user.settings.lastOpenedTab = this.currentOpenedTab;
      this.props.user.syncSettings();
    }
  }

  onNewPrivateChatRoomCreated(roomId: string): void {
    this.currentOpenedTab = roomId;
  }

  componentDidMount(): void {
    const visibilityChangedCallback = (): void => this.onVisibilityChanged();
    document.addEventListener("visibilitychange", visibilityChangedCallback);
    this.onVisibilityChangedCallback = visibilityChangedCallback;

    this.props.ingame.entireGame.onNewPrivateChatRoomCreated = (
      roomId: string
    ) => this.onNewPrivateChatRoomCreated(roomId);

    if (this.props.gameClient.authenticatedUser?.note.length ?? 0 > 0) {
      this.unseenNotes = true;
    }
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
