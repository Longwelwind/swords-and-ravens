import GameClient from "./GameClient";
import { Component, ReactNode } from "react";
import React from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { ListGroupItem, Row, Col, OverlayTrigger, Tooltip, Popover, Button } from "react-bootstrap";
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
        const victoryPoints = this.game.getVictoryPoints(this.house);
        const victoryPointsWarning = gameRunning && (this.game.structuresCountNeededToWin - 2 == victoryPoints);
        const victoryPointsCritical = gameRunning && (this.game.structuresCountNeededToWin - 1 == victoryPoints);
        let controller: User;
        let isWaitedFor = false;
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
                            this.suzerainHouse ? (
                                <>Commanded by {this.suzerainHouse.name}</>
                            ) : (
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
                                                    delay={{ show: 250, hide: 100 }}
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
                        overlay={this.renderTotalLandRegionsTooltip(this.house)}
                        delay={{ show: 250, hide: 100 }}
                        placement="top"
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
                                src={this.house.id == "targaryen" ? verticalBanner : castleImage} width={40}
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
                                className="house-power-token hover-weak-outline"
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

    setHighlightedRegions(filter = ""): void {
        let regions = this.ingame.world.getControlledRegions(this.house);
        if (filter == "with-castles-only") {
            regions = regions.filter(r => r.castleLevel > 0);
        } else if (filter == "with-power-tokens-only") {
            regions = regions.filter(r => r.controlPowerToken == this.house);
        } else if (filter == "with-loyalty-tokens-only") {
            regions = this.ingame.world.regions.values.filter(r => r.loyaltyTokens > 0);
        } else if (filter != "") { // This is the unit type
            regions = regions.filter(r => r.units.values.some(u => u.type.id == filter));
        }

        this.highlightedRegions.clear();

        regions.forEach(r => {
            this.highlightedRegions.set(r, {
                highlight: {
                    active: true,
                    color: this.house.id != "greyjoy" ? this.house.color : "black",
                    light: r.type.id == "sea",
                    strong: r.type.id == "land"
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
            <small>{unitType.description}</small>
        </Tooltip>;
    }

    private renderTotalLandRegionsTooltip(house: House): OverlayChildren {
        return <Tooltip id={house.id + "-total-land-regions"}>
            <h5>Total Land Areas</h5><br/><h4 style={{textAlign: "center"}}><b>{this.game.getTotalControlledLandRegions(house)}</b></h4>
        </Tooltip>;
    }

    private renderPowerPopover(house: House): OverlayChildren {
        const availablePower =  house.powerTokens;
        const powerTokensOnBoard = this.game.countPowerTokensOnBoard(house);
        const powerInPool = this.game.maxPowerTokens - availablePower - powerTokensOnBoard;

        return <Popover id={house.id + "-power-tooltip"} className="p-2">
            <b>{house.name}</b><br/>
            <small>Available: </small><b>{availablePower}</b><br/>
            <small>On the board: </small><b>{powerTokensOnBoard}</b><br/>
            <small>Power Pool: </small><b>{powerInPool}</b>
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
            {this.ingame.game.targaryen && this.props.gameClient.authenticatedPlayer?.house && this.ingame.world.getUnitsOfHouse(this.ingame.game.targaryen).length == 0 &&
            <div className="mt-3">
                <Button
                    onClick={() => {
                        if (window.confirm("Are you sure you want to return all your power tokens to your pool?")) {
                            this.props.ingame.dropPowerTokens(house);
                            document.body.click();
                        }
                    }}
                    disabled={house.powerTokens <= 0}
                    variant="warning"
                >
                    Drop all available Power tokens
                </Button>
            </div>
            }
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