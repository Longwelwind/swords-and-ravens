import GameClient from "./GameClient";
import { Component, ReactNode } from "react";
import React from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { ListGroupItem, Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
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
import Player from "../common/ingame-game-state/Player";
import UserLabel from "./UserLabel";


interface HouseRowComponentProps {
    house: House;
    gameClient: GameClient;
    ingame: IngameGameState;
}

export default class HouseRowComponent extends Component<HouseRowComponentProps> {
    get house(): House {
        return this.props.house;
    }

    get game(): Game {
        return this.props.ingame.game;
    }

    get isVassal(): boolean {
        return this.props.ingame.isVassalHouse(this.house);
    }

    get player(): Player {
        return this.props.ingame.getControllerOfHouse(this.house);
    }

    get suzerainHouse(): House | null {
        return this.props.ingame.game.vassalRelations.tryGet(this.house, null);
    }

    render(): ReactNode {
        return <>
            <ListGroupItem>
                <Row className="align-items-center">
                    <Col xs="auto" className="pr-0" style={{width: "28px"}}>
                        {!this.isVassal ? (
                            <FontAwesomeIcon
                                className={classNames({"invisible": !this.props.gameClient.isAuthenticatedUser(this.player.user)})}
                                style={{color: this.house.color}}
                                icon={faStar}
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
                                <img src={battleGearImage} width={24} style={{margin: "-4px"}} />
                            </OverlayTrigger>
                        )}
                    </Col>
                    <Col>
                        <b style={{"color": this.house.color}}>{this.house.name}</b><br/>
                        {!this.isVassal ? (
                            <>
                                {" "}
                                <UserLabel
                                    user={this.player.user}
                                    gameState={this.props.ingame}
                                    gameClient={this.props.gameClient}
                                />
                            </>
                        ) : (
                            <small>
                                {this.suzerainHouse ? (
                                    <>Commanded by {this.suzerainHouse.name}</>
                                ) : (
                                    <>Up for grab</>
                                )}
                            </small>
                        )}
                    </Col>
                    <Col xs="auto">
                        <Row className="justify-content-center align-items-center" style={{width: 110}}>
                            {unitTypes.values.map(type => (
                                <Col xs={6} key={type.id}>
                                    <Row className="justify-content-center no-gutters align-items-center">
                                        <Col xs="auto">
                                            {this.game.getAvailableUnitsOfType(this.house, type)}
                                        </Col>
                                        <Col xs="auto" style={{marginLeft: 4}}>
                                            <div className="unit-icon small hover-weak-outline"
                                                style={{
                                                    backgroundImage: `url(${unitImages.get(this.house.id).get(type.id)})`,
                                                }}
                                            />
                                        </Col>
                                    </Row>
                                </Col>
                            ))}
                        </Row>
                    </Col>
                    <OverlayTrigger
                        overlay={this.renderTotalLandRegionsTooltip(this.house)}
                        delay={{ show: 250, hide: 100 }}
                        placement="auto"
                    >
                        <Col xs="auto" className={classNames("d-flex align-items-center", {"invisible": this.isVassal})}>
                            <div style={{fontSize: "18px"}}>{this.game.getTotalHeldStructures(this.house)}</div>
                            <img
                                src={castleImage} width={32} className="hover-weak-outline"
                                style={{marginLeft: "10px"}}
                            />
                    </Col>
                    </OverlayTrigger>
                    <Col xs="auto" className={classNames("d-flex align-items-center", {"invisible": this.isVassal})}>
                        <div style={{fontSize: "18px"}}>{this.house.powerTokens}</div>
                        <OverlayTrigger
                            overlay={this.renderPowerTooltip(this.house)}
                            delay={{show: 750, hide: 100}}
                            placement="auto"
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
                    {_.sortBy(this.house.houseCards.values, hc => hc.combatStrength).map(hc => (
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
                    ))}
                </Row>
            </ListGroupItem>
        </>;
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
}