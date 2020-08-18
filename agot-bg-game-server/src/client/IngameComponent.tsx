import * as React from "react";
import {Component, ReactNode} from "react";
import GameClient from "./GameClient";
import {observer} from "mobx-react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import MapComponent from "./MapComponent";
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
import castleImage from "../../public/images/icons/castle.svg";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import cancelImage from "../../public/images/icons/cancel.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import chatBubble from "../../public/images/icons/chat-bubble.svg";
import speaker from "../../public/images/icons/speaker.svg";
import speakerOff from "../../public/images/icons/speaker-off.svg";
import House from "../common/ingame-game-state/game-data-structure/House";
import housePowerTokensImages from "./housePowerTokensImages";
import marked from "marked";
import GameLogListComponent from "./GameLogListComponent";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import unitImages from "./unitImages";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import GameEndedComponent from "./game-state-panel/GameEndedComponent";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import ChatComponent from "./chat-client/ChatComponent";
import {HouseCardState} from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import HouseCardBackComponent from "./game-state-panel/utils/HouseCardBackComponent";
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
import UserLabel from "./UserLabel";
import VoteComponent from "./VoteComponent";
import IngameCancelledComponent from "./game-state-panel/IngameCancelledComponent";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import joinReactNodes from "./utils/joinReactNodes";
import NoteComponent from "./NoteComponent";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import UserSettingsComponent from "./UserSettingsComponent";

interface IngameComponentProps {
    gameClient: GameClient;
    gameState: IngameGameState;
}

@observer
export default class IngameComponent extends Component<IngameComponentProps> {
    mapControls: MapControls = new MapControls();
    @observable currentOpenedTab = (this.user && this.user.settings.lastOpenedTab) ? this.user.settings.lastOpenedTab : "chat";
    @observable height: number | null = null;

    get game(): Game {
        return this.props.gameState.game;
    }

    get user(): User | null {
        return this.props.gameClient.authenticatedUser ? this.props.gameClient.authenticatedUser : null;
    }

