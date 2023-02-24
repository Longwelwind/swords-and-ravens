import * as React from "react";
import {Component, ReactNode} from "react";
import GameClient from "./GameClient";
import {observer} from "mobx-react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { MAP_HEIGHT } from "./MapComponent";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import * as _ from "lodash";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faStar} from "@fortawesome/free-solid-svg-icons/faStar";
import Tooltip from "react-bootstrap/Tooltip";
import stoneThroneImage from "../../public/images/icons/stone-throne.svg";
import ravenImage from "../../public/images/icons/raven.svg";
import diamondHiltImage from "../../public/images/icons/diamond-hilt.svg";
import diamondHiltUsedImage from "../../public/images/icons/diamond-hilt-used.svg";
import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import spikedDragonHeadImage from "../../public/images/icons/spiked-dragon-head.svg";
import podiumWinnerImage from "../../public/images/icons/podium-winner.svg";
import House from "../common/ingame-game-state/game-data-structure/House";
import GameLogListComponent from "./GameLogListComponent";
import Game, { EntireGameSnapshot as EntireGameSnapshot, GameSnapshot, MAX_WILDLING_STRENGTH } from "../common/ingame-game-state/game-data-structure/Game";
import SupplyTrackComponent from "./game-state-panel/utils/SupplyTrackComponent";
import Dropdown from "react-bootstrap/Dropdown";
import User from "../server/User";
import Player from "../common/ingame-game-state/Player";
import {observable} from "mobx";
import classNames from "classnames";
// @ts-expect-error Somehow this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";
import { GameSettings } from '../common/EntireGame';
import {isMobile} from 'react-device-detect';
import houseCardsBackImages from "./houseCardsBackImages";
import houseInfluenceImages from "./houseInfluenceImages";
import houseOrderImages from "./houseOrderImages";
import housePowerTokensImages from "./housePowerTokensImages";
import unitImages from "./unitImages";
import { faCog, faHistory, faRightLeft, faUniversity } from "@fortawesome/free-solid-svg-icons";
import BetterMap from "../utils/BetterMap";
import { Nav, Spinner, Tab } from "react-bootstrap";
import houseIconImages from "./houseIconImages";
import WorldSnapshotComponent from "./WorldSnapshotComponent";
import { houseColorFilters } from "./houseColorFilters";
import HouseCard from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import HouseSnapshotComponent from "./HouseSnapshotComponent";
import { RegionSnapshot } from "../common/ingame-game-state/game-data-structure/Region";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import GameSettingsComponent from "./GameSettingsComponent";
import UserSettingsComponent from "./UserSettingsComponent";
import IronBankSnapshotTabComponent from "./IronBankSnapshotTabComponent";

interface ColumnOrders {
    gameStateColumn: number;
    mapColumn: number;
    housesInfosColumn: number;
}

interface ReplayComponentProps {
    gameClient: GameClient;
    ingame: IngameGameState;
    entireGameSnapshot: EntireGameSnapshot;
}

@observer
export default class ReplayComponent extends Component<ReplayComponentProps> {
    @observable currentOpenedTab = "game-logs";
    @observable housesInfosCollapsed = this.user?.settings.tracksColumnCollapsed ?? false;
    @observable columnSwapAnimationClassName = "";

    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get worldSnapshot(): RegionSnapshot[] {
        return this.props.entireGameSnapshot.worldSnapshot;
    }

    get gameSnapshot(): GameSnapshot | undefined {
        return this.props.entireGameSnapshot.gameSnapshot;
    }

    get gameSettings(): GameSettings {
        return this.ingame.entireGame.gameSettings;
    }

    get user(): User | null {
        return this.gameClient.authenticatedUser ? this.gameClient.authenticatedUser : null;
    }

    get authenticatedPlayer(): Player | null {
        return this.gameClient.authenticatedPlayer;
    }

    get mapScrollbarEnabled(): boolean {
        return !isMobile && (this.user?.settings.mapScrollbar ?? true);
    }

    get gameClient(): GameClient {
        return this.props.gameClient;
    }

    get tracks(): {track: (House | null)[]; stars: boolean}[] {
        if (!this.gameSnapshot) {
            return [];
        }
        const ironThrone = this.gameSnapshot.ironThroneTrack.map(h => this.game.houses.get(h));
        const fiefdoms = this.gameSnapshot.fiefdomsTrack.map(h => this.game.houses.get(h));
        const kingsCourt = this.gameSnapshot.kingsCourtTrack.map(h => this.game.houses.get(h));

        return [
            { track: ironThrone, stars: false},
            { track: fiefdoms, stars: false},
            { track: kingsCourt, stars: true}
        ]
    }

