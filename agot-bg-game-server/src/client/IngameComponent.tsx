import * as React from "react";
import {Component, ReactNode} from "react";
import ResizeObserver from 'resize-observer-polyfill';
import GameClient from "./GameClient";
import {observer} from "mobx-react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import MapComponent, { MAP_HEIGHT } from "./MapComponent";
import MapControls, { RegionOnMapProperties } from "./MapControls";
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
import {faEdit} from "@fortawesome/free-solid-svg-icons/faEdit";
import {faHistory} from "@fortawesome/free-solid-svg-icons/faHistory";
import {faCog} from "@fortawesome/free-solid-svg-icons/faCog";
import {faComments} from "@fortawesome/free-solid-svg-icons/faComments";
import {faComment} from "@fortawesome/free-solid-svg-icons/faComment";
import Tooltip from "react-bootstrap/Tooltip";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import cancelImage from "../../public/images/icons/cancel.svg";
import truceImage from "../../public/images/icons/truce.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import spikedDragonHeadImage from "../../public/images/icons/spiked-dragon-head.svg";
import speakerImage from "../../public/images/icons/speaker.svg";
import speakerOffImage from "../../public/images/icons/speaker-off.svg";
import cardRandomImage from "../../public/images/icons/card-random.svg";
import House from "../common/ingame-game-state/game-data-structure/House";
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
import classNames from "classnames";
import {Channel, Message} from "./chat-client/ChatClient";
// @ts-expect-error Somehow this module cannot be found while it is
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
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import { faChevronCircleLeft, faChevronCircleRight } from "@fortawesome/free-solid-svg-icons";
import sleep from "../utils/sleep";
import joinNaturalLanguage from "./utils/joinNaturalLanguage";
import PayDebtsGameState from "../common/ingame-game-state/pay-debts-game-state/PayDebtsGameState";
import PayDebtsComponent from "./game-state-panel/PayDebtsComponent";
import BetterMap from "../utils/BetterMap";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import PartialRecursive from "../utils/PartialRecursive";
import ChooseInitialObjectivesGameState from "../common/ingame-game-state/choose-initial-objectives-game-state/ChooseInitialObjectivesGameState";
import ChooseInitialObjectivesComponent from "./game-state-panel/ChooseInitialObjectivesComponent";
import ObjectivesInfoComponent from "./ObjectivesInfoComponent";
import { Popover } from "react-bootstrap";
import WesterosCardComponent from "./game-state-panel/utils/WesterosCardComponent";
import ConditionalWrap from "./utils/ConditionalWrap";
import WildlingCardType from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";

interface ColumnOrders {
    gameStateColumn: number;
    mapColumn: number;
    housesInfosColumn: number;
    collapseButtonColumn: number;
}

interface GameStatePhaseProps {
    name: string;
    gameState: any;
    component: typeof Component;
}

interface IngameComponentProps {
    gameClient: GameClient;
    gameState: IngameGameState;
}

const BOTTOM_MARGIN_PX = 35;
const GAME_STATE_GAME_LOG_RATIO = 0.65;
const GAME_LOG_MIN_HEIGHT = 240;
const HOUSES_PANEL_MIN_HEIGHT = 430;
const MAP_MIN_HEIGHT = Math.trunc(MAP_HEIGHT / 2);

@observer
export default class IngameComponent extends Component<IngameComponentProps> {
    mapControls: MapControls = new MapControls();
    @observable currentOpenedTab = this.user?.settings.lastOpenedTab ?? "chat";
    @observable windowHeight: number | null = null;
    @observable gameStatePanelMaxHeight: number | null = null;
    @observable gameLogHeight: number = GAME_LOG_MIN_HEIGHT;
    @observable gameLogMinHeight: number = GAME_LOG_MIN_HEIGHT;
    @observable housesMaxHeight: number | null = null;
    @observable housesInfosCollapsed = this.props.gameClient.authenticatedUser?.settings.tracksColumnCollapsed ?? false;
    @observable highlightedRegions = new BetterMap<Region, PartialRecursive<RegionOnMapProperties>>();
    modifyRegionsOnMapCallback: any;
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