    render(): ReactNode {
        const phases: {name: string; gameState: any; component: typeof Component}[] = [
            {name: "Westeros", gameState: WesterosGameState, component: WesterosGameStateComponent},
            {name: "Planning", gameState: PlanningGameState, component: PlanningComponent},
            {name: "Action", gameState: ActionGameState, component: ActionComponent}
        ];

        const knowsWildlingCard = this.props.gameClient.authenticatedPlayer != null &&
            this.props.gameClient.authenticatedPlayer.house.knowsNextWildlingCard;
        const nextWildlingCard = this.game.wildlingDeck.filter(c => c.id == this.game.clientNextWildlingCardId)[0];

        const {result: canLaunchCancelGameVote, reason: canLaunchCancelGameVoteReason} = this.props.gameState.canLaunchCancelGameVote();

        const connectedSpectators = this.getConnectedSpectators();

        return (
            <>
                <Col xs={{span: "auto", order: "3"}}  xl={{span: "auto", order: "1"}}>
                    <Row className="stackable">
                        <Col>
                            <Card>
                                <ListGroup variant="flush">
                                    <ListGroupItem>
                                        <Row className="justify-content-between" style={{fontSize: "24px"}}>
                                            <Col xs="auto">
                                                <OverlayTrigger overlay={
                                                        <Tooltip id="turn">
                                                            <b>Turn</b>
                                                        </Tooltip>
                                                    }
                                                    placement="bottom">
                                                    <div>
                                                        <img src={hourglassImage} style={{marginRight: "5px"}} width={32}/>
                                                        {this.game.turn}
                                                    </div>
                                                </OverlayTrigger>
                                            </Col>
                                            <Col xs="auto">
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
                                                    placement="bottom"
                                                >
                                                    <div>
                                                        {this.game.wildlingStrength}
                                                        <img src={mammothImage} width={32} style={{marginLeft: "5px"}} className={knowsWildlingCard ? "wildling-highlight" : ""}/>
                                                    </div>
                                                </OverlayTrigger>
                                            </Col>
                                        </Row>
                                    </ListGroupItem>
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
                                                                        Once per turn, the holder of Valyrian Steel Blade can use the blade
                                                                        to increase by one the combat strength of his army in a combat.<br />
                                                                        In case of a tie in a combat, the winner is the house which is
                                                                        the highest in this tracker.<br/><br/>
                                                                        {this.props.gameState.game.valyrianSteelBladeUsed ? (
                                                                            <>The Valyrian Steel Blade has been used this turn</>
                                                                        ) : (
                                                                            <>The Valyrian Steel Blade is available</>
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
                                                        <img src={i == 0 ? stoneThroneImage : i == 1 ? diamondHiltImage : ravenImage} width={32}/>
                                                    </OverlayTrigger>
                                                </Col>
                                                {tracker.map((h, i) => (
                                                    <Col xs="auto" key={h.id}>
                                                        <InfluenceIconComponent
                                                            house={h}
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
                        <Col>
                            <Card>
                                <ListGroup variant="flush">
                                    {this.props.gameState.sortedByLeadingPlayers.map(p => (
                                        <ListGroupItem key={p.user.id}>
                                            <Row className="align-items-center">
                                                <Col xs="auto" className="pr-0">
                                                    <FontAwesomeIcon
                                                        className={classNames({"invisible": !this.props.gameClient.isAuthenticatedUser(p.user)})}
                                                        style={{color: p.house.color}}
                                                        icon={faStar}
                                                    />
                                                </Col>
                                                <Col>
                                                    <b style={{"color": p.house.color}}>{p.house.name}</b>
                                                    {" "}
                                                    <UserLabel
                                                        user={p.user}
                                                        gameState={this.props.gameState}
                                                        gameClient={this.props.gameClient}
                                                    />
                                                </Col>
                                                <Col xs="auto">
                                                    <Row className="justify-content-center align-items-center" style={{width: 110}}>
                                                        {unitTypes.values.map(type => (
                                                            <Col xs={6} key={type.id}>
                                                                <Row className="justify-content-center no-gutters align-items-center">
                                                                    <Col xs="auto">
                                                                        {this.game.getAvailableUnitsOfType(p.house, type)}
                                                                    </Col>
                                                                    <Col xs="auto" style={{marginLeft: 4}}>
                                                                        <OverlayTrigger
                                                                            overlay={this.renderUnitTypeTooltip(type)}
                                                                            delay={{ show: 250, hide: 100 }}
                                                                            placement="auto">
                                                                            <div className="unit-icon small hover-weak-outline"
                                                                                    style={{
                                                                                        backgroundImage: `url(${unitImages.get(p.house.id).get(type.id)})`,
                                                                                    }}
                                                                            />
                                                                        </OverlayTrigger>
                                                                    </Col>
                                                                </Row>
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </Col>
                                                <OverlayTrigger
                                                    overlay={this.renderTotalLandRegionsTooltip(p.house)}
                                                    delay={{ show: 250, hide: 100 }}
                                                    placement="auto"
                                                >
                                                    <Col xs="auto" className="d-flex align-items-center">
                                                        <div style={{ fontSize: "18px" }}>{this.game.getTotalHeldStructures(p.house)}</div>
                                                        <img
                                                            src={castleImage} width={32} className="hover-weak-outline"
                                                            style={{ marginLeft: "10px" }}
                                                        />
                                                    </Col>
                                                </OverlayTrigger>
                                                <Col xs="auto" className="d-flex align-items-center">
                                                    <div style={{fontSize: "18px"}}>{p.house.powerTokens}</div>
                                                    <OverlayTrigger
                                                        overlay={this.renderPowerTooltip(p.house)}
                                                        delay={{show: 250, hide: 100}}
                                                        placement="auto"
                                                    >
                                                        <div
                                                            className="house-power-token hover-weak-outline"
                                                            style={{
                                                                backgroundImage: `url(${housePowerTokensImages.get(p.house.id)})`,
                                                                marginLeft: "10px"
                                                            }}
                                                        />
                                                    </OverlayTrigger>
                                                </Col>
                                            </Row>
                                            <Row className="justify-content-center">
                                                {_.sortBy(p.house.houseCards.values, hc => hc.combatStrength).map(hc => (
                                                    <Col xs="auto" key={hc.id}>
                                                        {hc.state == HouseCardState.AVAILABLE ? (
                                                            <HouseCardComponent
                                                                houseCard={hc}
                                                                size="tiny"
                                                            />
                                                        ) : (
                                                            <HouseCardBackComponent
                                                                house={p.house}
                                                                houseCard={hc}
                                                                size="tiny"
                                                            />
                                                        )}
                                                    </Col>
                                                ))}
                                            </Row>
                                        </ListGroupItem>
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
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <button className="btn btn-outline-light btn-sm" onClick={() => this.props.gameClient.muted = !this.props.gameClient.muted}>
                                <img src={this.props.gameClient.muted ? speakerOff : speaker} width={32}/>
                            </button>
                        </Col>
                        {this.props.gameState.players.has(this.props.gameClient.authenticatedUser as User) && (
                            <Col xs="auto">
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="cancel-game-vote-tooltip">
                                            {canLaunchCancelGameVote ? (
                                                "Launch a vote to cancel the game"
                                            ) : canLaunchCancelGameVoteReason == "already-existing" ? (
                                                "A vote to cancel the game is already ongoing"
                                            ) : canLaunchCancelGameVoteReason == "already-cancelled" ? (
                                                "Game has already been cancelled"
                                            ) : canLaunchCancelGameVoteReason == "already-ended" && (
                                                "Game has already ended"
                                            )}
                                        </Tooltip>
                                    }
                                >
                                    <button
                                        className="btn btn-outline-light btn-sm"
                                        onClick={() => this.props.gameState.launchCancelGameVote()}
                                        disabled={!canLaunchCancelGameVote}
                                    >
                                        <img src={cancelImage} width={32}/>
                                    </button>
                                </OverlayTrigger>
                            </Col>
                        )}
                    </Row>
                </Col>
                <Col xs={{span: "auto", order: "2"}} xl={{span: "auto", order: "2"}}>
                    <div style={{height: this.height != null ? this.height - 90 : "auto", overflowY: this.height != null ? "scroll" : "visible", maxHeight: 1378, minHeight: 460}}>
                        <MapComponent
                            gameClient={this.props.gameClient}
                            ingameGameState={this.props.gameState}
                            mapControls={this.mapControls}
                        />
                    </div>
                </Col>
                <Col xs={{span: "8", order: "1"}} xl={{span: 3, order: "3"}}>
                    <Row className="stackable">
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
                                            [[GameEndedGameState, GameEndedComponent]],
                                            [[CancelledGameState, IngameCancelledComponent]],
                                        )
                                    )}
                                </ListGroup>
                            </Card>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
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
                                            {this.props.gameClient.authenticatedPlayer && (
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
                                                            {user.name}
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
                                                                {p.user.name}
                                                            </Dropdown.Item>
                                                        ))}
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </Nav.Item>
                                        </Nav>
                                    </Card.Header>
                                    <Card.Body style={{height: "350px"}}>
                                        <Tab.Content className="h-100">
                                            <Tab.Pane eventKey="chat" className="h-100">
                                                <ChatComponent gameClient={this.props.gameClient}
                                                               entireGame={this.props.gameState.entireGame}
                                                               roomId={this.props.gameState.entireGame.publicChatRoomId}
                                                               currentlyViewed={this.currentOpenedTab == "chat"}
                                                               injectBetweenMessages={(p, n) => this.injectBetweenMessages(p, n)}/>
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
                                            {this.props.gameClient.authenticatedPlayer && (
                                                <Tab.Pane eventKey="note" className="h-100">
                                                    <NoteComponent gameClient={this.props.gameClient} ingame={this.props.gameState} />
                                                </Tab.Pane>
                                            )}
                                            {this.getPrivateChatRooms().map(({roomId}) => (
                                                <Tab.Pane eventKey={roomId} key={roomId} className="h-100">
                                                    <ChatComponent gameClient={this.props.gameClient}
                                                                   entireGame={this.props.gameState.entireGame}
                                                                   roomId={roomId}
                                                                   currentlyViewed={this.currentOpenedTab == roomId}/>
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

    get tracks(): {name: string; tracker: House[]; stars: boolean}[] {
        return [
            {name: "Iron Throne", tracker: this.game.ironThroneTrack, stars: false},
            {name: "Fiefdoms", tracker: this.game.fiefdomsTrack, stars: false},
            {name: "King's Court", tracker: this.game.kingsCourtTrack, stars: true},
        ]
    }

    get publicChatRoom(): Channel {
        return this.props.gameClient.chatClient.channels.get(this.props.gameState.entireGame.publicChatRoomId);
    }

    private renderUnitTypeTooltip(unitType: UnitType): ReactNode {
        return <Tooltip id={unitType.id + "-tooltip"}>
            <b>{unitType.name}</b><br/>
            <small>{unitType.description}</small>
        </Tooltip>;
    }

    private renderTotalLandRegionsTooltip(house: House): ReactNode {
        return <Tooltip id={house.id + "-total-land-regions"}>
            <h5>Total Land Areas</h5><br/><h4 style={{textAlign: "center"}}><b>{this.game.getTotalControlledLandRegions(house)}</b></h4>
        </Tooltip>;
    }

    private renderPowerTooltip(house: House): ReactNode {
        const availablePower =  house.powerTokens;
        const powerTokensOnBoard = this.game.countPowerTokensOnBoard(house);
        const powerInPool = this.game.maxPowerTokens - availablePower - powerTokensOnBoard;

        return <Tooltip id={house.id + "-power-tooltip"}>
            <b>{house.name}</b><br/>
            <small>Available: </small><b>{availablePower}</b><br/>
            <small>On the board: </small><b>{powerTokensOnBoard}</b><br/>
            <small>Power Pool: </small><b>{powerInPool}</b>
        </Tooltip>;
    }

    private renderRemainingWesterosCards(): ReactNode {
        const remainingCards = this.game.remainingWesterosCardTypes;

        return <Tooltip id="remaining-westeros-cards" className="westeros-tooltip">
            <h5 style={{textAlign: "center"}}>Remaining Westeros Cards</h5>
            <table cellPadding="5">
                <thead>
                    <tr>
                        {remainingCards.map((_, i) =>
                            <th key={"westeros-deck-" + i + "-header"} style={{textAlign: "center"}}>Deck {i + 1}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {remainingCards.map((rc, i) =>
                            <td key={"westeros-deck-" + i + "-data"}>
                                {rc.entries.map(([wc, count], j) => <div key={"westeros-deck-" + i + "-" + j + "-data"}><small>{wc.name}</small> ({count})</div>)}
                            </td>
                        )}
                    </tr>
                </tbody>
            </table>
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
        console.log(votesToRender);
        return _.sortBy(votesToRender, v => v.createdAt).map(v => (
            <VoteComponent key={v.id} vote={v} gameClient={this.props.gameClient} ingame={this.props.gameState} />
        ));
    }

    adjustMapHeight(): void {
        this.height = (this.user && this.user.settings.mapScrollbar) ? window.innerHeight : null;
    }

    componentDidMount(): void {
        this.adjustMapHeight();
        window.addEventListener('resize', () => this.adjustMapHeight());

    }

    componentWillUnmount(): void {
        window.removeEventListener('resize', () => this.adjustMapHeight());
    }
}