    constructor(props: ReplayComponentProps) {
        super(props);
        // Check for Dance with Dragons house cards
        if (props.ingame.entireGame.gameSettings.adwdHouseCards) {
            // Replace Stark images with Bolton images for DwD
            houseCardsBackImages.set("stark", houseCardsBackImages.get("bolton"));
            houseInfluenceImages.set("stark", houseInfluenceImages.get("bolton"));
            houseOrderImages.set("stark", houseOrderImages.get("bolton"));
            housePowerTokensImages.set("stark", housePowerTokensImages.get("bolton"));
            unitImages.set("stark", unitImages.get("bolton"));
            houseIconImages.set("stark", houseIconImages.get("bolton"));
            houseColorFilters.set("stark", houseColorFilters.get("bolton"));
        }
    }

    render(): ReactNode {
        const columnOrders = this.getColumnOrders(this.user?.settings.responsiveLayout);

        const col1MinWidth = this.gameSettings.playerCount >= 8 ? "485px" : "470px";

        return <Row className="justify-content-center" style={{maxHeight: this.mapScrollbarEnabled ? "95vh" : "none"}}>
            <Col xs={{order: columnOrders.gameStateColumn}} className={this.columnSwapAnimationClassName}
                style={{maxHeight: this.mapScrollbarEnabled ? "100%" : "none", minWidth: col1MinWidth, maxWidth: "800px"}}
            >
                {this.renderGameStateColumn()}
            </Col>
            <Col xs={{span: "auto", order: columnOrders.mapColumn}} style={{maxHeight: this.mapScrollbarEnabled ? "100%" : "none"}}>
                <div id="map-component" style={{ height: this.mapScrollbarEnabled ? "100%" : "auto", overflowY: "auto", overflowX: "hidden", maxHeight: MAP_HEIGHT }}>
                    <WorldSnapshotComponent ingameGameState={this.ingame} worldSnapshot={this.worldSnapshot} ironBank={this.gameSnapshot?.ironBank}/>
                </div>
            </Col>
            {(!this.housesInfosCollapsed || isMobile) && <Col
                xs={{ span: "auto", order: columnOrders.housesInfosColumn }} className={this.columnSwapAnimationClassName}
                style={{maxHeight: this.mapScrollbarEnabled ? "100%" : "none"}}
            >
                {this.renderHousesColumn()}
            </Col>}
        </Row>;
    }

    renderHousesColumn(): ReactNode {
        if (!this.gameSnapshot) {
            return null;
        }

        const houses = new BetterMap(this.gameSnapshot.housesOnVictoryTrack.map(houseData => {
            const realHouse = this.game.houses.get(houseData.id);
            const houseForReplay = new House(
                realHouse.id, realHouse.name, realHouse.color, realHouse.unitLimits, houseData.powerTokens, realHouse.maxPowerTokens, houseData.supply,
                new BetterMap(houseData.houseCards.map(hcData => {
                    const hc = new HouseCard(hcData.id, "", 0, 0, 0, null, realHouse.id);
                    hc.state = hcData.state;
                    return [hc.id, hc];
                })), null, houseData.victoryPoints, realHouse.hasBeenReplacedByVassal);
            return [houseData, houseForReplay];
        }));

        return (
            <div className={this.mapScrollbarEnabled ? "flex-ratio-container" : ""}>
                <Card className={this.mapScrollbarEnabled ? "flex-sized-to-content mb-2" : ""}>
                    <ListGroup variant="flush">
                        {this.renderInfluenceTracks()}
                        <ListGroupItem style={{ minHeight: "130px" }}>
                            <SupplyTrackComponent
                                supplyRestrictions={this.game.supplyRestrictions}
                                houses={houses.values}
                            />
                        </ListGroupItem>
                    </ListGroup>
                    <button className="btn btn-outline-light btn-sm" onClick={() => {
                            if (this.user && this.columnSwapAnimationClassName == "") {
                                this.columnSwapAnimationClassName = "animate__animated animate__fadeIn"
                                this.user.settings.responsiveLayout = !this.user.settings.responsiveLayout;
                                window.setTimeout(() => this.columnSwapAnimationClassName = "", 2050);
                            }
                        }}
                        style={{position: "absolute", left: "0px", padding: "8px", borderStyle: "none"}}
                    >
                        <FontAwesomeIcon icon={faRightLeft} style={{color: "white"}}/>
                    </button>
                </Card>
                <Card className={this.mapScrollbarEnabled ? "flex-fill-remaining" : ""}>
                    <Card.Body id="houses-panel" className="no-space-around">
                        <ListGroup variant="flush">
                            <ListGroupItem className="d-flex justify-content-center p-2">
                                <OverlayTrigger
                                    overlay={
                                        <Tooltip id="cancel-game-vote-tooltip" className="tooltip-w-100">
                                            The houses info list is always reordered by score and thus acts as the victory track.<br/>
                                            If you hover the mouse pointer over the victory point counter, a tooltip appears<br/>
                                            that shows you the total number of land areas, which is important for breaking ties.
                                        </Tooltip>
                                    }
                                    placement="top"
                                >
                                    <img src={podiumWinnerImage} width={40} />
                                </OverlayTrigger>
                            </ListGroupItem>
                            {houses.entries.map(([data, h]) => (
                                <HouseSnapshotComponent
                                    key={`house-row_${h.id}`}
                                    gameClient={this.gameClient}
                                    ingame={this.ingame}
                                    house={h}
                                    totalLandAreas={data.landAreaCount}
                                    isVassal={data.isVassal}
                                    suzerainHouseId={data.suzerainHouseId}
                                />
                            ))}
                        </ListGroup>
                    </Card.Body>
                </Card>
            </div>)
    }

