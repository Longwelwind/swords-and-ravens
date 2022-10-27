import GameClient from "./GameClient";
import { Component, ReactNode } from "react";
import React from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { ListGroupItem, Row, Col, OverlayTrigger, Tooltip, Popover, Navbar, Nav, NavDropdown } from "react-bootstrap";
import classNames from "classnames";
import unitTypes from "..//common/ingame-game-state/game-data-structure/unitTypes";
import unitImages from "./unitImages";
import housePowerTokensImages from "./housePowerTokensImages";
import _ from "lodash";
import { HouseCardState } from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import HouseCardBackComponent from "./game-state-panel/utils/HouseCardBackComponent";
import Game, { MAX_LOYALTY_TOKEN_COUNT } from "../common/ingame-game-state/game-data-structure/Game";
import castleImage from "../../public/images/icons/castle.svg";
import stopwatchImage from "../../public/images/icons/stopwatch.svg";
import battleGearImage from "../../public/images/icons/battle-gear.svg";
import verticalBanner from "../../public/images/icons/vertical-banner.svg"
import laurelCrownImage from "../../public/images/icons/laurel-crown.svg";
import thirdEyeImage from "../../public/images/icons/third-eye.svg";
import Player from "../common/ingame-game-state/Player";
import UserLabel from "./UserLabel";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import { observer } from "mobx-react";
import GiftPowerTokensComponent from "./GiftPowerTokensComponent";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import MapControls, { RegionOnMapProperties } from "./MapControls";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import PartialRecursive from "../utils/PartialRecursive";
import BetterMap from "../utils/BetterMap";
import { observable } from "mobx";
import ConditionalWrap from "./utils/ConditionalWrap";
import { port, sea } from "../common/ingame-game-state/game-data-structure/regionTypes";
import { houseColorFilters } from "./houseColorFilters";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";

interface HouseRowComponentProps {
    house: House;
    gameClient: GameClient;
    ingame: IngameGameState;
    mapControls: MapControls;
}

@observer
export default class HouseRowComponent extends Component<HouseRowComponentProps> {
    modifyRegionsOnMapCallback: any;
    @observable highlightedRegions = new BetterMap<Region, PartialRecursive<RegionOnMapProperties>>();

    get house(): House {
        return this.props.house;
    }

    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get player(): Player {
        return this.ingame.getControllerOfHouse(this.house);
    }

    get suzerainHouse(): House | null {
        return this.game.vassalRelations.tryGet(this.house, null);
    }

