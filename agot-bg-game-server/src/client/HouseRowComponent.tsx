import GameClient from "./GameClient";
import { Component, ReactNode } from "react";
import React from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { ListGroupItem, Row, Col, OverlayTrigger, Tooltip, Popover, Button, Navbar, Nav, NavDropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";
import unitTypes from "..//common/ingame-game-state/game-data-structure/unitTypes";
import unitImages from "./unitImages";
import housePowerTokensImages from "./housePowerTokensImages";
import _ from "lodash";
import { HouseCardState } from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import HouseCardBackComponent from "./game-state-panel/utils/HouseCardBackComponent";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import castleImage from "../../public/images/icons/castle.svg";
import battleGearImage from "../../public/images/icons/battle-gear.svg";
import verticalBanner from "../../public/images/icons/vertical-banner.svg"
import laurelCrownImage from "../../public/images/icons/laurel-crown.svg";
import Player from "../common/ingame-game-state/Player";
import UserLabel from "./UserLabel";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import { observer } from "mobx-react";
import GiftPowerTokensComponent from "./GiftPowerTokensComponent";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import MapControls, { RegionOnMapProperties } from "./MapControls";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import PartialRecursive from "../utils/PartialRecursive";
import BetterMap from "../utils/BetterMap";
import { observable } from "mobx";
import User from "../server/User";
import ConditionalWrap from "./utils/ConditionalWrap";
import { port, sea } from "../common/ingame-game-state/game-data-structure/regionTypes";

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

    get isVassal(): boolean {
        return this.ingame.isVassalHouse(this.house);
    }

    get player(): Player {
        return this.ingame.getControllerOfHouse(this.house);
    }

    get suzerainHouse(): House | null {
        return this.game.vassalRelations.tryGet(this.house, null);
    }

    render(): ReactNode {
        const gameRunning = !(this.ingame.leafState instanceof GameEndedGameState) && !(this.ingame.leafState instanceof CancelledGameState);
        // We limit the victory points to 7 but in the UI we wan't to show if a player controls more than 7 castles
        const victoryPoints = !this.ingame.entireGame.isFeastForCrows && this.house.id != "targaryen"
            ? this.game.getControlledStrongholdAndCastleCount(this.house)
            : this.game.getVictoryPoints(this.house);
        const victoryPointsWarning = gameRunning && (this.game.victoryPointsCountNeededToWin - 2 == victoryPoints);
        const victoryPointsCritical = gameRunning && (this.game.victoryPointsCountNeededToWin - 1 == victoryPoints || this.game.victoryPointsCountNeededToWin == victoryPoints);
        let controller: User;
        let isWaitedFor = false;

        const vassalTitle = <span className="userlabel">
            {this.suzerainHouse
                ? `Commanded by ${this.suzerainHouse.name}`
                : "Up for grab"}
        </span>;

        const victoryImage = this.props.ingame.entireGame.isFeastForCrows
            ? laurelCrownImage :
                this.house.id == "targaryen"
                    ? verticalBanner
                    : castleImage;

        try {
            controller = this.ingame.getControllerOfHouse(this.house).user;
            isWaitedFor = !this.isVassal ? this.ingame.getWaitedUsers().includes(controller) : false;
        } catch {
            // Just swallow this
        }
        return this.ingame.rerender >= 0 && <>
            <ListGroupItem style={{padding: 0, margin: 0}}>
                <div className={isWaitedFor ? "new-event" : ""} style={{paddingLeft: "8px", paddingRight: "10px", paddingTop: "12px", paddingBottom: "12px"}}>
                <Row className="align-items-center">
                    <Col xs="auto" className="pr-0" style={{ width: "32px" }} onMouseEnter={() => this.setHighlightedRegions()} onMouseLeave={() => this.highlightedRegions.clear()}>
                        {!this.isVassal ? (
                            <FontAwesomeIcon
                                className={classNames({ "invisible": !this.props.gameClient.isAuthenticatedUser(this.player.user) })}
                                style={{ color: this.house.color }}
                                icon={faStar}
                                size="lg"
                            />
                        ) : (
                            <OverlayTrigger
                                placement="right"
                                overlay={
                                    <Tooltip id={"vassal-house-" + this.house.id}>
                                        <strong>Vassal</strong><br />
                                        At the beginning of the Planning Phase,
                                        each player, in order, can pick a vassal to command this turn.
                                    </Tooltip>
                                }
                            >
                                <img src={battleGearImage} width={32} style={{ margin: "-4px" }} />
                            </OverlayTrigger>
                        )}
                    </Col>
                    <Col onMouseEnter={() => this.setHighlightedRegions()} onMouseLeave={() => this.highlightedRegions.clear()} className="pr-0">
                        <h5 style={{ margin: 0, padding: 0 }}><b style={{ "color": this.house.color }}>{this.house.name}</b><br /></h5>
                        {!this.isVassal ? (
                            <>
                                {" "}
                                <UserLabel
                                    user={this.player.user}
                                    gameState={this.ingame}
                                    gameClient={this.props.gameClient}
                                />
                            </>
                        ) : (
                            this.house.hasBeenReplacedByVassal ?
                                <Navbar variant="dark" className="no-space-around">
                                    <Navbar.Collapse id={`vassal-navbar-${this.house.id}`} className="no-space-around">
                                        <Nav className="no-space-around">
                                            <NavDropdown id={`vassal-nav-dropdown-${this.house.id}`} className="no-gutters" title={vassalTitle}>
                                                {this.renderVassalDropDownItems()}
                                            </NavDropdown>
                                        </Nav>
                                    </Navbar.Collapse>
                                </Navbar>
                            : (
                                this.suzerainHouse ?
                                    <>Commanded by {this.suzerainHouse.name}</>
                                :
                                    <>Up for grab</>
                            )
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
                    {!this.isVassal && (<OverlayTrigger
                        overlay={this.renderVictoryTrackTooltip(this.house)}
                        delay={{ show: 500, hide: 100 }}
                        placement="auto"
                    >
                        <Col xs="auto" className="d-flex align-items-center"
                            onMouseEnter={() => this.setHighlightedRegions(this.house.id == "targaryen" ? "with-loyalty-tokens-only" : "with-castles-only")}
                            onMouseLeave={() => this.highlightedRegions.clear()}>
                            <div style={{ fontSize: "20px", color: victoryPointsWarning ? "#F39C12" : victoryPointsCritical ? "#FF0000" : undefined }}><b>{victoryPoints}</b></div>
                            <img
                                className={classNames(
                                    "hover-weak-outline",
                                    { "dye-warning": victoryPointsWarning },
                                    { "dye-critical": victoryPointsCritical })}
                                src={victoryImage} width={40}
                                style={{ marginLeft: "10px" }}
                            />
                        </Col>
                    </OverlayTrigger>)}
                    <Col xs="auto" className={classNames("d-flex align-items-center", { "invisible": this.isVassal })}
                        onMouseEnter={() => this.setHighlightedRegions("with-power-tokens-only")}
                        onMouseLeave={() => this.highlightedRegions.clear()}
                    >
                        <div style={{ fontSize: "18px" }}>{this.house.powerTokens}</div>
                        <OverlayTrigger
                            overlay={this.renderPowerPopover(this.house)}
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
                <Row className="justify-content-center">
                    {!this.isVassal ?
                        _.sortBy(this.house.houseCards.values, hc => hc.combatStrength).map(hc => (
                        <Col xs="auto" key={hc.id}>
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
                    :  _.sortBy(this.game.vassalHouseCards.values, hc => hc.combatStrength).map(hc => (
                        <Col xs="auto" key={hc.id}>
                            <HouseCardComponent
                                    houseCard={hc}
                                    size="tiny"
                            />
                        </Col>
                    ))}
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
                                    {reason == "already-playing" ?
                                        "You are already playing in this game"
                                        : reason == "ongoing-vote" ?
                                        "A vote is already ongoing"
                                        : reason == "game-cancelled" ?
                                        "The game has been cancelled"
                                        : reason == "game-ended" ?
                                        "The game has ended"
                                        : reason == "not-a-vassal" || "not-a-replaced-vassal" ?
                                        "Only vassals who have replaced a player can be replaced by a player again"
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
        if (window.confirm(`Do you want to launch a vote to replace vassal house ${this.house.name}?`)) {
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
            </Col>
        </Tooltip>;
    }

    private renderPowerPopover(house: House): OverlayChildren {
        const availablePower =  house.powerTokens;
        const powerTokensOnBoard = this.game.countPowerTokensOnBoard(house);
        const powerInPool = house.maxPowerTokens - availablePower - powerTokensOnBoard;

        return <Popover id={house.id + "-power-tooltip"}>
            <Col>
                <h4>{house.name}</h4>
                <h5><small>Available: </small><b>{availablePower}</b></h5>
                <h5><small>On the board: </small><b>{powerTokensOnBoard}</b></h5>
                <h5><small>Power Pool: </small><b>{powerInPool}</b></h5>
                {this.props.gameClient.authenticatedPlayer &&
                this.props.gameClient.authenticatedPlayer.house != house &&
                this.ingame.canGiftPowerTokens(this.props.gameClient.authenticatedPlayer.house) &&
                    <div className="mt-1" ><br/>
                        <GiftPowerTokensComponent
                            toHouse={this.house}
                            authenticatedPlayer={this.props.gameClient.authenticatedPlayer}
                            ingame={this.ingame}/>
                    </div>
                }
                {house == this.ingame.game.targaryen && this.props.gameClient.authenticatedPlayer?.house == this.ingame.game.targaryen && this.ingame.isHouseDefeated(house) &&
                <div className="mt-3">
                    <Button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to return all your power tokens to your pool?")) {
                                this.props.ingame.entireGame.sendMessageToServer({
                                    type: "drop-power-tokens",
                                    house: house.id
                                });
                                document.body.click();
                            }
                        }}
                        disabled={house.powerTokens <= 0}
                        variant="danger"
                    >
                        Drop all available Power tokens
                    </Button>
                </div>
                }
            </Col>
        </Popover>;
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