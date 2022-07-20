import * as React from "react";
import {Component, ReactNode} from "react";
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
import { toast } from "react-toastify";
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
import stopwatchPlus15Image from "../../public/images/icons/stopwatch-plus-15.svg";
import pauseImage from "../../public/images/icons/pause-button.svg";
import playImage from "../../public/images/icons/play-button.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import spikedDragonHeadImage from "../../public/images/icons/spiked-dragon-head.svg";
import megaphoneImage from "../../public/images/icons/megaphone.svg";
import speakerOffImage from "../../public/images/icons/speaker-off.svg";
import musicalNotesImage from "../../public/images/icons/musical-notes.svg";
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
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import unitImages from "./unitImages";
import { tidesOfBattleCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import DraftInfluencePositionsGameState from "../common/ingame-game-state/draft-influence-positions-game-state/DraftInfluencePositionsGameState";
import DraftInfluencePositionsComponent from "./game-state-panel/DraftInfluencePositionsComponent";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import { faCheckToSlot, faRightLeft, faUniversity } from "@fortawesome/free-solid-svg-icons";
import joinNaturalLanguage from "./utils/joinNaturalLanguage";
import PayDebtsGameState from "../common/ingame-game-state/pay-debts-game-state/PayDebtsGameState";
import PayDebtsComponent from "./game-state-panel/PayDebtsComponent";
import BetterMap from "../utils/BetterMap";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import PartialRecursive from "../utils/PartialRecursive";
import ChooseInitialObjectivesGameState from "../common/ingame-game-state/choose-initial-objectives-game-state/ChooseInitialObjectivesGameState";
import ChooseInitialObjectivesComponent from "./game-state-panel/ChooseInitialObjectivesComponent";
import ObjectivesInfoComponent from "./ObjectivesInfoComponent";
import { Button, FormCheck, Modal, Popover } from "react-bootstrap";
import WesterosCardComponent from "./game-state-panel/utils/WesterosCardComponent";
import ConditionalWrap from "./utils/ConditionalWrap";
import WildlingCardType from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";
import getIngameUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";
import IronBankTabComponent from "./IronBankTabComponent";
import { CombatStats } from "../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import sleep from "../utils/sleep";
import CombatInfoComponent from "./CombatInfoComponent";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import houseIconImages from "./houseIconImages";
import { preemptiveRaid } from "../common/ingame-game-state/game-data-structure/wildling-card/wildlingCardTypes";
import VotesListComponent from "./VotesListComponent";
import voteSound from "../../public/sounds/vote-started.ogg";

interface ColumnOrders {
    gameStateColumn: number;
    mapColumn: number;
    housesInfosColumn: number;
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

@observer
export default class IngameComponent extends Component<IngameComponentProps> {
    mapControls: MapControls = new MapControls();
    @observable currentOpenedTab = this.user?.settings.lastOpenedTab ?? (this.props.gameState.entireGame.gameSettings.pbem ? "game-logs" : "chat");
    @observable housesInfosCollapsed = this.user?.settings.tracksColumnCollapsed ?? false;
    @observable highlightedRegions = new BetterMap<Region, PartialRecursive<RegionOnMapProperties>>();
    @observable showMapScrollbarInfo = false;
    @observable columnSwapAnimationClassName = "";
    modifyRegionsOnMapCallback: any;
    onVisibilityChangedCallback: (() => void) | null = null;

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

    get mapScrollbarEnabled(): boolean {
        return !isMobile && (this.user?.settings.mapScrollbar ?? true);
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

    constructor(props: IngameComponentProps) {
        super(props);
        // Check for Dance with Dragons house cards
        if (props.gameState.entireGame.gameSettings.adwdHouseCards) {
            // Replace Stark images with Bolton images for DwD
            houseCardsBackImages.set("stark", houseCardsBackImages.get("bolton"));
            houseInfluenceImages.set("stark", houseInfluenceImages.get("bolton"));
            houseOrderImages.set("stark", houseOrderImages.get("bolton"));
            housePowerTokensImages.set("stark", housePowerTokensImages.get("bolton"));
            unitImages.set("stark", unitImages.get("bolton"));
            houseIconImages.set("stark", houseIconImages.get("bolton"));

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
        const draftHouseCards = this.props.gameState.childGameState instanceof DraftHouseCardsGameState;

        const columnOrders = this.getColumnOrders(this.user?.settings.responsiveLayout);

        const showMap = !draftHouseCards || this.user?.settings.showMapWhenDrafting;

        const col1MinWidth = this.ingame.entireGame.gameSettings.playerCount >= 8 ? "485px" : "470px";

        return <>
                <Row className="justify-content-center" style={{maxHeight: this.mapScrollbarEnabled ? "95vh" : "none"}}>
                    <Col xs={{order: columnOrders.gameStateColumn}} className={this.columnSwapAnimationClassName}
                        style={{maxHeight: this.mapScrollbarEnabled ? "100%" : "none", minWidth: col1MinWidth, maxWidth: draftHouseCards ? "1200px" : "800px"}}
                    >
                        {this.renderGameStateColumn()}
                    </Col>
                    {showMap && <Col xs={{span: "auto", order: columnOrders.mapColumn}} style={{maxHeight: this.mapScrollbarEnabled ? "100%" : "none"}}>
                        <div id="map-component" style={{height: this.mapScrollbarEnabled ? "100%" : "auto", overflowY: "auto", overflowX: "hidden", maxHeight: MAP_HEIGHT}}>
                            <MapComponent
                                gameClient={this.props.gameClient}
                                ingameGameState={this.props.gameState}
                                mapControls={this.mapControls}
                                collapseClicked={() => this.housesInfosCollapsed = !this.housesInfosCollapsed}
                            />
                        </div>
                    </Col>}
                    {(!this.housesInfosCollapsed || isMobile) && (
                    <Col xs={{ span: "auto", order: columnOrders.housesInfosColumn }} className={this.columnSwapAnimationClassName}
                        style={{maxHeight: this.mapScrollbarEnabled ? "100%" : "none"}}
                    >
                        {this.renderHousesColumn()}
                    </Col>)}
                </Row>
                <Modal
                    show={this.showMapScrollbarInfo}
                    onHide={() => this.showMapScrollbarInfo = false} animation={false}
                    backdrop="static"
                    keyboard={false}
                    centered
                >
                    <Modal.Body>
                        <div className="text-center">
                            The game is optimized for HD resolutions.<br/>
                            You are using a lower resolution and for a pleasant gaming experience you should
                            play around with the zoom level of your browser and the <b>Map scrollbar</b> setting.
                            You can find it by clicking on the gear icon.<br/><br/>
                            <small><i>In your profile settings you can change the default behavior for this setting<br/>
                            for all <b>future</b> games.</i></small>
                        </div>
                    </Modal.Body>
                    <Modal.Footer style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
                        <FormCheck
                            id="dont-show-again-setting"
                            type="switch"
                            label={<label htmlFor="dont-show-again-setting">Don&apos;t show again</label>}
                            checked={this.user?.settings.dontShowMapScrollbarInfoAgain}
                            onChange={() => {
                                if (!this.user) {
                                    return;
                                }
                                this.user.settings.dontShowMapScrollbarInfoAgain = !this.user.settings.dontShowMapScrollbarInfoAgain;
                                this.user.syncSettings();
                            }}
                        />
                        <Button variant="primary" onClick={() => this.showMapScrollbarInfo = false}>
                            Ok
                        </Button>
                    </Modal.Footer>
                </Modal>
        </>;
    }

    renderHousesColumn(): ReactNode {
        const {result: canLaunchCancelGameVote, reason: canLaunchCancelGameVoteReason} = this.props.gameState.canLaunchCancelGameVote(this.authenticatedPlayer);
        const {result: canLaunchEndGameVote, reason: canLaunchEndGameVoteReason} = this.props.gameState.canLaunchEndGameVote(this.authenticatedPlayer);
        const {result: canLaunchPauseGameVote, reason: canLaunchPauseGameVoteReason} = this.props.gameState.canLaunchPauseGameVote(this.authenticatedPlayer);
        const {result: canLaunchResumeGameVote, reason: canLaunchResumeGameVoteReason} = this.props.gameState.canLaunchResumeGameVote(this.authenticatedPlayer);
        const {result: canLaunchExtendPlayerClocksVote, reason: canLaunchExtendPlayerClocksVoteReason} = this.props.gameState.canLaunchExtendPlayerClocksVote(this.authenticatedPlayer);

        const connectedSpectators = this.getConnectedSpectators();

        return (
            <div className={this.mapScrollbarEnabled ? "flex-ratio-container" : ""}>
                <Card className={this.mapScrollbarEnabled ? "flex-sized-to-content" : ""} style={{marginBottom: "10px"}}>
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
                    <button className="btn btn-outline-light btn-sm" onClick={async() => {
                            if (this.user && this.columnSwapAnimationClassName == "") {
                                this.columnSwapAnimationClassName = "animate__animated animate__fadeIn"
                                this.user.settings.responsiveLayout = !this.user.settings.responsiveLayout;
                                await sleep(950);
                                this.columnSwapAnimationClassName = "";
                            }
                        }}
                        style={{position: "absolute", left: "0px", padding: "8px", borderStyle: "none"}}
                    >
                        <FontAwesomeIcon icon={faRightLeft} style={{color: "white"}}/>
                    </button>
                </Card>
                <Card className={this.mapScrollbarEnabled ? "flex-fill-remaining" : ""} style={{marginBottom: "10px"}}>
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
                            <ListGroupItem className="text-center font-italic" style={{ maxWidth: 500 }}>
                                <>
                                    {connectedSpectators.length > 0 ? (
                                        <>Spectators: {joinReactNodes(this.getConnectedSpectators().map(u => <b key={u.id}>{getIngameUserLinkOrLabel(this.props.gameState, u, null)}</b>), ", ")}</>
                                    ) : (
                                        <>No spectators</>
                                    )}
                                </>
                            </ListGroupItem>
                        </ListGroup>
                    </Card.Body>
                </Card>
                <Row className={this.mapScrollbarEnabled ? "flex-footer" : ""} id="game-controls">
                    <Col xs="auto">
                        <button className="btn btn-outline-light btn-sm" onClick={() => this.props.gameClient.muted = !this.props.gameClient.muted}>
                            <OverlayTrigger
                                overlay={
                                    <Tooltip id="mute-tooltip">
                                        {this.props.gameClient.muted
                                            ? "Unmute notifications"
                                            : "Mute notifications"}
                                    </Tooltip>
                                }
                            >
                                <img src={this.props.gameClient.muted ? speakerOffImage : megaphoneImage} width={32} />
                            </OverlayTrigger>
                        </button>
                    </Col>
                    <Col xs="auto">
                        <button className="btn btn-outline-light btn-sm" onClick={() => this.props.gameClient.musicMuted = !this.props.gameClient.musicMuted}>
                            <OverlayTrigger
                                overlay={
                                    <Tooltip id="mute-tooltip">
                                        {this.props.gameClient.musicMuted
                                            ? "Unmute music"
                                            : "Mute music"}
                                    </Tooltip>
                                }
                            >
                                <img src={this.props.gameClient.musicMuted ? speakerOffImage : musicalNotesImage} width={32} />
                            </OverlayTrigger>
                        </button>
                    </Col>
                    {this.authenticatedPlayer && <>
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
                                            ) : canLaunchCancelGameVoteReason == "not-enough-voter" ? (
                                                "There are not enough voters left in the game"
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
                                            ) : canLaunchEndGameVoteReason == "not-enough-voter" ? (
                                                "There are not enough voters left in the game"
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
                        {this.ingame.entireGame.gameSettings.onlyLive && !this.ingame.paused &&
                        <Col xs="auto">
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={() => this.props.gameState.launchPauseGameVote()}
                                disabled={!canLaunchPauseGameVote}
                            >
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="pause-game-vote-tooltip">
                                            {canLaunchPauseGameVote ? (
                                                "Launch a vote to pause the game"
                                            ) : canLaunchPauseGameVoteReason == "only-players-can-vote" ? (
                                                "Only participating players can vote"
                                            ) : canLaunchPauseGameVoteReason == "already-existing" ? (
                                                "A vote to pause the game is already ongoing"
                                            ) : canLaunchPauseGameVoteReason == "already-cancelled" ? (
                                                "Game has already been cancelled"
                                            ) : canLaunchPauseGameVoteReason == "already-ended" ? (
                                                "Game has already ended"
                                            ) : "Vote not possible"}
                                        </Tooltip>}
                                >
                                    <img src={pauseImage} width={32} />
                                </OverlayTrigger>
                            </button>
                        </Col>}
                        {this.ingame.entireGame.gameSettings.onlyLive && this.ingame.paused &&
                        <Col xs="auto">
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={() => this.props.gameState.launchResumeGameVote()}
                                disabled={!canLaunchResumeGameVote}
                            >
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="resume-game-vote-tooltip">
                                            {canLaunchResumeGameVote ? (
                                                "Launch a vote to resume the game"
                                            ) : canLaunchResumeGameVoteReason == "only-players-can-vote" ? (
                                                "Only participating players can vote"
                                            ) : canLaunchResumeGameVoteReason == "already-existing" ? (
                                                "A vote to resume the game is already ongoing"
                                            ) : canLaunchResumeGameVoteReason == "already-cancelled" ? (
                                                "Game has already been cancelled"
                                            ) : canLaunchResumeGameVoteReason == "already-ended" ? (
                                                "Game has already ended"
                                            ) : "Vote not possible"}
                                        </Tooltip>}
                                >
                                    <img src={playImage} width={32} />
                                </OverlayTrigger>
                            </button>
                        </Col>}
                        {this.ingame.entireGame.gameSettings.onlyLive &&
                        <Col xs="auto">
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={() => this.props.gameState.launchExtendPlayerClocksVote()}
                                disabled={!canLaunchExtendPlayerClocksVote}
                            >
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="extend-clocks-vote-tooltip">
                                            {canLaunchExtendPlayerClocksVote ? (
                                                "Launch a vote to extend all player clocks by 15 minutes"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "not-enough-voter" ? (
                                                "There are not enough voters left in the game"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "only-players-can-vote" ? (
                                                "Only participating players can vote"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "already-existing" ? (
                                                "A vote to extend all clocks is already ongoing"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "already-extended" ? (
                                                "Player clocks have already been extended"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "max-vote-count-reached" ? (
                                                "The maximum amount of votes was reached"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "already-cancelled" ? (
                                                "Game has already been cancelled"
                                            ) : canLaunchExtendPlayerClocksVoteReason == "already-ended" ? (
                                                "Game has already ended"
                                            ) : "Vote not possible"}
                                        </Tooltip>}
                                >
                                    <img src={stopwatchPlus15Image} width={32} />
                                </OverlayTrigger>
                            </button>
                        </Col>}
                    </>}
                </Row>
            </div>)
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

        const gameRunning = !this.ingame.isEnded && !this.ingame.isCancelled;
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

        const border = this.props.gameClient.isOwnTurn() ?
            "warning" : this.props.gameState.childGameState instanceof CancelledGameState ?
            "danger" : undefined;

        const getPhaseHeader = (phase: GameStatePhaseProps): JSX.Element => this.props.gameState.childGameState instanceof phase.gameState
                ? <b className={classNames("weak-text-outline", { "clickable dropdown-toggle": phase.name == "Westeros" })}>{phase.name} phase</b>
                : <span className={classNames("text-muted", { "clickable dropdown-toggle": phase.name == "Westeros" })}>{phase.name} phase</span>;

        return <div className={this.mapScrollbarEnabled ? "flex-ratio-container" : ""}>
            <Card id="game-state-panel" className={this.mapScrollbarEnabled ? "flex-sized-to-content" : ""} border={border} style={{maxHeight: this.mapScrollbarEnabled ? "70%" : "none", paddingRight: "10px", marginBottom: "10px", borderWidth: "3px" }}>
                <Row className="no-space-around">
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
                            <Row className="mx-0 clickable-no-underline hover-weak-text-outline">
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
                <button className="btn btn-outline-light btm-sm" onClick={async() => {
                        if (this.user && this.columnSwapAnimationClassName == "") {
                            this.columnSwapAnimationClassName = "animate__animated animate__fadeIn"
                            this.user.settings.responsiveLayout = !this.user.settings.responsiveLayout;
                            await sleep(950);
                            this.columnSwapAnimationClassName = "";
                        }
                    }}
                    style={{position: "absolute", left: "0px", padding: "8px", borderStyle: "none"}}
                >
                    <FontAwesomeIcon icon={faRightLeft} style={{color: "white"}}/>
                </button>
            </Card>
            <Card style={{height: this.mapScrollbarEnabled ? "auto" : "800px"}} className={this.mapScrollbarEnabled ? "flex-fill-remaining" : ""}>
                <Tab.Container activeKey={this.currentOpenedTab}
                    onSelect={k => {
                        if (k) {
                            this.currentOpenedTab = k;
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
                                <div className={classNames({ "new-event": this.publicChatRoom.areThereUnreadMessages })}>
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
                            <Nav.Item>
                                <div className={classNames({ "new-event": this.props.gameClient.authenticatedPlayer?.isNeededForVote })}>
                                    <Nav.Link eventKey="votes">
                                        <OverlayTrigger
                                            overlay={<Tooltip id="votes-tooltip">Votes</Tooltip>}
                                            placement="top"
                                        >
                                            <span>
                                                <FontAwesomeIcon
                                                    style={{ color: "white" }}
                                                    icon={faCheckToSlot} />
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
                            {this.ingame.game.ironBank && this.ingame.entireGame.gameSettings.playerCount < 8 && (
                                <Nav.Item>
                                    <Nav.Link eventKey="iron-bank">
                                        <OverlayTrigger
                                            overlay={<Tooltip id="iron-bank-tooltip">The Iron Bank</Tooltip>}
                                            placement="top"
                                        >
                                            <span>
                                                <FontAwesomeIcon
                                                    style={{ color: "white" }}
                                                    icon={faUniversity} />
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
                            {this.authenticatedPlayer && !this.props.gameState.entireGame.gameSettings.noPrivateChats &&
                            <Nav.Item>
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
                                                {this.getUserDisplayNameLabel(p.user)}
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </Nav.Item>}
                            {this.getPrivateChatRooms().map(({ user, roomId }) => (
                                <Nav.Item key={roomId}>
                                    <div className={classNames({ "new-event": this.getPrivateChatRoomForPlayer(user).areThereUnreadMessages })}>
                                        <Nav.Link eventKey={roomId}>
                                            {this.getUserDisplayNameLabel(user)}
                                        </Nav.Link>
                                    </div>
                                </Nav.Item>
                            ))}
                        </Nav>
                    </Card.Header>
                    <Card.Body id="game-log-panel">
                        {/* This is an invisible div to force the parent to stretch to its remaining width */}
                        <div style={{visibility: "hidden", width: "850px"}} />
                        <Tab.Content className="h-100">
                            <Tab.Pane eventKey="chat" className="h-100">
                                <ChatComponent gameClient={this.props.gameClient}
                                    entireGame={this.props.gameState.entireGame}
                                    roomId={this.props.gameState.entireGame.publicChatRoomId}
                                    currentlyViewed={this.currentOpenedTab == "chat"}
                                    injectBetweenMessages={(p, n) => this.injectBetweenMessages(p, n)}
                                    getUserDisplayName={u => <b>{getIngameUserLinkOrLabel(this.ingame, u, this.ingame.players.tryGet(u, null), this.user?.settings.chatHouseNames)}</b>} />
                            </Tab.Pane>
                            <Tab.Pane eventKey="votes" className="h-100">
                                <ScrollToBottom className="h-100" scrollViewClassName="overflow-x-hidden">
                                    <VotesListComponent gameClient={this.props.gameClient} ingame={this.props.gameState} />
                                </ScrollToBottom>
                            </Tab.Pane>
                            <Tab.Pane eventKey="game-logs" className="h-100">
                                <ScrollToBottom className="h-100" scrollViewClassName="overflow-x-hidden">
                                    <GameLogListComponent ingameGameState={this.props.gameState} gameClient={this.props.gameClient} currentlyViewed={this.currentOpenedTab == "game-logs"}/>
                                </ScrollToBottom>
                            </Tab.Pane>
                            <Tab.Pane eventKey="settings" className="h-100">
                                <GameSettingsComponent gameClient={this.props.gameClient}
                                    entireGame={this.props.gameState.entireGame} />
                                <div style={{marginTop: -20}} >
                                    <UserSettingsComponent user={this.user}
                                        entireGame={this.props.gameState.entireGame}
                                    />
                                </div>
                            </Tab.Pane>
                            <Tab.Pane eventKey="objectives" className="h-100">
                                <div className="d-flex flex-column h-100" style={{overflowY: "scroll"}}>
                                    <ObjectivesInfoComponent ingame={this.ingame} gameClient={this.props.gameClient}/>
                                </div>
                            </Tab.Pane>
                            {this.game.ironBank && <Tab.Pane eventKey="iron-bank" className="h-100">
                                <div className="d-flex flex-column h-100" style={{overflowY: "scroll"}}>
                                    <IronBankTabComponent ingame={this.ingame} ironBank={this.game.ironBank} />
                                </div>
                            </Tab.Pane>}
                            <Tab.Pane eventKey="note" className="h-100">
                                <NoteComponent gameClient={this.props.gameClient} ingame={this.props.gameState} />
                            </Tab.Pane>
                            {this.getPrivateChatRooms().map(({ roomId }) => (
                                <Tab.Pane eventKey={roomId} key={roomId} className="h-100">
                                    <ChatComponent gameClient={this.props.gameClient}
                                        entireGame={this.props.gameState.entireGame}
                                        roomId={roomId}
                                        currentlyViewed={this.currentOpenedTab == roomId}
                                        getUserDisplayName={u => <b>{getIngameUserLinkOrLabel(this.ingame, u, this.ingame.players.tryGet(u, null), this.user?.settings.chatHouseNames)}</b>} />
                                </Tab.Pane>
                            ))}
                        </Tab.Content>
                    </Card.Body>
                </Tab.Container>
            </Card>
        </div>
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
        const roundsWhenIncreased = this.game.dragonStrengthTokens.filter(onRound => onRound > this.game.turn);
        return <Tooltip id="dragon-strength-tooltip">
            <div className="m-1 text-center">
                <h6>Current Dragon Strength</h6>
                {roundsWhenIncreased.length > 0 && <p>Will increase in round<br/>{joinNaturalLanguage(roundsWhenIncreased)}</p>}
            </div>
        </Tooltip>
    }

    getColumnOrders(alignGameStateToTheRight?: boolean): ColumnOrders {
        return alignGameStateToTheRight
            ? { housesInfosColumn: 1, mapColumn: 2, gameStateColumn: 3 }
            : { gameStateColumn: 1, mapColumn: 2, housesInfosColumn: 3 };
    }

    getUserDisplayNameLabel(user: User): React.ReactNode {
        const player = this.props.gameState.players.tryGet(user, null);
        const displayName = !this.user?.settings.chatHouseNames || !player
            ? user.name
            : player.house.name;

        return <ConditionalWrap
            condition={!player}
            wrap={children =>
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
            }
        >
            {/* Spectators are shown in burlywood brown */}
            <b style={{ color: player?.house.color ?? "#deb887" }}>{displayName}</b>
        </ConditionalWrap>
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
        const users = _.sortBy([this.user as User, p.user], u => u.id);

        if (!this.props.gameState.entireGame.privateChatRoomsIds.has(users[0]) || !this.props.gameState.entireGame.privateChatRoomsIds.get(users[0]).has(users[1])) {
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
        return this.props.gameState.entireGame.getPrivateChatRoomsOf(this.user as User);
    }

    getPrivateChatRoomForPlayer(u: User): Channel {
        const users = _.sortBy([this.user as User, u], u => u.id);

        return this.props.gameClient.chatClient.channels.get(this.props.gameState.entireGame.privateChatRoomsIds.get(users[0]).get(users[1]));
    }

    getOtherPlayers(): Player[] {
        return _.sortBy(this.props.gameState.players.values,
            p => this.user?.settings.chatHouseNames ? p.house.name : p.user.name)
            .filter(p => p.user != this.user);
    }

    injectBetweenMessages(_previous: Message | null, _next: Message | null): ReactNode {
        return null;
    }

    onNewPrivateChatRoomCreated(roomId: string): void {
        this.currentOpenedTab = roomId;
    }

    onVisibilityChanged(): void {
        if (document.visibilityState == "visible" || !this.user) {
            return;
        }

        if (this.currentOpenedTab != this.user.settings.lastOpenedTab ||
            this.housesInfosCollapsed != this.user.settings.tracksColumnCollapsed) {
                this.user.settings.lastOpenedTab = this.currentOpenedTab;
                this.user.settings.tracksColumnCollapsed = this.housesInfosCollapsed;
                this.user.syncSettings();
        }
    }

    getCombatFastTrackedComponent(stats: CombatStats[]): React.ReactNode {
        const winners = stats.filter(cs => cs.isWinner);
        const winner = winners.length > 0
            ? this.game.houses.get(winners[0].house)
            : null;

        const houseCombatDatas = stats.map(stat => {
            const house = this.game.houses.get(stat.house);
            const houseCard = stat.houseCard ? this.game.getHouseCardById(stat.houseCard) : null;
            const tidesOfBattleCard = stat.tidesOfBattleCard === undefined
                ? undefined
                : stat.tidesOfBattleCard != null
                    ? tidesOfBattleCards.get(stat.tidesOfBattleCard)
                    : null;

            return {
                ...stat,
                house,
                region: this.game.world.regions.get(stat.region),
                houseCard: houseCard,
                armyUnits: stat.armyUnits.map(ut => unitTypes.get(ut)),
                woundedUnits: stat.woundedUnits.map(ut => unitTypes.get(ut)),
                tidesOfBattleCard: tidesOfBattleCard};
            });

        return <div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <h5>Battle results for <b>{houseCombatDatas[1].region.name}</b></h5>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CombatInfoComponent
                    housesCombatData={houseCombatDatas}
                />
            </div>
            {winner && <p className="text-center mt-2">
                Winner: <b style={{"color": winner.color}}>{winner.name}</b>
            </p>}
        </div>;
    }

    getWildlingsAttackFastTrackedComponent(
        wildlingCard: WildlingCardType,
        biddings: [number, House[]][] | null,
        highestBidder: House | null,
        lowestBidder: House | null) : React.ReactNode {
            const results = biddings
                ? _.flatMap(biddings.map(([bid, houses]) => houses.map(h => [h, bid] as [House, number])))
                : null;

            return <div>
                <h5 className="text-center mb-2">{highestBidder ? "Night's watch victory" : "Wildling victory"}</h5>
                <div className="d-flex justify-content-center">
                    <WildlingCardComponent cardType={wildlingCard}/>
                </div>
                {results && <div className="d-flex justify-content-center mt-2">
                    <HouseNumberResultsComponent results={results} keyPrefix="wildling-biddings"/>
                </div>}
                {highestBidder && <p className="text-center mt-2">
                    Highest Bidder: <b style={{"color": highestBidder.color}}>{highestBidder.name}</b>
                </p>}
                {lowestBidder && <p className="text-center mt-2">
                    Lowest Bidder: <b style={{"color": lowestBidder.color}}>{lowestBidder.name}</b>
                </p>}
            </div>;
    }

    componentDidMount(): void {
        this.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
        this.props.gameState.entireGame.onNewPrivateChatRoomCreated = (roomId: string) => this.onNewPrivateChatRoomCreated(roomId);

        const visibilityChangedCallback = (): void => this.onVisibilityChanged();
        document.addEventListener("visibilitychange", visibilityChangedCallback);
        this.onVisibilityChangedCallback = visibilityChangedCallback;

        const dontShowAgain = this.user?.settings.dontShowMapScrollbarInfoAgain ?? false;
        if (screen.width < 1920 && screen.height < 1080 && this.mapScrollbarEnabled && !dontShowAgain) {
            this.showMapScrollbarInfo = true;
        }

        this.ingame.entireGame.onCombatFastTracked = (stats) => {
            if (stats.length == 0) return;
            toast(this.getCombatFastTrackedComponent(stats));
        }

        this.ingame.entireGame.onWildingsAttackFastTracked =
            (wildlingCard, biddings, highestBidder, lowestBidder) => {
                toast(this.getWildlingsAttackFastTrackedComponent(wildlingCard, biddings, highestBidder, lowestBidder));
            }

        this.ingame.onPreemptiveRaidNewAttack = (biddings, highestBidder) => {
            toast(this.getWildlingsAttackFastTrackedComponent(preemptiveRaid, biddings, highestBidder, null));
        }

        this.ingame.onVoteStarted = () => {
            if (!this.props.gameClient.muted) {
                const audio = new Audio(voteSound);
                audio.play();
            }
        }
    }

    componentWillUnmount(): void {
        this.props.gameState.entireGame.onNewPrivateChatRoomCreated = null;
        _.pull(this.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);

        const visibilityChangedCallback = this.onVisibilityChangedCallback;
        if (visibilityChangedCallback) {
            document.removeEventListener("visibilitychange", visibilityChangedCallback);
        }

        this.ingame.entireGame.onWildingsAttackFastTracked = null;
        this.ingame.entireGame.onCombatFastTracked = null;
        this.ingame.onPreemptiveRaidNewAttack = null;
        this.ingame.onVoteStarted = null;
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        return this.highlightedRegions.entries;
    }
}