    render(): ReactNode {
        const isVassal = this.ingame.isVassalHouse(this.house);
        const gameRunning = !this.ingame.isEnded && !this.ingame.isCancelled;
        // We limit the victory points to 7 but in the UI we wan't to show if a player controls more than 7 castles
        const victoryPoints = !this.ingame.entireGame.isFeastForCrows && this.house.id != "targaryen"
            ? this.game.getControlledStrongholdAndCastleCount(this.house)
            : this.game.getVictoryPoints(this.house);
        const victoryPointsWarning = gameRunning && (this.game.victoryPointsCountNeededToWin - 2 == victoryPoints);
        const victoryPointsCritical = gameRunning && (this.game.victoryPointsCountNeededToWin - 1 == victoryPoints || this.game.victoryPointsCountNeededToWin == victoryPoints);
        let isWaitedFor = false;

        const vassalTitle = this.suzerainHouse
                ? <>Commanded by <span style={{color: this.suzerainHouse.color}}>{this.suzerainHouse.name}</span></>
                : <>Up for grab</>;

        const victoryImage = this.props.ingame.entireGame.isFeastForCrows
            ? laurelCrownImage :
                this.house.id == "targaryen"
                    ? verticalBanner
                    : castleImage;

        const availablePower =  this.house.powerTokens;
        const powerTokensOnBoard = this.game.countPowerTokensOnBoard(this.house);
        const powerInPool = this.house.maxPowerTokens - availablePower - powerTokensOnBoard;

        let clockWarning = false;
        let clockCritical = false;

        let player: Player | null = null;
        let clock: number | null = null;

        try {
            if (!isVassal) {
                player = this.player;
                isWaitedFor = this.ingame.getWaitedUsers().includes(player.user);

                clock = player.liveClockData ? player.clientGetTotalRemainingSeconds(this.ingame.now) : null;

                if (clock != null) {
                    clockCritical = gameRunning && clock > 0 && clock < (10 * 60);
                    clockWarning = gameRunning && !clockCritical && clock > 0 && clock < (20 * 60);
                }
            }
        } catch {
            console.warn("getControllerOfHouse has thrown an error but we should never see this error anymore!");
        }

        const currentUserIsCommandingHouse = player && this.props.gameClient.isAuthenticatedUser(player.user);

        return this.ingame.rerender >= 0 && <>
            <ListGroupItem style={{padding: 0, margin: 0}}>
                <div className={isWaitedFor ? "new-event" : ""} style={{paddingLeft: "8px", paddingRight: "10px", paddingTop: "12px", paddingBottom: "12px"}}>
                <Row className="align-items-center flex-nowrap">
                    <Col xs="auto" className="pr-0" style={{ width: "32px" }} onMouseEnter={() => this.setHighlightedRegions()} onMouseLeave={() => this.highlightedRegions.clear()}>
                        {player
                            ? <div className={classNames({ "display-none": !currentUserIsCommandingHouse })}>
                                <div style={{ margin: "-4px" }}>
                                    <HouseIconComponent house={this.house} small={true}/>
                                </div>
                            </div>
                            : <OverlayTrigger
                                placement="right"
                                overlay={
                                    <Tooltip id={"vassal-house-" + this.house.id}>
                                        <b>Vassal</b><br />
                                        At the beginning of the Planning Phase,
                                        each player, in order, can pick a vassal to command this turn.
                                    </Tooltip>
                                }
                            >
                                <img src={battleGearImage} width={32} style={{ margin: "-4px" }} />
                            </OverlayTrigger>
                        }
                    </Col>
                    <Col onMouseEnter={() => this.setHighlightedRegions()} onMouseLeave={() => this.highlightedRegions.clear()} className="pr-0">
                        <h5 style={{ margin: 0, padding: 0 }}><b style={{ "color": this.house.color }}>{this.house.name}</b><br /></h5>
                        {player ? (
                            <>
                                {" "}
                                <UserLabel
                                    user={player.user}
                                    gameState={this.ingame}
                                    gameClient={this.props.gameClient}
                                />
                            </>
                        ) : (
                            this.house.hasBeenReplacedByVassal ?
                                <Navbar variant="dark" className="no-space-around">
                                    <Navbar.Collapse id={`vassal-navbar-${this.house.id}`} className="no-space-around">
                                        <Nav className="no-space-around">
                                            <NavDropdown id={`vassal-nav-dropdown-${this.house.id}`} className="no-gutters" title={<span className="userlabel">{vassalTitle}</span>}>
                                                {this.renderVassalDropDownItems()}
                                            </NavDropdown>
                                        </Nav>
                                    </Navbar.Collapse>
                                </Navbar>
                            : vassalTitle
                        )}
                    </Col>
                    <Col xs="auto">
                        <Row className="justify-content-center align-items-center" style={{ width: 110 }}>
                            {unitTypes.values.map(type =>
                                (this.game.getUnitLimitOfType(this.house, type) > 0) && (
                                    <Col xs={6} key={type.id}>
                                        <Row className="justify-content-center no-gutters align-items-center">
                                            <Col xs="auto">
                                                {this.game.getAvailableUnitsOfType(this.house, type)}
                                            </Col>
                                            <Col xs="auto" style={{ marginLeft: 4 }}>
                                                <OverlayTrigger
                                                    overlay={this.renderUnitTypeTooltip(type)}
                                                    delay={{ show: 500, hide: 100 }}
                                                    placement="top">
                                                    <div className="unit-icon small hover-weak-outline" onMouseEnter={() => this.setHighlightedRegions(type.id)} onMouseLeave={() => this.highlightedRegions.clear()}
                                                        style={{
                                                            backgroundImage: `url(${unitImages.get(this.house.id).get(type.id)})`,
                                                        }}
                                                    />
                                                </OverlayTrigger>
                                            </Col>
                                        </Row>
                                    </Col>)
                            )}
                        </Row>
                    </Col>
                    {!isVassal && (<OverlayTrigger
                        overlay={this.renderVictoryTrackTooltip(this.house)}
                        delay={{ show: 250, hide: 100 }}
                        placement="auto"
                    >
                        <Col xs="auto" className="d-flex align-items-center"
                            onMouseEnter={() => this.setHighlightedRegions(this.house.id == "targaryen" ? "with-loyalty-tokens-only" : "with-castles-only")}
                            onMouseLeave={() => this.highlightedRegions.clear()}>
                            <div style={{ fontSize: "20px", color: victoryPointsWarning ? "#F39C12" : victoryPointsCritical ? "#FF0000" : undefined }}><b>{victoryPoints}</b></div>
                            <img
                                className={classNames(
                                    { "dye-warning": victoryPointsWarning },
                                    { "dye-critical": victoryPointsCritical })}
                                src={victoryImage} width={40}
                                style={{ marginLeft: "10px" }}
                            />
                        </Col>
                    </OverlayTrigger>)}
                    <Col xs="auto" className={classNames("d-flex align-items-center", { "invisible": isVassal })}
                        onMouseEnter={() => this.setHighlightedRegions("with-power-tokens-only")}
                        onMouseLeave={() => this.highlightedRegions.clear()}
                    >
                        <OverlayTrigger
                            overlay={this.renderPowerTooltip(availablePower, powerTokensOnBoard, powerInPool)}
                            delay={{ show: 250, hide: 100 }}
                            placement="auto"
                        >
                            <b style={{ fontSize: "18px", color: powerInPool == 0 ? "red" : undefined }}>{this.house.powerTokens}</b>
                        </OverlayTrigger>
                        <OverlayTrigger
                            overlay={this.renderPowerPopover(availablePower, powerTokensOnBoard, powerInPool)}
                            placement="auto"
                            trigger="click"
                            rootClose
                        >
                            <div
                                className="house-power-token hover-weak-outline clickable"
                                style={{
                                    backgroundImage: `url(${housePowerTokensImages.get(this.house.id)})`,
                                    marginLeft: "10px"
                                }}
                            />
                        </OverlayTrigger>
                    </Col>
                </Row>
                {clock != null &&
                <Row className="justify-content-center mb-2">
                    <img src={stopwatchImage} width={24}
                        className={classNames(
                            { "dye-warning": clockWarning },
                            { "dye-critical": clockCritical })}
                    />
                    <div style={{ fontSize: "18px", color: clockWarning ? "#F39C12" : clockCritical ? "#FF0000" : undefined, marginLeft: "4px" }}>
                        <b>{new Date(clock * 1000).toISOString().slice(12,19)}</b>
                    </div>
                </Row>}
                <Row className="justify-content-around align-items-center">
                    {player && player.house.knowsNextWildlingCard && (
                        <Col xs="auto">
                            <OverlayTrigger
                                placement="right"
                                overlay={
                                    <Tooltip id={"knows-things-house-" + this.house.id}>
                                        <b>{this.house.name}</b> knows things.
                                    </Tooltip>
                                }
                            >
                                <img src={thirdEyeImage} width={28} style={{ margin: "-4px", filter: currentUserIsCommandingHouse ? houseColorFilters.get(this.house.id) : undefined }} />
                            </OverlayTrigger>
                        </Col>
                    )}
                    <Col xs="auto">
                        <Row className="justify-content-center">
                            {!isVassal ?
                                _.sortBy(this.house.houseCards.values, hc => hc.combatStrength).map(hc => (
                                    <Col xs="auto" key={`house-card_${this.house.id}_${hc.id}`}>
                                        {hc.state == HouseCardState.AVAILABLE ? (
                                            <HouseCardComponent
                                                houseCard={hc}
                                                size="tiny"
                                            />
                                        ) : (
                                            <HouseCardBackComponent
                                                house={this.house}
                                                houseCard={hc}
                                                size="tiny"
                                            />
                                        )}
                                    </Col>
                                ))
                                : _.sortBy(this.game.vassalHouseCards.values, hc => hc.combatStrength).map(hc => (
                                    <Col xs="auto" key={`vassal-cards_${this.house.id}_${hc.id}`}>
                                        {hc.state == HouseCardState.AVAILABLE ? (
                                            <HouseCardComponent
                                                houseCard={hc}
                                                size="tiny"
                                            />
                                        ) : (
                                            <HouseCardBackComponent
                                                house={null}
                                                houseCard={hc}
                                                size="tiny"
                                            />
                                        )}
                                    </Col>
                                ))}
                        </Row>
                        {this.house.laterHouseCards != null && !isVassal &&
                            <Row className="justify-content-center">
                                {_.sortBy(this.house.laterHouseCards.values, hc => hc.combatStrength).map(hc => (
                                    <Col xs="auto" key={`later-cards_${this.house.id}_${hc.id}`}>
                                        <HouseCardComponent
                                            houseCard={hc}
                                            size="tiny"
                                            unavailable
                                        />
                                    </Col>
                                ))}
                            </Row>
                        }
                    </Col>
                    {player && player.house.knowsNextWildlingCard && (
                        <Col xs="auto">
                            <img src={thirdEyeImage} width={28} className="invisible" />
                        </Col>
                    )}
                </Row>
                </div>
            </ListGroupItem>
        </>;
    }

