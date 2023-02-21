import GameClient from "./GameClient";
import { Component, ReactNode } from "react";
import React from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { ListGroupItem, Row, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import classNames from "classnames";
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
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import { observer } from "mobx-react";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";

interface HouseSnapshotComponentProps {
    house: House;
    isVassal?: boolean;
    suzerainHouseId?: string;
    totalLandAreas: number;
    gameClient: GameClient;
    ingame: IngameGameState;
}

@observer
export default class HouseSnapshotComponent extends Component<HouseSnapshotComponentProps> {
    get house(): House {
        return this.props.house;
    }

    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get suzerainHouse(): House | null {
        return this.props.suzerainHouseId ? this.game.houses.get(this.props.suzerainHouseId) : null;
    }

    render(): ReactNode {
        const isVassal = this.props.isVassal;
        const victoryPoints = this.house.victoryPoints;

        let victoryPointsWarning = false;
        let victoryPointsCritical = false;

        if (this.house.id == "targaryen") {
            victoryPointsWarning = this.game.loyaltyTokenCountNeededToWin - 2 == victoryPoints;
            victoryPointsCritical = this.game.loyaltyTokenCountNeededToWin - 1 == victoryPoints || this.game.loyaltyTokenCountNeededToWin == victoryPoints;
        } else {
            victoryPointsWarning = this.game.victoryPointsCountNeededToWin - 2 == victoryPoints;
            victoryPointsCritical = this.game.victoryPointsCountNeededToWin - 1 == victoryPoints || this.game.victoryPointsCountNeededToWin == victoryPoints;
        }

        const victoryImage = this.props.ingame.entireGame.isFeastForCrows
            ? laurelCrownImage :
                this.house.id == "targaryen"
                    ? verticalBanner
                    : castleImage;

        return <ListGroupItem style={{padding: 0, margin: 0}}>
            <div style={{paddingLeft: "8px", paddingRight: "10px", paddingTop: "12px", paddingBottom: "12px"}}>
            <Row className="align-items-center flex-nowrap">
                <Col xs="auto" className="pr-0" style={{ width: "32px" }}>
                    <OverlayTrigger
                        placement="right"
                        overlay={
                            <Tooltip id={"vassal-house-" + this.house.id}>
                                <b>Vassal</b><br />
                                At the beginning of the Planning Phase,
                                each player, in order, can pick a vassal to command this turn.
                            </Tooltip>
                        }
                    >
                        <img src={battleGearImage} width={32} style={{ margin: "-4px", visibility: isVassal ? "visible" : "hidden" }} />
                    </OverlayTrigger>
                </Col>
                <Col className="pr-0">
                    <h5 style={{ margin: 0, padding: 0 }}><b style={{ "color": this.house.color }}>{this.house.name}</b><br /></h5>
                    {isVassal && (this.suzerainHouse
                        ? <>Commanded by <span style={{color: this.suzerainHouse.color}}>{this.suzerainHouse.name}</span></>
                        : <>Up for grab</>)
                    }
                </Col>
                {!isVassal && <OverlayTrigger
                        overlay={<Tooltip id={this.house.id + "-victory-tooltip"} className="tooltip-w-100">
                            <Col>
                                <h5 className="text-center mx-2">Total Land Areas</h5>
                                <h4 className="text-center"><b>{this.props.totalLandAreas}</b></h4>
                            </Col>
                        </Tooltip>}
                        delay={{ show: 250, hide: 100 }}
                        placement="auto"
                >
                    <Col xs="auto" className="d-flex align-items-center">
                        <div style={{ fontSize: "1.25rem", color: victoryPointsWarning ? "#F39C12" : victoryPointsCritical ? "#FF0000" : undefined }}><b>{victoryPoints}</b></div>
                        <img
                            className={classNames(
                                "ml-2",
                                { "dye-warning": victoryPointsWarning },
                                { "dye-critical": victoryPointsCritical })}
                            src={victoryImage} width={40}
                        />
                    </Col>
                </OverlayTrigger>}
                <Col xs="auto" className={classNames("d-flex align-items-center", { "invisible": isVassal })}>
                    <b style={{ fontSize: "1.125rem" }}>{this.house.powerTokens}</b>
                    <div className="ml-2 p-1">
                        <div
                            className="house-power-token"
                            style={{
                                backgroundImage: `url(${housePowerTokensImages.get(this.house.id)})`,
                            }}
                        />
                    </div>
                </Col>
            </Row>
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
            </div>
        </ListGroupItem>;
    }

    private renderUnitTypeTooltip(unitType: UnitType): OverlayChildren {
        return <Tooltip id={unitType.id + "-tooltip"}>
            <b>{unitType.name}</b><br/>
            {unitType.description}
        </Tooltip>;
    }
}