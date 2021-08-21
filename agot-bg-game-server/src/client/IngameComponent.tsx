import * as React from "react";
import {Component, ReactNode} from "react";
import ResizeObserver from 'resize-observer-polyfill';
import GameClient from "./GameClient";
import {observer} from "mobx-react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import MapComponent, { MAP_HEIGHT } from "./MapComponent";
import MapControls from "./MapControls";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import renderChildGameState from "./utils/renderChildGameState";
import WesterosGameState from "../common/ingame-game-state/westeros-game-state/WesterosGameState";
import WesterosGameStateComponent from "./game-state-panel/WesterosGameStateComponent";
import PlanningGameState from "../common/ingame-game-state/planning-game-state/PlanningGameState";
import PlanningComponent from "./game-state-panel/PlanningComponent";
import ActionGameState from "../common/ingame-game-state/action-game-state/ActionGameState";
import ActionComponent from "./game-state-panel/ActionComponent";
import * as _ from "lodash";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faStar} from "@fortawesome/free-solid-svg-icons/faStar";
import {faStickyNote} from "@fortawesome/free-solid-svg-icons/faStickyNote";
import Tooltip from "react-bootstrap/Tooltip";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import cancelImage from "../../public/images/icons/cancel.svg";
import truceImage from "../../public/images/icons/truce.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import chatBubble from "../../public/images/icons/chat-bubble.svg";
import speaker from "../../public/images/icons/speaker.svg";
import speakerOff from "../../public/images/icons/speaker-off.svg";
import House from "../common/ingame-game-state/game-data-structure/House";
import marked from "marked";
import GameLogListComponent from "./GameLogListComponent";
import Game, { MAX_WILDLING_STRENGTH } from "../common/ingame-game-state/game-data-structure/Game";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import GameEndedComponent from "./game-state-panel/GameEndedComponent";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import ChatComponent from "./chat-client/ChatComponent";
import InfluenceIconComponent from "./game-state-panel/utils/InfluenceIconComponent";
import SupplyTrackComponent from "./game-state-panel/utils/SupplyTrackComponent";
import Dropdown from "react-bootstrap/Dropdown";
import User from "../server/User";
import Player from "../common/ingame-game-state/Player";
import {observable} from "mobx";
import classNames = require("classnames");
import {Channel, Message} from "./chat-client/ChatClient";
// @ts-ignore
import ScrollToBottom from "react-scroll-to-bottom";
import GameSettingsComponent from "./GameSettingsComponent";
import VoteComponent from "./VoteComponent";
import IngameCancelledComponent from "./game-state-panel/IngameCancelledComponent";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import joinReactNodes from "./utils/joinReactNodes";
import NoteComponent from "./NoteComponent";
import HouseRowComponent from "./HouseRowComponent";
import UserSettingsComponent from "./UserSettingsComponent";
import { GameSettings } from '../common/EntireGame';
import {isMobile} from 'react-device-detect';
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import DraftHouseCardsComponent from "./game-state-panel/DraftHouseCardsComponent";
import ThematicDraftHouseCardsGameState from "../common/ingame-game-state/thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";
import ThematicDraftHouseCardsComponent from "./game-state-panel/ThematicDraftHouseCardsComponent";
import ClashOfKingsGameState from "../common/ingame-game-state/westeros-game-state/clash-of-kings-game-state/ClashOfKingsGameState";
import houseCardsBackImages from "./houseCardsBackImages";
import houseInfluenceImages from "./houseInfluenceImages";
import houseOrderImages from "./houseOrderImages";
import housePowerTokensImages from "./housePowerTokensImages";
import unitImages from "./unitImages";
import DraftInfluencePositionsGameState from "../common/ingame-game-state/draft-influence-positions-game-state/DraftInfluencePositionsGameState";
import DraftInfluencePositionsComponent from "./game-state-panel/DraftInfluencePositionsComponent";

interface IngameComponentProps {
    gameClient: GameClient;
    gameState: IngameGameState;
}

const BOTTOM_MARGIN_PX = 35;
const GAME_LOG_MIN_HEIGHT = 400;
const HOUSES_PANEL_MIN_HEIGHT = 430;
const MAP_MIN_HEIGHT = Math.trunc(MAP_HEIGHT / 2);