    renderVassalDropDownItems(): ReactNode {
        const ingame = this.props.ingame;
        const {result, reason} = ingame.canLaunchReplaceVassalVote(this.props.gameClient.authenticatedUser, this.house);
        return (
            <>
                <ConditionalWrap
                    condition={!result}
                    wrap={children =>
                        <OverlayTrigger
                            overlay={
                                <Tooltip id="replace-player-tooltip">
                                    {reason == "game-paused" ?
                                        "The game must be resumed first"
                                        : reason == "forbidden-in-clock-games" ?
                                        "Undoing vassal replacement is not allowed in games with game clock"
                                        : reason == "already-playing" ?
                                        "You are already playing in this game"
                                        : reason == "ongoing-vote" ?
                                        "A vote is already ongoing"
                                        : reason == "game-cancelled" ?
                                        "The game has been cancelled"
                                        : reason == "game-ended" ?
                                        "The game has ended"
                                        : reason == "not-a-vassal" || reason == "not-a-replaced-vassal" ?
                                        "Only vassals who have replaced a player can be replaced by a player again"
                                        : reason == "forbidden-in-tournament-mode" ?
                                        "Undoing vassal replacement is not allowed in tournaments"
                                        : "Vote not possible"
                                    }
                                </Tooltip>
                            }
                            placement="auto"
                        >
                            {children}
                        </OverlayTrigger>
                    }
                >
                    <div id="replace-player-tooltip-wrapper">
                        <NavDropdown.Item
                            onClick={() => this.onLaunchReplaceVassalVoteClick()}
                            disabled={!result}
                        >
                            Offer to replace this vassal
                        </NavDropdown.Item>
                    </div>
                </ConditionalWrap>
            </>
        );
    }