    private renderInfluenceTracks(): React.ReactNode {
        return this.tracks.map(({ track, stars }, i) => (
            <ListGroupItem key={`influence-track-container_${i}`} style={{ minHeight: "61px" }}>
                <Row className="align-items-center">
                    <Col xs="auto" className="text-center" style={{ width: "46px" }}>
                        <OverlayTrigger
                            overlay={<Tooltip id={`tooltip-tracker-${i}`}>
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
                                        {this.gameSnapshot?.vsbUsed ? (
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
                            </Tooltip>}
                            placement="right"
                        >
                            <img src={i == 0 ? stoneThroneImage : i == 1 ? this.gameSnapshot?.vsbUsed ? diamondHiltUsedImage : diamondHiltImage : ravenImage} width={32} />
                        </OverlayTrigger>
                    </Col>
                    {track.map((h, j) => (
                        <Col xs="auto" key={`influence-track_${i}_${h?.id ?? j}`}>
                            <SimpleInfluenceIconComponent house={h} />
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
        ));
    }

    renderGameStateColumn(): ReactNode {
        const roundWarning = this.game.maxTurns - (this.gameSnapshot?.round ?? this.game.maxTurns) == 1;
        const roundCritical = this.gameSnapshot?.round == this.game.maxTurns;

        const wildlingsWarning = this.gameSnapshot?.wildlingStrength == MAX_WILDLING_STRENGTH - 4;
        const wildlingsCritical = this.gameSnapshot?.wildlingStrength == MAX_WILDLING_STRENGTH || this.gameSnapshot?.wildlingStrength == MAX_WILDLING_STRENGTH - 2;

        const isOwnTurn = this.gameClient.isOwnTurn();
        const border =  isOwnTurn
            ? "warning"
            : undefined;

        return <div className={this.mapScrollbarEnabled ? "flex-ratio-container" : ""}>
            <Card id="game-state-panel" className={this.mapScrollbarEnabled ? "flex-sized-to-content mb-2" : "mb-2"} border={border} style={{maxHeight: this.mapScrollbarEnabled ? "70%" : "none", borderWidth: "3px" }}>
                <Row className="justify-content-center m-2 text-center" style={{fontSize: "1.5rem"}}>
                    <Col xs="auto" className="mx-2 px-2">
                        <OverlayTrigger overlay={
                            <Tooltip id="round-tooltip">
                                <h5>Round {this.gameSnapshot?.round} / {this.game.maxTurns}</h5>
                            </Tooltip>}
                            placement="auto"
                        >
                            <div>
                                <img className={classNames(
                                    { "dye-warning": roundWarning },
                                    { "dye-critical": roundCritical })}
                                    src={hourglassImage} width={32} />
                                <div style={{ color: roundWarning ? "#F39C12" : roundCritical ? "#FF0000" : undefined }}>{this.gameSnapshot?.round}</div>
                            </div>
                        </OverlayTrigger>
                    </Col>
                    <Col xs="auto" className="mx-2 px-2">
                        <div>
                            <div>
                                <img src={mammothImage} width={32} className={classNames(
                                    { "dye-warning": wildlingsWarning },
                                    { "dye-critical": wildlingsCritical }
                                )} />
                            </div>
                            <div className={classNames({
                                "txt-warning": wildlingsWarning,
                                "txt-critical": wildlingsCritical
                            })}>
                                {this.gameSnapshot?.wildlingStrength}
                            </div>
                        </div>
                    </Col>
                    {this.gameSettings.playerCount >= 8 && <Col xs="auto" className="mx-2 px-2">
                        <div>
                            <img src={spikedDragonHeadImage} width={32} />
                            <div>{this.gameSnapshot?.dragonStrength}</div>
                        </div>
                    </Col>}
                </Row>
                <button className="btn btn-outline-light btm-sm" onClick={() => {
                        if (this.user && this.columnSwapAnimationClassName == "") {
                            this.columnSwapAnimationClassName = "animate__animated animate__fadeIn"
                            this.user.settings.responsiveLayout = !this.user.settings.responsiveLayout;
                            window.setTimeout(() => this.columnSwapAnimationClassName = "", 2050);
                        }
                    }}
                    style={{position: "absolute", left: "0px", padding: "8px", borderStyle: "none"}}
                >
                    <FontAwesomeIcon icon={faRightLeft} style={{color: "white"}}/>
                </button>
                {isOwnTurn && <Spinner animation="grow" variant="warning" size="sm" style={{position: "absolute", bottom: "4px", left: "4px" }}/>}
            </Card>
            <Card style={{height: this.mapScrollbarEnabled ? "auto" : "800px"}} className={classNames(
                {"flex-fill-remaining": this.mapScrollbarEnabled},
                "text-large"
            )}>
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
                            {this.gameSnapshot?.ironBank && this.gameSettings.playerCount < 8 && (
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
                        </Nav>
                    </Card.Header>
                    <Card.Body id="game-log-panel">
                        {/* This is an invisible div to force the parent to stretch to its remaining width */}
                        <div style={{visibility: "hidden", width: "850px"}} />
                        <Tab.Content className="h-100">
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
                                    <ScrollToBottom className="flex-fill-remaining" scrollViewClassName="overflow-x-hidden">
                                        <GameLogListComponent ingameGameState={this.ingame} gameClient={this.gameClient} currentlyViewed={true} />
                                    </ScrollToBottom>
                                </div>
                            </Tab.Pane>
                            {this.game.ironBank && this.gameSnapshot?.ironBank && <Tab.Pane eventKey="iron-bank" className="h-100">
                                <div className="d-flex flex-column h-100" style={{overflowY: "scroll"}}>
                                    <IronBankSnapshotTabComponent ingame={this.ingame} ironBank={this.gameSnapshot?.ironBank} />
                                </div>
                            </Tab.Pane>}
                            <Tab.Pane eventKey="settings" className="h-100">
                                <GameSettingsComponent gameClient={this.gameClient}
                                    entireGame={this.ingame.entireGame} />
                                <div style={{marginTop: -20}} >
                                    <UserSettingsComponent user={this.user}
                                        entireGame={this.ingame.entireGame}
                                    />
                                </div>
                            </Tab.Pane>
                        </Tab.Content>
                    </Card.Body>
                </Tab.Container>
            </Card>
        </div>
    }

    renderGameLogRoundsDropDownItems(): JSX.Element[] {
        const gameRoundElements = document.querySelectorAll('*[id^="gamelog-round-"]');
        const ordersReveleadElements = Array.from(document.querySelectorAll('*[id^="gamelog-orders-revealed-round-"]'));
        const result: JSX.Element[] = [];

        gameRoundElements.forEach(gameRoundElem => {
            const round = gameRoundElem.id.replace("gamelog-round-", "");

            result.push(<Dropdown.Item className="text-center" key={`dropdownitem-for-${gameRoundElem.id}`} onClick={() => {
                // When game log is the active tab, items get rendered before this logic here can work
                // Therefore we search the item during onClick again to make it work
                const elemToScroll = document.getElementById(gameRoundElem.id);
                elemToScroll?.scrollIntoView();
            }}>Round {round}</Dropdown.Item>);

            const ordersRevealedElem = ordersReveleadElements.find(elem => elem.id == `gamelog-orders-revealed-round-${round}`);
            if (ordersRevealedElem) {
                result.push(<Dropdown.Item className="text-center" key={`dropdownitem-for-${ordersRevealedElem.id}`} onClick={() => {
                    // When game log is the active tab, items get rendered before this logic here can work
                    // Therefore we search the item during onClick again to make it work
                    const elemToScroll = document.getElementById(ordersRevealedElem.id);
                    elemToScroll?.scrollIntoView();
                }}>Orders were revealed</Dropdown.Item>);
            }
        });

        return result;
    }

    getColumnOrders(alignGameStateToTheRight?: boolean): ColumnOrders {
        return alignGameStateToTheRight
            ? { housesInfosColumn: 1, mapColumn: 2, gameStateColumn: 3 }
            : { gameStateColumn: 1, mapColumn: 2, housesInfosColumn: 3 };
    }
}