@observer
export default class IngameComponent extends Component<IngameComponentProps> {
    mapControls: MapControls = new MapControls();
    @observable currentOpenedTab = (this.user && this.user.settings.lastOpenedTab) ? this.user.settings.lastOpenedTab : "chat";
    @observable windowHeight: number | null = null;
    @observable gameLogHeight: number = GAME_LOG_MIN_HEIGHT;
    @observable housesHeight: number | null = null;
    resizeObserver: ResizeObserver | null = null;

    get game(): Game {
        return this.ingame.game;
    }

    get gameSettings(): GameSettings {
        return this.ingame.entireGame.gameSettings;
    }

    get user(): User | null {
        return this.props.gameClient.authenticatedUser ? this.props.gameClient.authenticatedUser : null;
    }

    get ingame(): IngameGameState {
        return this.props.gameState;
    }

    get authenticatedPlayer(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    get tracks(): {name: string; tracker: House[]; stars: boolean}[] {
        const influenceTracks = this.game.influenceTracks;
        if (this.ingame.hasChildGameState(ClashOfKingsGameState)) {
            const cok = this.ingame.getChildGameState(ClashOfKingsGameState) as ClashOfKingsGameState;
            for (let i = cok.currentTrackI; i < influenceTracks.length; i++) {
                influenceTracks[i] = i == 0 ? [this.game.ironThroneHolder] : [];
            }
        }
        return [
            {name: "Iron Throne", tracker: influenceTracks[0], stars: false},
            {name: "Fiefdoms", tracker: influenceTracks[1], stars: false},
            {name: "King's Court", tracker: influenceTracks[2], stars: true},
        ]
    }

    get gameStatePanel(): HTMLElement {
        return document.getElementById('game-state-panel') as HTMLElement;
    }

    get mapComponent(): HTMLElement | null { // The map is hidden from the DOM in drafting mode, therefore this element can be null
        return document.getElementById('map-component');
    }

    get gameLogPanel(): HTMLElement {
        return document.getElementById('game-log-panel') as HTMLElement;
    }

    get housesPanel(): HTMLElement {
        return document.getElementById('houses-panel') as HTMLElement;
    }

    get gameControlsRow(): HTMLElement | null { // Spectators don't see this game controls, therefore this element can be null
        return document.getElementById('game-controls');
    }

    render(): ReactNode {
        const phases: {name: string; gameState: any; component: typeof Component}[] = [
            {name: "Westeros", gameState: WesterosGameState, component: WesterosGameStateComponent},
            {name: "Planning", gameState: PlanningGameState, component: PlanningComponent},
            {name: "Action", gameState: ActionGameState, component: ActionComponent}
        ];

        const knowsWildlingCard = this.authenticatedPlayer != null &&
            this.authenticatedPlayer.house.knowsNextWildlingCard;
        const nextWildlingCard = this.game.wildlingDeck.filter(c => c.id == this.game.clientNextWildlingCardId)[0];

        const {result: canLaunchCancelGameVote, reason: canLaunchCancelGameVoteReason} = this.props.gameState.canLaunchCancelGameVote(this.authenticatedPlayer);
        const {result: canLaunchEndGameVote, reason: canLaunchEndGameVoteReason} = this.props.gameState.canLaunchEndGameVote(this.authenticatedPlayer);

        const connectedSpectators = this.getConnectedSpectators();

        const forceResponsiveLayout = this.user ? this.user.settings.responsiveLayout : false;
        const mobileDevice = isMobile;
        const draftHouseCards = this.props.gameState.childGameState instanceof DraftHouseCardsGameState;

        const columnOrders = this.getColumnOrders(mobileDevice);
        const gameStateColumnSpan = this.getGameStateColumnSpan(mobileDevice, forceResponsiveLayout, draftHouseCards);
        const gameStatePanelOrders = this.getGameStatePanelOrders(mobileDevice, forceResponsiveLayout);

        const gameRunning = !(this.ingame.leafState instanceof GameEndedGameState) && !(this.ingame.leafState instanceof CancelledGameState);
        const roundWarning = gameRunning && (this.game.maxTurns - this.game.turn) == 1;
        const roundCritical = gameRunning && (this.game.turn == this.game.maxTurns);

        const wildlingsWarning = gameRunning && (this.game.wildlingStrength == MAX_WILDLING_STRENGTH - 2 || this.game.wildlingStrength == MAX_WILDLING_STRENGTH - 4);
        const wildlingsCritical = gameRunning && this.game.wildlingStrength == MAX_WILDLING_STRENGTH;

        const mapStyle = {
            height: (this.windowHeight != null && this.mapComponent != null) ? (this.windowHeight - this.mapComponent.getBoundingClientRect().top - BOTTOM_MARGIN_PX) : "auto",
            overflowY: (this.windowHeight != null ? "scroll" : "visible") as any,
            maxHeight: MAP_HEIGHT,
            minHeight: MAP_MIN_HEIGHT
        };

        const housesPanelStyle = {
            height: this.housesHeight != null ? `${this.housesHeight}px` : "auto",
            overflowY: (mobileDevice ? "visible" : "scroll") as any,
            minHeight: mobileDevice ? "auto" : `${HOUSES_PANEL_MIN_HEIGHT}px`
        };

        return (
            <>
                <Col xs={{span: "auto", order: columnOrders.tracksColumn}}>
                    <Row className="stackable">
                        <Col>
                            <Card>
                                <ListGroup variant="flush">
                                    {this.tracks.map(({tracker, stars}, i) => (
                                        <ListGroupItem key={i}>
                                            <Row className="align-items-center">
                                                <Col xs="auto" className="text-center" style={{width: "46px"}}>
                                                    <OverlayTrigger
                                                        overlay={
                                                            <Tooltip id={`tooltip-tracker-${i}`}>
                                                                {i == 0 ? (
                                                                    <>
                                                                        <b>Iron Throne Track</b><br />
                                                                        All ties (except military ones) are decided by the holder
                                                                        of the Iron Throne.<br />
                                                                        Turn order is decided by this tracker.
                                                                    </>
                                                                ) : i == 1 ? (
                                                                    <>
                                                                        <b>Fiefdoms Track</b><br />
                                                                        Once per round, the holder of Valyrian Steel Blade can use the blade
                                                                        to increase by one the combat strength of his army in a combat.<br />
                                                                        In case of a tie in a combat, the winner is the house which is
                                                                        the highest in this tracker.<br/><br/>
                                                                        {this.props.gameState.game.valyrianSteelBladeUsed ? (
                                                                            <>The Valyrian Steel Blade has been used this round.</>
                                                                        ) : (
                                                                            <>The Valyrian Steel Blade is available.</>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <b>Kings&apos;s Court Track</b><br />
                                                                        At the end of the Planning Phase, the holder of the Raven may choose
                                                                        to either change one of his placed order, or to look at the top card of the
                                                                        Wildling deck and decide whether to leave it at the top or to
                                                                        place it at the bottom of the deck.
                                                                    </>
                                                                )}
                                                            </Tooltip>
                                                        }
                                                        placement="right"
                                                    >
                                                        <img src={i == 0 ? stoneThroneImage : i == 1 ? this.game.valyrianSteelBladeUsed ? diamondHiltUsedImage : diamondHiltImage : ravenImage} width={32}/>
                                                    </OverlayTrigger>
                                                </Col>
                                                {tracker.map((h, i) => (
                                                    <Col xs="auto" key={h.id}>
                                                        <InfluenceIconComponent
                                                            house={h}
                                                            ingame={this.props.gameState}
                                                            track={tracker}
                                                        />
                                                        <div className="tracker-star-container">
                                                            {stars && i < this.game.starredOrderRestrictions.length && (
                                                                _.range(0, this.game.starredOrderRestrictions[i]).map(i => (
                                                                    <div key={i}>
                                                                        <FontAwesomeIcon
                                                                            style={{color: "#ffc107", fontSize: "9px"}}
                                                                            icon={faStar}/>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </ListGroupItem>
                                    ))}
                                    <ListGroupItem>
                                        <SupplyTrackComponent
                                            supplyRestrictions={this.game.supplyRestrictions}
                                            houses={this.game.houses}
                                        />
                                    </ListGroupItem>
                                </ListGroup>
                            </Card>
                        </Col>
                    </Row>
                    <Row className="stackable">
                        <Col className="pb-0">
                            <div style={housesPanelStyle}>
                                <Card id="houses-panel">
                                    <ListGroup variant="flush">
                                        {this.props.gameState.game.getPotentialWinners().map(h => (
                                            <HouseRowComponent
                                                key={h.id}
                                                gameClient={this.props.gameClient}
                                                ingame={this.props.gameState}
                                                house={h}
                                            />
                                        ))}
                                        <ListGroupItem className="text-center font-italic">
                                            <small>
                                            {connectedSpectators.length > 0 ? (
                                                <>Spectators: {joinReactNodes(this.getConnectedSpectators().map(u => <strong key={u.id}>{u.name}</strong>), ", ")}</>
                                            ) : (
                                                <>No spectators</>
                                            )}
                                            </small>
                                        </ListGroupItem>
                                    </ListGroup>
                                </Card>
                            </div>
                        </Col>
                    </Row>
                    {this.authenticatedPlayer && (
                    <Row id="game-controls">
                        <Col xs="auto">
                            <button className="btn btn-outline-light btn-sm" onClick={() => this.props.gameClient.muted = !this.props.gameClient.muted}>
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="mute-tooltip">
                                            {this.props.gameClient.muted
                                                ? "Unmute"
                                                : "Mute"}
                                        </Tooltip>
                                    }
                                >
                                    <img src={this.props.gameClient.muted ? speakerOff : speaker} width={32}/>
                                </OverlayTrigger>
                            </button>
                        </Col>
                        <Col xs="auto">
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={() => this.props.gameState.launchCancelGameVote()}
                                disabled={!canLaunchCancelGameVote}
                            >
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="cancel-game-vote-tooltip">
                                            {canLaunchCancelGameVote ? (
                                                "Launch a vote to cancel the game"
                                            ) : canLaunchCancelGameVoteReason == "only-players-can-vote" ? (
                                                "Only participating players can vote"
                                            ) : canLaunchCancelGameVoteReason == "already-existing" ? (
                                                "A vote to cancel the game is already ongoing"
                                            ) : canLaunchCancelGameVoteReason == "already-cancelled" ? (
                                                "Game has already been cancelled"
                                            ) : canLaunchCancelGameVoteReason == "already-ended" ? (
                                                "Game has already ended"
                                            ) : "Vote not possible"}
                                        </Tooltip>
                                    }
                                >
                                    <img src={cancelImage} width={32}/>
                                </OverlayTrigger>
                            </button>
                        </Col>
                        <Col xs="auto">
                                <button
                                    className="btn btn-outline-light btn-sm"
                                    onClick={() => this.props.gameState.launchEndGameVote()}
                                    disabled={!canLaunchEndGameVote}
                                >
                                    <OverlayTrigger
                                        overlay={
                                            <Tooltip id="end-game-vote-tooltip">
                                                {canLaunchEndGameVote ? (
                                                    "Launch a vote to end the game after the current round"
                                                ) : canLaunchEndGameVoteReason == "only-players-can-vote" ? (
                                                    "Only participating players can vote"
                                                ) : canLaunchEndGameVoteReason == "already-last-turn" ? (
                                                    "It is already the last round"
                                                ) : canLaunchEndGameVoteReason == "already-existing" ? (
                                                    "A vote to end the game is already ongoing"
                                                ) : canLaunchEndGameVoteReason == "already-cancelled" ? (
                                                    "Game has already been cancelled"
                                                ) : canLaunchEndGameVoteReason == "already-ended" ? (
                                                    "Game has already ended"
                                                ) : "Vote not possible"}
                                            </Tooltip>}
                                    >
                                        <img src={truceImage} width={32}/>
                                    </OverlayTrigger>
                                </button>
                        </Col>
                    </Row>)}
                </Col>
                {!draftHouseCards && <Col xs={{span: "auto", order: columnOrders.mapColumn}}>
                    <div id="map-component" style={mapStyle}>
                        <MapComponent
                            gameClient={this.props.gameClient}
                            ingameGameState={this.props.gameState}
                            mapControls={this.mapControls}
                        />
                    </div>
                </Col>}
                <Col xs={{span: gameStateColumnSpan, order: columnOrders.gameStateColumn}}>
                    <Row className="mt-0"> {/* This row is necessary to make child column ordering work */}
                        <Col id="game-state-panel" xs={{span: "12", order: gameStatePanelOrders.gameStatePanel}}>
                            <Row>
                                <Col>
                                    <Card border={this.props.gameClient.isOwnTurn() ? "warning" : undefined} bg={this.props.gameState.childGameState instanceof CancelledGameState ? "danger" : undefined}>
                                        <ListGroup variant="flush">
                                            {phases.some(phase => this.props.gameState.childGameState instanceof phase.gameState) && (
                                                <ListGroupItem>
                                                    <OverlayTrigger
                                                        overlay={this.renderRemainingWesterosCards()}
                                                        delay={{ show: 250, hide: 100 }}
                                                        placement="bottom"
                                                        popperConfig={{modifiers: {preventOverflow: {boundariesElement: "viewport"}}}}
                                                    >
                                                        <Row className="justify-content-between">
                                                            {phases.map((phase, i) => (
                                                                <Col xs="auto" key={i}>
                                                                    {this.props.gameState.childGameState instanceof phase.gameState ? (
                                                                        <strong className="weak-outline">{phase.name} phase</strong>
                                                                    ) : (
                                                                            <span className="text-muted">
                                                                                {phase.name} phase
                                                                            </span>
                                                                        )}
                                                                </Col>
                                                            ))}
                                                        </Row>
                                                    </OverlayTrigger>
                                                </ListGroupItem>
                                            )}
                                            {renderChildGameState(
                                                {mapControls: this.mapControls, ...this.props},
                                                _.concat(
                                                    phases.map(phase => [phase.gameState, phase.component] as [any, typeof Component]),
                                                    [[ThematicDraftHouseCardsGameState, ThematicDraftHouseCardsComponent]],
                                                    [[DraftHouseCardsGameState, DraftHouseCardsComponent]],
                                                    [[DraftInfluencePositionsGameState, DraftInfluencePositionsComponent]],
                                                    [[GameEndedGameState, GameEndedComponent]],
                                                    [[CancelledGameState, IngameCancelledComponent]]
                                                )
                                            )}
                                        </ListGroup>
                                    </Card>
                                </Col>
                                <Col xs="auto">
                                    <Col style={{width: "28px", fontSize: "22px", textAlign: "center"}}>
                                        <Row className="mb-3">
                                            <OverlayTrigger overlay={
                                                    <Tooltip id="round">
                                                        <b>Round {this.game.turn} / {this.game.maxTurns}</b>
                                                    </Tooltip>
                                                }
                                                placement="auto">
                                                <div>
                                                    <img className={classNames(
                                                        {"dye-warning": roundWarning},
                                                        {"dye-critical": roundCritical})}
                                                        src={hourglassImage} width={28}/>
                                                    <div style={{color: roundWarning ? "#F39C12" : roundCritical ? "#FF0000" : undefined}}>{this.game.turn}</div>
                                                </div>
                                            </OverlayTrigger>
                                        </Row>
                                        <Row>
                                            <OverlayTrigger overlay={
                                                    <Tooltip id="wildling-threat">
                                                        <b>Wildling Threat</b>{ knowsWildlingCard && nextWildlingCard ?
                                                        <><br/><br/><strong><u>{nextWildlingCard.type.name}</u></strong><br/>
                                                        <strong>Lowest Bidder:</strong> {nextWildlingCard.type.wildlingVictoryLowestBidderDescription}<br/>
                                                        <strong>Everyone Else:</strong> {nextWildlingCard.type.wildlingVictoryEverybodyElseDescription}<br/><br/>
                                                        <strong>Highest Bidder:</strong> {nextWildlingCard.type.nightsWatchDescription}
                                                        </>
                                                        : <></>
                                                        }
                                                    </Tooltip>
                                                }
                                                placement="auto">
                                                <div>
                                                    <img src={mammothImage} width={28} className={classNames(
                                                        {"dye-warning": wildlingsWarning},
                                                        {"dye-critical": wildlingsCritical},
                                                        {"wildling-highlight": knowsWildlingCard})}
                                                    />
                                                    <div style={{color: wildlingsWarning ? "#F39C12" : wildlingsCritical ? "#FF0000" : undefined}}>{this.game.wildlingStrength}</div>
                                                </div>
                                            </OverlayTrigger>
                                        </Row>
                                    </Col>
                                </Col>
                            </Row>
                        </Col>
                        <Col xs={{span: "12", order: gameStatePanelOrders.gameLogAndChatPanel}}>
                            <Card>
                                <Tab.Container activeKey={this.currentOpenedTab}
                                    onSelect={k => {
                                        this.currentOpenedTab = k;
                                        if (this.user) {
                                            this.user.settings.lastOpenedTab = k;
                                            this.user.syncSettings();
                                        }
                                    }}>
                                    <Card.Header>
                                        <Nav variant="tabs">
                                            <Nav.Item>
                                                <Nav.Link eventKey="game-logs">Game Logs</Nav.Link>
                                            </Nav.Item>
                                            <Nav.Item>
                                                <div className={classNames({"new-event": this.publicChatRoom.areThereNewMessage})}>
                                                    <Nav.Link eventKey="chat">
                                                        Chat
                                                    </Nav.Link>
                                                </div>
                                            </Nav.Item>
                                            {this.authenticatedPlayer && (
                                                <Nav.Item>
                                                    <Nav.Link eventKey="note">
                                                        <OverlayTrigger
                                                            overlay={<Tooltip id="note">Personal note</Tooltip>}
                                                            placement="auto"
                                                        >
                                                        <FontAwesomeIcon
                                                            style={{color: "white"}}
                                                            icon={faStickyNote}/>
                                                        </OverlayTrigger>
                                                    </Nav.Link>
                                                </Nav.Item>
                                            )}
                                            <Nav.Item>
                                                <Nav.Link eventKey="settings">
                                                    Settings
                                                </Nav.Link>
                                            </Nav.Item>
                                            {this.getPrivateChatRooms().map(({user, roomId}) => (
                                                <Nav.Item key={roomId}>
                                                    <div className={classNames({"new-event": this.getPrivateChatRoomForPlayer(user).areThereNewMessage})}>
                                                        <Nav.Link eventKey={roomId}>
                                                            {this.getUserDisplayName(user)}
                                                        </Nav.Link>
                                                    </div>
                                                </Nav.Item>
                                            ))}
                                            <Nav.Item>
                                                <Dropdown>
                                                    <Dropdown.Toggle id="private-chat-room-dropdown" variant="link">
                                                        <img src={chatBubble} width={16} />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        {this.getOtherPlayers().map(p => (
                                                            <Dropdown.Item onClick={() => this.onNewPrivateChatRoomClick(p)} key={p.user.id}>
                                                                {this.getUserDisplayName(p.user)}
                                                            </Dropdown.Item>
                                                        ))}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </Nav.Item>
                                        </Nav>
                                    </Card.Header>
                                    <Card.Body id="game-log-panel" style={{minHeight: GAME_LOG_MIN_HEIGHT, height: this.gameLogHeight}} >
                                        <Tab.Content className="h-100">
                                            <Tab.Pane eventKey="chat" className="h-100">
                                                <ChatComponent gameClient={this.props.gameClient}
                                                               entireGame={this.props.gameState.entireGame}
                                                               roomId={this.props.gameState.entireGame.publicChatRoomId}
                                                               currentlyViewed={this.currentOpenedTab == "chat"}
                                                               injectBetweenMessages={(p, n) => this.injectBetweenMessages(p, n)}
                                                               getUserDisplayName={u => this.getUserDisplayName(u)}/>
                                            </Tab.Pane>
                                            <Tab.Pane eventKey="game-logs" className="h-100">
                                                <ScrollToBottom className="h-100" scrollViewClassName="overflow-x-hidden">
                                                    <GameLogListComponent ingameGameState={this.props.gameState} />
                                                </ScrollToBottom>
                                            </Tab.Pane>
                                            <Tab.Pane eventKey="settings">
                                                <GameSettingsComponent gameClient={this.props.gameClient}
                                                                    entireGame={this.props.gameState.entireGame} />
                                                <UserSettingsComponent user={this.props.gameClient.authenticatedUser}
                                                                        entireGame={this.props.gameState.entireGame}
                                                                        parent={this} />
                                            </Tab.Pane>
                                            {this.authenticatedPlayer && (
                                                <Tab.Pane eventKey="note" className="h-100">
                                                    <NoteComponent gameClient={this.props.gameClient} ingame={this.props.gameState} />
                                                </Tab.Pane>
                                            )}
                                            {this.getPrivateChatRooms().map(({roomId}) => (
                                                <Tab.Pane eventKey={roomId} key={roomId} className="h-100">
                                                    <ChatComponent gameClient={this.props.gameClient}
                                                                   entireGame={this.props.gameState.entireGame}
                                                                   roomId={roomId}
                                                                   currentlyViewed={this.currentOpenedTab == roomId}
                                                                   getUserDisplayName={u => this.getUserDisplayName(u)}/>
                                                </Tab.Pane>
                                            ))}
                                        </Tab.Content>
                                    </Card.Body>
                                </Tab.Container>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </>
        );
    }

    getGameStateColumnSpan(mobileDevice: boolean, forceResponsiveLayout: boolean, draftHouseCards: boolean): any {
        if (draftHouseCards) {
            return undefined;
        }

        if (mobileDevice && forceResponsiveLayout) {
            return "8";
        }

        return "3";
    }

    getColumnOrders(mobileDevice: boolean): { tracksColumn: number; mapColumn: number; gameStateColumn: number } {
        const result = { tracksColumn: 1, mapColumn: 2, gameStateColumn: 3};

        if (mobileDevice) {
            result.tracksColumn = 3;
            result.gameStateColumn = 1;
        }

        return result;
    }

    getGameStatePanelOrders(mobileDevice: boolean, forceResponsiveLayout: boolean): {gameStatePanel: number; gameLogAndChatPanel: number} {
        const result = {gameStatePanel: 1, gameLogAndChatPanel: 2};

        if (!mobileDevice) {
            return result;
        }

        if (mobileDevice && forceResponsiveLayout) {
            result.gameLogAndChatPanel = 1;
            result.gameStatePanel = 2;
        }

        return result;
    }

    getUserDisplayName(user: User): React.ReactNode {
        const authenticatedUser = this.props.gameClient.authenticatedUser;
        if (!authenticatedUser || !authenticatedUser.settings.chatHouseNames) {
            return <>{user.name}</>;
        }

        const player = this.props.gameState.players.tryGet(user, null);
        if (player) {
            return <>{player.house.name}</>;
        }

        return <>{user.name}</>;
    }

    get publicChatRoom(): Channel {
        return this.props.gameClient.chatClient.channels.get(this.props.gameState.entireGame.publicChatRoomId);
    }

    private renderRemainingWesterosCards(): ReactNode {
        const remainingCards = this.game.remainingWesterosCardTypes.map(deck => _.sortBy(deck.entries, rwct => -rwct[1]));
        const nextCards = this.game.nextWesterosCardTypes;

        return <Tooltip id="remaining-westeros-cards" className="westeros-tooltip">
            {this.gameSettings.cokWesterosPhase && (
                <>
                    <Row className='mt-0'>
                        <Col>
                            <h5 className='text-center'>Next Westeros Cards</h5>
                        </Col>
                    </Row>
                    <Row>
                        {nextCards.map((_, i) =>
                            <Col key={"westeros-deck-" + i + "-header"} className='text-center'><b>Deck {i + 1}</b></Col>)}
                    </Row>
                    <Row>
                        {nextCards.map((wd, i) =>
                            <Col key={"westeros-deck-" + i + "-data"}>
                                {wd.map((wc, j) => <div key={"westeros-deck-" + i + "-" + j + "-data"}>{wc.name}{wc.shortDescription && (<span>&ensp;<small>({wc.shortDescription})</small></span>)}</div>)}
                            </Col>)}
                    </Row>
                </>
            )}
            <Row className={this.gameSettings.cokWesterosPhase ? 'mt-4' : 'mt-0'}>
                <Col>
                    <h5 className='text-center'>Remaining Westeros Cards</h5>
                </Col>
            </Row>
            <Row>
                {remainingCards.map((_, i) =>
                    <Col key={"westeros-deck-" + i + "-header"} style={{ textAlign: "center" }}><b>Deck {i + 1}</b></Col>)}
            </Row>
            <Row className="mb-2">
                {remainingCards.map((rc, i) =>
                    <Col key={"westeros-deck-" + i + "-data"}>
                        {rc.map(([wc, count], j) => <div key={"westeros-deck-" + i + "-" + j + "-data"}>{count}x {wc.name}{wc.shortDescription && (<span>&ensp;<small>({wc.shortDescription})</small></span>)}</div>)}
                    </Col>
                )}
            </Row>
        </Tooltip>;
    }

    getConnectedSpectators(): User[] {
        return this.props.gameState.getSpectators().filter(u => u.connected);
    }

    onNewPrivateChatRoomClick(p: Player): void {
        const users = _.sortBy([this.props.gameClient.authenticatedUser as User, p.user], u => u.id);

        if (!this.props.gameState.entireGame.privateChatRoomsIds.has(users[0]) || !this.props.gameState.entireGame.privateChatRoomsIds.get(users[0]).has(users[1])) {
            // Create a new chat room for this player
            this.props.gameState.entireGame.sendMessageToServer({
                type: "create-private-chat-room",
                otherUser: p.user.id
            });
        } else {
            // The room already exists
            // Set the current tab to this user
            this.currentOpenedTab = this.props.gameState.entireGame.privateChatRoomsIds.get(users[0]).get(users[1]);
        }
    }

    getPrivateChatRooms(): {user: User; roomId: string}[] {
        return this.props.gameState.entireGame.getPrivateChatRoomsOf(this.props.gameClient.authenticatedUser as User);
    }

    getPrivateChatRoomForPlayer(u: User): Channel {
        const users = _.sortBy([this.props.gameClient.authenticatedUser as User, u], u => u.id);

        return this.props.gameClient.chatClient.channels.get(this.props.gameState.entireGame.privateChatRoomsIds.get(users[0]).get(users[1]));
    }

    getOtherPlayers(): Player[] {
        return this.props.gameState.players.values.filter(p => p.user != this.props.gameClient.authenticatedUser);
    }

    compileGameLog(gameLog: string): string {
        return marked(gameLog);
    }

    injectBetweenMessages(previous: Message | null, next: Message | null): ReactNode {
        // Take the necessary votes to render, based on the `createdAt` times of
        // `previous` and `next`.
        const votesToRender = this.props.gameState.votes.values.filter(v => (previous != null ? previous.createdAt < v.createdAt : true) && (next ? v.createdAt < next.createdAt : true));
        return _.sortBy(votesToRender, v => v.createdAt).map(v => (
            <VoteComponent key={v.id} vote={v} gameClient={this.props.gameClient} ingame={this.props.gameState} />
        ));
    }

    setHeights(): void {
        const mobileDevice = isMobile;
        this.windowHeight = (!mobileDevice && this.user && this.user.settings.mapScrollbar) ? window.innerHeight : null;
        this.gameLogHeight = (!mobileDevice || (this.user && !this.user.settings.responsiveLayout)) ? window.innerHeight - this.gameLogPanel.getBoundingClientRect().top - BOTTOM_MARGIN_PX : GAME_LOG_MIN_HEIGHT;
        let calculatedHousesHeight = mobileDevice
            ? null
            // The additional 5 px are needed to get rid of the outer window scrollbar. Probably due to different padding behaviour compared to the map and game state panels.
            // It's not nice but ok for now.
            : Math.trunc(Math.max(window.innerHeight - this.housesPanel.getBoundingClientRect().top - BOTTOM_MARGIN_PX - 5, HOUSES_PANEL_MIN_HEIGHT));

        if (!calculatedHousesHeight) {
            this.housesHeight = null;
            return;
        }

        if (this.gameControlsRow) { // Spectators don't have this row in their DOM
            calculatedHousesHeight -= this.gameControlsRow.offsetHeight;
        }

        // If actual height is less than calculated height, we dont need to stretch this panel
        this.housesHeight = Math.min(calculatedHousesHeight, this.housesPanel.offsetHeight);
    }

    onNewPrivateChatRoomCreated(roomId: string): void {
        this.currentOpenedTab = roomId;
    }

    componentWillMount(): void {
        // Check for Dance with Dragons house cards
        if (this.props.gameState.entireGame.gameSettings.adwdHouseCards ||
            this.props.gameState.entireGame.gameSettings.setupId == "a-dance-with-dragons") {
            // Replace Stark images with Bolton images for DwD
            houseCardsBackImages.set("stark", houseCardsBackImages.get("bolton"));
            houseInfluenceImages.set("stark", houseInfluenceImages.get("bolton"));
            houseOrderImages.set("stark", houseOrderImages.get("bolton"));
            housePowerTokensImages.set("stark", housePowerTokensImages.get("bolton"));
            unitImages.set("stark", unitImages.get("bolton"));

            const boltons = this.props.gameState.game.houses.tryGet("stark", null);
            if (boltons) {
                boltons.name = "Bolton";
                boltons.color = "#c59699"
            }
        }
    }

    componentDidMount(): void {
        this.props.gameState.entireGame.onNewPrivateChatRoomCreated = (roomId: string) => this.onNewPrivateChatRoomCreated(roomId);
        if (!isMobile) {
            window.addEventListener('resize', () => this.setHeights());
        }

        this.resizeObserver = new ResizeObserver(() => this.setHeights());
        this.resizeObserver.observe(this.gameStatePanel);
    }

    componentWillUnmount(): void {
        this.props.gameState.entireGame.onNewPrivateChatRoomCreated = null;

        if (!isMobile) {
            window.removeEventListener('resize', () => this.setHeights());
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}