    onLaunchReplaceVassalVoteClick(): void {
        if (window.confirm(`Do you want to launch a vote to replace Vassal house ${this.house.name}?`)) {
            this.props.ingame.launchReplaceVassalByPlayerVote(this.house);
        }
    }

    setHighlightedRegions(filter = ""): void {
        const regions = new BetterMap(this.ingame.world.getControlledRegions(this.house).map(r => [r, undefined] as [Region, string | undefined]));
        if (filter == "with-castles-only") {
            if (!this.props.ingame.entireGame.isFeastForCrows) {
                regions.keys.filter(r => r.castleLevel == 0).forEach(r => regions.delete(r));
            }
        } else if (filter == "with-power-tokens-only") {
            regions.keys.filter(r => r.controlPowerToken != this.house).forEach(r => regions.delete(r));
        } else if (filter == "with-loyalty-tokens-only") {
            regions.clear();
            // Todo: We could show the loyalty count as region text here
            if (!this.props.ingame.entireGame.isFeastForCrows) {
                this.ingame.world.regions.values.filter(r => r.loyaltyTokens > 0).forEach(r => regions.set(r, undefined));
            }
        } else if (filter != "") { // This is the unit type
            regions.keys.forEach(r => {
                if (r.units.values.filter(u => u.type.id == filter).length == 0) {
                    regions.delete(r);
                }
            });
            // Todo: We could show the unit count as region text here
        }

        this.highlightedRegions.clear();

        regions.entries.forEach(([r, text]) => {
            this.highlightedRegions.set(r, {
                highlight: {
                    active: true,
                    color: this.house.id != "greyjoy" ? this.house.color : "#000000",
                    light: r.type.id == "sea",
                    strong: r.type.id == "land",
                    text: text
                }
            });
        });

        this.ingame.world.regions.values.forEach(r => {
            if (!this.highlightedRegions.has(r)) {
                this.highlightedRegions.set(r, { highlight: { active: false } } );
            }
        });
    }