    get tracks(): {name: string; trackToShow: (House | null)[]; realTrack: House[]; stars: boolean}[] {
        const influenceTracks: (House | null)[][] = this.game.influenceTracks.map(track => Array.from(track));
        if (this.ingame.hasChildGameState(ClashOfKingsGameState)) {
            const cok = this.ingame.getChildGameState(ClashOfKingsGameState) as ClashOfKingsGameState;
            for (let i = cok.currentTrackI; i < influenceTracks.length; i++) {
                influenceTracks[i] = this.clientGetFixedInfluenceTrack(influenceTracks[i].map(h => (i == 0 && h == this.game.ironThroneHolder) || h == this.game.targaryen ? h : null));
            }
        } else if(this.ingame.hasChildGameState(DraftHouseCardsGameState) || this.ingame.hasChildGameState(DraftInfluencePositionsGameState) || this.ingame.hasChildGameState(ThematicDraftHouseCardsGameState)) {
            for (let i = 0; i < influenceTracks.length; i++) {
                while (influenceTracks[i].length < this.game.houses.size) {
                    influenceTracks[i].push(null);
                }
                if (this.game.targaryen && !influenceTracks[i].includes(this.game.targaryen)) {
                    influenceTracks[i][influenceTracks[i].length - 1] = this.game.targaryen;
                }
                influenceTracks[i] = this.clientGetFixedInfluenceTrack(influenceTracks[i]);
            }
        }
        return [
            {name: "Iron Throne", trackToShow: influenceTracks[0], realTrack: this.game.influenceTracks[0], stars: false},
            {name: "Fiefdoms", trackToShow: influenceTracks[1], realTrack: this.game.influenceTracks[1], stars: false},
            {name: "King's Court", trackToShow: influenceTracks[2], realTrack: this.game.influenceTracks[2], stars: true},
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

    get housesPanel(): HTMLElement | null {
        return document.getElementById('houses-panel') as HTMLElement;
    }

    get gameControlsRow(): HTMLElement | null { // Spectators don' see this game controls, therefore this element can be null
        return document.getElementById('game-controls');
    }

    constructor(props: IngameComponentProps) {
        super(props);
        // Check for Dance with Dragons house cards
        if (props.gameState.entireGame.gameSettings.adwdHouseCards ||
            props.gameState.entireGame.isDanceWithDragons) {
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

    clientGetFixedInfluenceTrack(track: (House | null)[]): (House | null)[] {
        if (!this.game.targaryen) {
            return track;
        }

        return _.concat(_.without(track, this.game.targaryen), this.game.targaryen);
    }

    render(): ReactNode {
        const mobileDevice = isMobile;
        const draftHouseCards = this.props.gameState.childGameState instanceof DraftHouseCardsGameState;

        const columnOrders = this.getColumnOrders(mobileDevice, this.user?.settings.responsiveLayout ?? false);

        const mapStyle = {
            height: (this.windowHeight != null && this.mapComponent != null) ? (this.windowHeight - this.mapComponent.getBoundingClientRect().top - BOTTOM_MARGIN_PX) : "auto",
            overflowY: (this.windowHeight != null ? "scroll" : "visible") as any,
            maxHeight: MAP_HEIGHT,
            minHeight: MAP_MIN_HEIGHT
        };

        const collapseIcon = columnOrders.collapseButtonColumn == 1 ?
            this.housesInfosCollapsed ? faChevronCircleLeft : faChevronCircleRight
            : this.housesInfosCollapsed ? faChevronCircleRight : faChevronCircleLeft;

        const showMap = !draftHouseCards || this.props.gameClient.authenticatedUser?.settings.showMapWhenDrafting;

        return (
            <>
                <Col xs={{order: columnOrders.gameStateColumn}} style={{minWidth: this.gameSettings.playerCount == 8 ? "470px" : "450px", maxWidth: draftHouseCards ? "1200px" : "800px"}}>
                    {this.renderGameStateColumn()}
                </Col>
                {showMap && <Col xs={{span: "auto", order: columnOrders.mapColumn}}>
                    <div id="map-component" style={mapStyle}>
                        <MapComponent
                            gameClient={this.props.gameClient}
                            ingameGameState={this.props.gameState}
                            mapControls={this.mapControls}
                        />
                    </div>
                </Col>}
                {!mobileDevice &&
                <Col xs={{span: "auto", order: columnOrders.collapseButtonColumn}} className="px-0">
                    <button className="btn btn-sm p-0" onClick={async() => {
                        this.housesInfosCollapsed = !this.housesInfosCollapsed;
                        if (this.props.gameClient.authenticatedUser) {
                            this.props.gameClient.authenticatedUser.settings.tracksColumnCollapsed = this.housesInfosCollapsed;
                            this.props.gameClient.authenticatedUser.syncSettings();
                        }
                        await sleep(750);
                        this.onWindowResize();
                    }}>
                        <FontAwesomeIcon icon={collapseIcon} />
                    </button>
                </Col>}
                {(!this.housesInfosCollapsed || mobileDevice) && (
                <Col xs={{ span: "auto", order: columnOrders.housesInfosColumn }} id="tracks-houses-column">
                    {this.renderHousesColumn(mobileDevice)}
                </Col>)}
            </>
        );
    }

    renderHousesColumn(mobileDevice: boolean): ReactNode {
        const {result: canLaunchCancelGameVote, reason: canLaunchCancelGameVoteReason} = this.props.gameState.canLaunchCancelGameVote(this.authenticatedPlayer);
        const {result: canLaunchEndGameVote, reason: canLaunchEndGameVoteReason} = this.props.gameState.canLaunchEndGameVote(this.authenticatedPlayer);

        const connectedSpectators = this.getConnectedSpectators();

        const housesPanelStyle = {
            maxHeight: this.housesMaxHeight == null ? "none": `${this.housesMaxHeight}px`,
            overflowY: (this.housesMaxHeight == null ? "visible" : "scroll") as any,
            minHeight: mobileDevice ? "auto" : `${HOUSES_PANEL_MIN_HEIGHT}px`
        };

        return (
            <>
                <Row className="stackable">
                    <Col>
                        <Card>
                            <ListGroup variant="flush">
                                {this.tracks.map(({ name, trackToShow, realTrack, stars }, i) => (
                                    <ListGroupItem key={`influence-track-${i}`} style={{ minHeight: "61px" }}>
                                        <Row className="align-items-center">
                                            <Col xs="auto" className="text-center" style={{ width: "46px" }}>
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
                                                                    the highest in this tracker.<br /><br />
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
                                                    <img src={i == 0 ? stoneThroneImage : i == 1 ? this.game.valyrianSteelBladeUsed ? diamondHiltUsedImage : diamondHiltImage : ravenImage} width={32} />
                                                </OverlayTrigger>
                                            </Col>
                                            {trackToShow.map((h, j) => (
                                                <Col xs="auto" key={`track_${i}_${h?.id ?? j}`}>
                                                    <InfluenceIconComponent
                                                        house={h}
                                                        ingame={this.props.gameState}
                                                        track={realTrack}
                                                        name={name}
                                                    />
                                                    <div className="tracker-star-container">
                                                        {stars && (
                                                            _.range(0, this.game.starredOrderRestrictions[j]).map(k => (
                                                                <div key={`stars_${h?.id ?? j}_${k}`}>
                                                                    <FontAwesomeIcon
                                                                        style={{ color: "#ffc107", fontSize: "9px" }}
                                                                        icon={faStar} />
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </Col>
                                            ))}
                                        </Row>
                                    </ListGroupItem>
                                ))}
                                <ListGroupItem style={{ minHeight: "130px" }}>
                                    <SupplyTrackComponent
                                        supplyRestrictions={this.game.supplyRestrictions}
                                        houses={this.game.houses}
                                        ingame={this.props.gameState}
                                        mapControls={this.mapControls}
                                    />
                                </ListGroupItem>
                            </ListGroup>
                        </Card>
                    </Col>
                </Row>
                <Row className="stackable">
                    <Col>
                        <Card>
                            <div style={housesPanelStyle}>
                                <Card.Body id="houses-panel" className="no-space-around">
                                    <ListGroup variant="flush">
                                        {this.props.gameState.game.getPotentialWinners().map(h => (
                                            <HouseRowComponent
                                                key={h.id}
                                                gameClient={this.props.gameClient}
                                                ingame={this.props.gameState}
                                                house={h}
                                                mapControls={this.mapControls}
                                            />
                                        ))}
                                        <ListGroupItem className="text-center font-italic" style={{maxWidth: 500}}>
                                            <small>
                                                {connectedSpectators.length > 0 ? (
                                                    <>Spectators: {joinReactNodes(this.getConnectedSpectators().map(u => <strong key={u.id}>{u.name}</strong>), ", ")}</>
                                                ) : (
                                                    <>No spectators</>
                                                )}
                                            </small>
                                        </ListGroupItem>
                                    </ListGroup>
                                </Card.Body>
                            </div>
                        </Card>
                    </Col>
                </Row>
                <Row id="game-controls">
                    <Col xs="auto" className="pb-0">
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
                                <img src={this.props.gameClient.muted ? speakerOffImage : speakerImage} width={32} />
                            </OverlayTrigger>
                        </button>
                    </Col>
                    {this.authenticatedPlayer && <>
                        <Col xs="auto" className="pb-0">
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
                                    <img src={cancelImage} width={32} />
                                </OverlayTrigger>
                            </button>
                        </Col>
                        <Col xs="auto" className="pb-0">
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
                                    <img src={truceImage} width={32} />
                                </OverlayTrigger>
                            </button>
                        </Col>
                    </>}
                </Row>
            </>)
    }

    renderGameStateColumn(): ReactNode {
        const phases: GameStatePhaseProps[] = [
            {name: "Westeros", gameState: WesterosGameState, component: WesterosGameStateComponent},
            {name: "Planning", gameState: PlanningGameState, component: PlanningComponent},
            {name: "Action", gameState: ActionGameState, component: ActionComponent}
        ];

        const knowsWildlingCard = this.authenticatedPlayer != null &&
            this.authenticatedPlayer.house.knowsNextWildlingCard;
        const nextWildlingCard = this.game.wildlingDeck.find(c => c.id == this.game.clientNextWildlingCardId);

        const gameRunning = !(this.ingame.leafState instanceof GameEndedGameState) && !(this.ingame.leafState instanceof CancelledGameState);
        const roundWarning = gameRunning && (this.game.maxTurns - this.game.turn) == 1;
        const roundCritical = gameRunning && (this.game.turn == this.game.maxTurns);

        let wildlingsWarning = gameRunning && (this.game.wildlingStrength == MAX_WILDLING_STRENGTH - 2 || this.game.wildlingStrength == MAX_WILDLING_STRENGTH - 4);
        let wildlingsCritical = gameRunning && this.game.wildlingStrength == MAX_WILDLING_STRENGTH;

        let warningAndKnowsNextWildingCard = false;
        let criticalAndKnowsNextWildingCard = false;

        if (knowsWildlingCard && nextWildlingCard) {
            if (wildlingsWarning) {
                warningAndKnowsNextWildingCard = true;
                wildlingsWarning = false;
            }

            if (wildlingsCritical) {
                criticalAndKnowsNextWildingCard = true;
                wildlingsCritical = false;
            }
        }

        const gameStatePanelStyle = {
            maxHeight: this.gameStatePanelMaxHeight == null ? "none" : `${this.gameStatePanelMaxHeight}px`,
            overflowY: (this.gameStatePanelMaxHeight == null ? "visible" : "scroll") as any,
            paddingRight: "10px"
        };

        const border = this.props.gameClient.isOwnTurn() ?
            "warning" : this.props.gameState.childGameState instanceof CancelledGameState ?
            "danger" : undefined;

        const getPhaseHeader = (phase: GameStatePhaseProps): JSX.Element => this.props.gameState.childGameState instanceof phase.gameState
                ? <b className={classNames("weak-outline", { "clickable dropdown-toggle": phase.name == "Westeros" })}>{phase.name} phase</b>
                : <span className={classNames("text-muted", { "clickable dropdown-toggle": phase.name == "Westeros" })}>{phase.name} phase</span>;

        return <Row className="mt-0">
            <Col xs={"12"} className="pt-0">
                <Card id="game-state-panel" border={border} style={gameStatePanelStyle}>
                    <Row>
                        <Col>
                            <ListGroup variant="flush">
                                {phases.some(phase => this.props.gameState.childGameState instanceof phase.gameState) && (
                                    <ListGroupItem>
                                        <Row className="justify-content-between">
                                            {phases.map((phase, i) => (
                                                <Col xs="auto" key={i}>
                                                    <ConditionalWrap
                                                            condition={phase.name == "Westeros"}
                                                            wrap={child => <OverlayTrigger
                                                                    overlay={this.renderRemainingWesterosCards()}
                                                                    trigger="click"
                                                                    placement="bottom-start"
                                                                    rootClose
                                                                >
                                                                    {child}
                                                                </OverlayTrigger>
                                                            }
                                                        >
                                                            {getPhaseHeader(phase)}
                                                        </ConditionalWrap>
                                                </Col>)
                                            )}
                                        </Row>
                                    </ListGroupItem>
                                )}
                                {renderChildGameState(
                                    { mapControls: this.mapControls, ...this.props },
                                    _.concat(
                                        phases.map(phase => [phase.gameState, phase.component] as [any, typeof Component]),
                                        [[ThematicDraftHouseCardsGameState, ThematicDraftHouseCardsComponent]],
                                        [[DraftHouseCardsGameState, DraftHouseCardsComponent]],
                                        [[DraftInfluencePositionsGameState, DraftInfluencePositionsComponent]],
                                        [[GameEndedGameState, GameEndedComponent]],
                                        [[CancelledGameState, IngameCancelledComponent]],
                                        [[PayDebtsGameState, PayDebtsComponent]],
                                        [[ChooseInitialObjectivesGameState, ChooseInitialObjectivesComponent]]
                                    )
                                )}
                            </ListGroup>
                        </Col>
                        <Col xs="auto" className="mx-1 px-0">
                            <Col style={{ width: "28px", fontSize: "22px" }} className="px-0 text-center">
                                <Row className="mb-3 mx-0" onMouseEnter={() => this.highlightRegionsOfHouses()} onMouseLeave={() => this.highlightedRegions.clear()}>
                                    <OverlayTrigger overlay={
                                        <Tooltip id="round-tooltip">
                                            <h6>Round {this.game.turn} / {this.game.maxTurns}</h6>
                                        </Tooltip>
                                    }
                                        placement="auto">
                                        <div>
                                            <img className={classNames(
                                                { "dye-warning": roundWarning },
                                                { "dye-critical": roundCritical })}
                                                src={hourglassImage} width={28} />
                                            <div style={{ color: roundWarning ? "#F39C12" : roundCritical ? "#FF0000" : undefined }}>{this.game.turn}</div>
                                        </div>
                                    </OverlayTrigger>
                                </Row>
                                <Row className="mx-0 clickable">
                                    <OverlayTrigger overlay={this.renderWildlingDeckPopover(knowsWildlingCard, nextWildlingCard?.type)}
                                        trigger="click"
                                        placement="auto"
                                        rootClose
                                    >
                                        <div>
                                            <img src={mammothImage} width={28} className={classNames(
                                                { "dye-warning": wildlingsWarning && !warningAndKnowsNextWildingCard },
                                                { "dye-critical": wildlingsCritical && !criticalAndKnowsNextWildingCard },
                                                { "wildling-highlight": knowsWildlingCard && !warningAndKnowsNextWildingCard && !criticalAndKnowsNextWildingCard},
                                                { "dye-warning-highlight": warningAndKnowsNextWildingCard},
                                                { "dye-critical-highlight": criticalAndKnowsNextWildingCard}
                                                )}
                                            />
                                            <div style={{ color: wildlingsWarning ? "#F39C12" : wildlingsCritical ? "#FF0000" : undefined }}>{this.game.wildlingStrength}</div>
                                        </div>
                                    </OverlayTrigger>
                                </Row>
                                {this.props.gameState.entireGame.gameSettings.playerCount >= 8 && <Row className="mx-0 mt-3">
                                    <OverlayTrigger overlay={this.renderDragonStrengthTooltip()}
                                        placement="auto">
                                        <div>
                                            <img src={spikedDragonHeadImage} width={28}/>
                                            <div>{this.game.currentDragonStrength}</div>
                                        </div>
                                    </OverlayTrigger>
                                </Row>}
                            </Col>
                        </Col>
                    </Row>
                </Card>
            </Col>
            <Col xs={"12"}>
                <Card>
                    <Tab.Container activeKey={this.currentOpenedTab}
                        onSelect={k => {
                            if (k) {
                                this.currentOpenedTab = k;
                            }
                            if (this.user) {
                                this.user.settings.lastOpenedTab = k;
                                this.user.syncSettings();
                            }
                        }}>
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
                                                    icon={faHistory} />
                                            </span>
                                        </OverlayTrigger>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <div className={classNames({ "new-event": this.publicChatRoom.areThereNewMessage })}>
                                        <Nav.Link eventKey="chat">
                                            <OverlayTrigger
                                                overlay={<Tooltip id="chat-tooltip">Game Chat</Tooltip>}
                                                placement="top"
                                            >
                                                <span>
                                                    <FontAwesomeIcon
                                                        style={{ color: "white" }}
                                                        icon={faComments} />
                                                </span>
                                            </OverlayTrigger>
                                        </Nav.Link>
                                    </div>
                                </Nav.Item>
                                {this.ingame.entireGame.isFeastForCrows && (
                                    <Nav.Item>
                                        <Nav.Link eventKey="objectives">
                                            <OverlayTrigger
                                                overlay={<Tooltip id="objectives-tooltip">Objectives</Tooltip>}
                                                placement="top"
                                            >
                                                <span>
                                                    <img src={cardRandomImage} width={20} />
                                                </span>
                                            </OverlayTrigger>
                                        </Nav.Link>
                                    </Nav.Item>
                                )}
                                <Nav.Item>
                                    <Nav.Link eventKey="note">
                                        <OverlayTrigger
                                            overlay={<Tooltip id="note-tooltip">Personal note</Tooltip>}
                                            placement="top"
                                        >
                                            <span>
                                                <FontAwesomeIcon
                                                    style={{ color: "white" }}
                                                    icon={faEdit} />
                                                {/* &nbsp;Notes */}
                                            </span>
                                        </OverlayTrigger>
                                    </Nav.Link>
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
                                                    icon={faCog} />

                                                {/* &nbsp;Settings */}
                                            </span>
                                        </OverlayTrigger>
                                    </Nav.Link>
                                </Nav.Item>
                                {this.authenticatedPlayer && <Nav.Item>
                                    <Dropdown>
                                        <Dropdown.Toggle id="private-chat-room-dropdown" variant="link">
                                            <OverlayTrigger
                                                overlay={<Tooltip id="private-chat-tooltip">Private Chat</Tooltip>}
                                                placement="top"
                                            >
                                                <FontAwesomeIcon
                                                    style={{ color: "white" }}
                                                    icon={faComment} />
                                                {/* &nbsp;Private Chat */}
                                            </OverlayTrigger>
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {this.getOtherPlayers().map(p => (
                                                <Dropdown.Item onClick={() => this.onNewPrivateChatRoomClick(p)} key={p.user.id}>
                                                    {this.getUserDisplayName(p.user)}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Nav.Item>}
                                {this.getPrivateChatRooms().map(({ user, roomId }) => (
                                    <Nav.Item key={roomId}>
                                        <div className={classNames({ "new-event": this.getPrivateChatRoomForPlayer(user).areThereNewMessage })}>
                                            <Nav.Link eventKey={roomId}>
                                                {this.getUserDisplayName(user)}
                                            </Nav.Link>
                                        </div>
                                    </Nav.Item>
                                ))}
                            </Nav>
                        </Card.Header>
                        <Card.Body id="game-log-panel" style={{ minHeight: this.gameLogMinHeight, height: this.gameLogHeight }} >
                            <Tab.Content className="h-100">
                                <Tab.Pane eventKey="chat" className="h-100">
                                    <ChatComponent gameClient={this.props.gameClient}
                                        entireGame={this.props.gameState.entireGame}
                                        roomId={this.props.gameState.entireGame.publicChatRoomId}
                                        currentlyViewed={this.currentOpenedTab == "chat"}
                                        injectBetweenMessages={(p, n) => this.injectBetweenMessages(p, n)}
                                        getUserDisplayName={u => this.getUserDisplayName(u)} />
                                </Tab.Pane>
                                <Tab.Pane eventKey="game-logs" className="h-100">
                                    <ScrollToBottom className="h-100" scrollViewClassName="overflow-x-hidden">
                                        <GameLogListComponent ingameGameState={this.props.gameState} />
                                    </ScrollToBottom>
                                </Tab.Pane>
                                <Tab.Pane eventKey="settings" className="h-100">
                                    <GameSettingsComponent gameClient={this.props.gameClient}
                                        entireGame={this.props.gameState.entireGame} />
                                    <div style={{marginTop: -20}} >
                                        <UserSettingsComponent user={this.props.gameClient.authenticatedUser}
                                            entireGame={this.props.gameState.entireGame}
                                            parent={this} />
                                    </div>
                                </Tab.Pane>
                                <Tab.Pane eventKey="objectives" className="h-100">
                                    <div className="d-flex flex-column h-100" style={{overflowY: "scroll"}}>
                                        <ObjectivesInfoComponent ingame={this.ingame} gameClient={this.props.gameClient}/>
                                    </div>
                                </Tab.Pane>
                                <Tab.Pane eventKey="note" className="h-100">
                                    <NoteComponent gameClient={this.props.gameClient} ingame={this.props.gameState} />
                                </Tab.Pane>
                                {this.getPrivateChatRooms().map(({ roomId }) => (
                                    <Tab.Pane eventKey={roomId} key={roomId} className="h-100">
                                        <ChatComponent gameClient={this.props.gameClient}
                                            entireGame={this.props.gameState.entireGame}
                                            roomId={roomId}
                                            currentlyViewed={this.currentOpenedTab == roomId}
                                            getUserDisplayName={u => this.getUserDisplayName(u)} />
                                    </Tab.Pane>
                                ))}
                            </Tab.Content>
                        </Card.Body>
                    </Tab.Container>
                </Card>
            </Col>
        </Row>
    }

    highlightRegionsOfHouses(): void {
        const regions = new BetterMap(this.ingame.world.regions.values.map(r => [r, r.getController()]));
        this.highlightedRegions.clear();

        regions.entries.forEach(([r, controller]) => {
            this.highlightedRegions.set(r, {
                highlight: {
                    active: controller != null ? true : false,
                    color: controller?.id != "greyjoy" ? controller?.color ?? "#000000" : "#000000",
                    light: r.type.id == "sea",
                    strong: r.type.id == "land"
                }
            });
        });
    }

    renderDragonStrengthTooltip(): OverlayChildren {
        const roundsWhenIncreased: number[] = [];
        for(let i = this.game.turn + 1; i <= 10; i++) {
            if (i % 2 == 0) {
                roundsWhenIncreased.push(i);
            }
        }
        _.pull(roundsWhenIncreased, this.game.removedDragonStrengthToken);
        return <Tooltip id="dragon-strength-tooltip">
            <div className="m-1 text-center">
                <h6>Current Dragon Strength</h6>
                {roundsWhenIncreased.length > 0 && <p>Will increase in round<br/>{joinNaturalLanguage(roundsWhenIncreased)}</p>}
            </div>
        </Tooltip>
    }

    getColumnOrders(mobileDevice: boolean, alignGameStateToTheRight: boolean): ColumnOrders {
        const result = { gameStateColumn: 1, mapColumn: 2, collapseButtonColumn: 3, housesInfosColumn: 4 };

        if (!mobileDevice && alignGameStateToTheRight) {
            return { collapseButtonColumn: 1, housesInfosColumn: 2, mapColumn: 3, gameStateColumn: 4 };
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

    private renderRemainingWesterosCards(): OverlayChildren {
        const remainingCards = this.game.remainingWesterosCardTypes.map(deck => _.sortBy(deck.entries, rwct => -rwct[1], rwct => rwct[0].name));
        const nextCards = this.game.nextWesterosCardTypes;

        return <Popover id={"remaining-westeros-cards"} style={{maxWidth: "100%"}}>
            <Col xs={12}>
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
                                    {wd.map((wc, j) => wc
                                        ? <div key={"westeros-deck-" + i + "-" + j + "-data"} className="mb-1">
                                            <WesterosCardComponent
                                                cardType={wc}
                                                westerosDeckI={i}
                                                size="small"
                                                tooltip
                                                showTitle
                                            />
                                          </div>
                                        : <div/>
                                    )}
                                </Col>
                            )}
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
                        <Col key={"westeros-deck-" + i + "-header"} className="text-center"><b>Deck {i + 1}</b></Col>)}
                </Row>
                <Row className="mb-2">
                    {remainingCards.map((rc, i) =>
                        <Col key={"westeros-deck-" + i + "-data"}>
                            {rc.map(([wc, count], j) =>
                                <Row key={"westeros-deck-" + i + "-" + j + "-data"} className="m1 align-items-center">
                                    <Col xs="auto" style={{marginRight: "-20px"}}>
                                        {count > 1 ? count : <>&nbsp;</>}
                                    </Col>
                                    <Col className="pl-0" style={{width: "150px", maxWidth: "150px"}}>
                                        <WesterosCardComponent
                                            cardType={wc}
                                            westerosDeckI={i}
                                            size="small"
                                            tooltip
                                            showTitle
                                        />
                                    </Col>
                                </Row>
                            )}
                        </Col>
                    )}
                </Row>
            </Col>
        </Popover>;
    }

    private renderWildlingDeckPopover(knowsWildlingCard: boolean, nextWildlingCard: WildlingCardType | undefined): OverlayChildren {
        const wildlingDeck = _.sortBy(this.game.wildlingDeck.map(wc => wc.type).filter(wc => wc != nextWildlingCard), wc => wc.name);
        return <Popover id="wildling-threat-tooltip">
            <Col xs={12}>
                {knowsWildlingCard && nextWildlingCard && (
                    <>
                        <Col xs={12} className="mt-0">
                            <h5 className="text-center">Top Wilding Card</h5>
                        </Col>
                        <Col xs={12} className="mb-2">
                            <Row className="justify-content-center">
                                <WildlingCardComponent cardType={nextWildlingCard} size="smedium" tooltip />
                            </Row>
                        </Col>
                    </>
                )}
                <Col xs={12} className="mt-0">
                    <h5 className="text-center">The Wildling Deck</h5>
                </Col>
                <Col xs={12}>
                    <Row className="justify-content-center mr-0 ml-0">
                        {wildlingDeck.map(wc => <Col xs="auto" key={`wild-deck-${wc.id}`} className="justify-content-center">
                            <WildlingCardComponent cardType={wc} size="small" tooltip />
                        </Col>)}
                    </Row>
                </Col>
            </Col>
        </Popover>;
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

    injectBetweenMessages(previous: Message | null, next: Message | null): ReactNode {
        // Take the necessary votes to render, based on the `createdAt` times of
        // `previous` and `next`.
        const votesToRender = this.props.gameState.votes.values.filter(v => (previous != null ? previous.createdAt < v.createdAt : true) && (next ? v.createdAt < next.createdAt : true));
        return _.sortBy(votesToRender, v => v.createdAt).map(v => (
            <VoteComponent key={v.id} vote={v} gameClient={this.props.gameClient} ingame={this.props.gameState} />
        ));
    }

    onWindowResize(): void {
        const mobileDevice = isMobile;
        const scrollbars = this.user?.settings.mapScrollbar ?? false;

        this.windowHeight = (!mobileDevice && scrollbars) ? window.innerHeight : null;

        if (mobileDevice || !scrollbars) {
            this.housesMaxHeight = null;
            return;
        }

        if (!this.housesPanel) {
            this.housesMaxHeight = HOUSES_PANEL_MIN_HEIGHT;
            return;
        }

        let calculatedHousesHeight = Math.trunc(Math.max(window.innerHeight - this.housesPanel.getBoundingClientRect().top - BOTTOM_MARGIN_PX, HOUSES_PANEL_MIN_HEIGHT));

        if (this.gameControlsRow) { // Spectators don't have this row in their DOM
            calculatedHousesHeight -= this.gameControlsRow.offsetHeight + 8; // +8 because of the padding between the both components
        }

        // If actual height is less than calculated height, we dont need to stretch this panel
        this.housesMaxHeight = this.housesPanel.offsetHeight < calculatedHousesHeight ? null : calculatedHousesHeight;
    }

    onGameStatePanelResize(): void {
        const scrollbars = this.user?.settings.mapScrollbar ?? false;
        this.gameLogMinHeight = scrollbars ? GAME_LOG_MIN_HEIGHT : GAME_LOG_MIN_HEIGHT + 140;
        this.gameLogHeight = Math.trunc(window.innerHeight - this.gameLogPanel.getBoundingClientRect().top - BOTTOM_MARGIN_PX);

        const calculatedGameStatePanelHeight = Math.trunc((window.innerHeight - 150) * GAME_STATE_GAME_LOG_RATIO); // -150 because of the space to top and bottom and between the both panels

        this.gameStatePanelMaxHeight = isMobile || !scrollbars || this.gameStatePanel.offsetHeight < calculatedGameStatePanelHeight ? null : calculatedGameStatePanelHeight;
    }

    onNewPrivateChatRoomCreated(roomId: string): void {
        this.currentOpenedTab = roomId;
    }

    componentDidMount(): void {
        this.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
        this.props.gameState.entireGame.onNewPrivateChatRoomCreated = (roomId: string) => this.onNewPrivateChatRoomCreated(roomId);
        if (!isMobile) {
            window.addEventListener('resize', () => {
                this.onWindowResize();
                this.onGameStatePanelResize();
            });
        }

        this.resizeObserver = new ResizeObserver(() => this.onGameStatePanelResize());
        this.resizeObserver.observe(this.gameStatePanel);

        this.onWindowResize();
    }

    componentWillUnmount(): void {
        this.props.gameState.entireGame.onNewPrivateChatRoomCreated = null;
        _.pull(this.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);

        if (!isMobile) {
            window.removeEventListener('resize', () => {
                this.onWindowResize();
                this.onGameStatePanelResize();
            });
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        return this.highlightedRegions.entries;
    }
}