    private renderUnitTypeTooltip(unitType: UnitType): OverlayChildren {
        return <Tooltip id={unitType.id + "-tooltip"}>
            <b>{unitType.name}</b><br/>
            {unitType.description}
        </Tooltip>;
    }

    private renderVictoryTrackTooltip(house: House): OverlayChildren {
        return <Tooltip id={house.id + "-victory-tooltip"} className="tooltip-w-100">
            <Col>
                <h5 className="text-center">&nbsp;&nbsp;Total&nbsp;Land&nbsp;Areas&nbsp;&nbsp;</h5>
                <h4 className="text-center"><b>{this.game.getTotalControlledLandRegions(house)}</b></h4>
                {this.ingame.entireGame.isFeastForCrows && <>
                    <br/>
                    <br/>
                    <h5 className="text-center">Additional Information<br/><small>&nbsp;&nbsp;(Does not count in case of a tie)&nbsp;&nbsp;</small></h5>
                    <br/>
                    <h5 className="text-center">Castles: <b>{this.ingame.world.regions.values.filter(r => r.castleLevel == 1 && r.getController() == house).length}</b></h5>
                    <h5 className="text-center">Strongholds: <b>{this.ingame.world.regions.values.filter(r => r.castleLevel == 2 && r.getController() == house).length}</b></h5>
                    <h5 className="text-center">Sea Areas: <b>{this.ingame.world.regions.values.filter(r => r.type == sea && r.getController() == house).length}</b></h5>
                    <h5 className="text-center">Ports: <b>{this.ingame.world.regions.values.filter(r => r.type == port && r.getController() == house).length}</b></h5>
                </>}
                {house == this.game.targaryen && <>
                    <br/>
                    <h5 className="text-center">Loyalty tokens</h5>
                    <h6>On the board: <b>{this.game.loyaltyTokensOnBoardCount}</b></h6>
                    <h6>Loyalty Pool: <b>{MAX_LOYALTY_TOKEN_COUNT - this.game.loyaltyTokensOnBoardCount}</b></h6>
                </>}
            </Col>
        </Tooltip>;
    }

    private renderPowerPopover(availablePower: number, powerTokensOnBoard: number, powerInPool: number): OverlayChildren {
        return <Popover id={this.house.id + "-power-popover"} className="px-3 pt-2">
            <Col>
                <Row className="justify-content-center">
                    <h4>{this.house.name}&apos;s Power</h4>
                </Row>
                <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><small>Available:</small> <b>{availablePower}</b></h5>
                        <h5><small>On the board:</small> <b>{powerTokensOnBoard}</b></h5>
                        <h5><small>Power Pool:</small> <b>{powerInPool}</b></h5>
                    </Col>
                </Row>
                {this.props.gameClient.authenticatedPlayer && this.props.gameClient.authenticatedPlayer.house != this.house &&
                    this.ingame.canGiftPowerTokens(this.props.gameClient.authenticatedPlayer.house) && <Row className="mt-3" >
                    <GiftPowerTokensComponent
                        toHouse={this.house}
                        authenticatedPlayer={this.props.gameClient.authenticatedPlayer}
                        ingame={this.ingame}/>
                </Row>}
            </Col>
        </Popover>;
    }

    private renderPowerTooltip(availablePower: number, powerTokensOnBoard: number, powerInPool: number): OverlayChildren {
        return <Tooltip id={this.house.id + "-power-tooltip"} className="tooltip-w-100">
            <Col>
                <Row className="justify-content-center">
                    <h4>{this.house.name}&apos;s Power</h4>
                </Row>
                <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><small>Available:</small> <b>{availablePower}</b></h5>
                        <h5><small>On the board:</small> <b>{powerTokensOnBoard}</b></h5>
                        <h5><small>Power Pool:</small> <b>{powerInPool}</b></h5>
                    </Col>
                </Row>
            </Col>
        </Tooltip>;
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        return this.highlightedRegions.entries;
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
    }
}