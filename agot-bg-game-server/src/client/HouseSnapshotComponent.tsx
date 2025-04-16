import GameClient from "./GameClient";
import { Component, ReactNode } from "react";
import React from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { ListGroupItem, Row, Col, Tooltip } from "react-bootstrap";
import classNames from "classnames";
import housePowerTokensImages from "./housePowerTokensImages";
import _ from "lodash";
import HouseCard, {
  HouseCardState,
} from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import HouseCardBackComponent from "./game-state-panel/utils/HouseCardBackComponent";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import castleImage from "../../public/images/icons/castle.svg";
import battleGearImage from "../../public/images/icons/battle-gear.svg";
import verticalBanner from "../../public/images/icons/vertical-banner.svg";
import laurelCrownImage from "../../public/images/icons/laurel-crown.svg";
import worldImage from "../../public/images/icons/world.svg";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import { observer } from "mobx-react";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import HouseSnapshot from "./game-replay/HouseSnapshot";
import allKnownHouseCards from "./utils/houseCardHelper";

interface HouseSnapshotComponentProps {
  house: HouseSnapshot;
  gameClient: GameClient;
  ingame: IngameGameState;
}

@observer
export default class HouseSnapshotComponent extends Component<HouseSnapshotComponentProps> {
  get house(): HouseSnapshot {
    return this.props.house;
  }

  get ingame(): IngameGameState {
    return this.props.ingame;
  }

  get game(): Game {
    return this.ingame.game;
  }

  get suzerainHouse(): House | null {
    return this.house.suzerainHouseId
      ? this.game.houses.get(this.house.suzerainHouseId)
      : null;
  }

  render(): ReactNode {
    const isVassal = this.house.isVassal;
    const victoryPoints = this.house.victoryPointsUI;

    let victoryPointsWarning = false;
    let victoryPointsCritical = false;

    if (this.house.id == "targaryen") {
      victoryPointsWarning =
        this.game.loyaltyTokenCountNeededToWin - 2 == victoryPoints;
      victoryPointsCritical =
        this.game.loyaltyTokenCountNeededToWin - 1 == victoryPoints ||
        this.game.loyaltyTokenCountNeededToWin == victoryPoints;
    } else {
      victoryPointsWarning =
        this.game.victoryPointsCountNeededToWin - 2 == victoryPoints;
      victoryPointsCritical =
        this.game.victoryPointsCountNeededToWin - 1 == victoryPoints ||
        this.game.victoryPointsCountNeededToWin == victoryPoints;
    }

    const victoryImage = this.props.ingame.entireGame.isFeastForCrows
      ? laurelCrownImage
      : this.house.id == "targaryen"
        ? verticalBanner
        : castleImage;

    const house = this.ingame.game.houses.get(this.house.id);

    return (
      <ListGroupItem style={{ padding: 0, margin: 0 }}>
        <div
          style={{
            paddingLeft: "8px",
            paddingRight: "10px",
            paddingTop: "12px",
            paddingBottom: "12px",
          }}
        >
          <Row className="align-items-center flex-nowrap">
            <Col xs="auto" style={{ width: "32px" }}>
              <img
                src={battleGearImage}
                width={32}
                style={{
                  margin: "-4px",
                  visibility: isVassal ? "visible" : "hidden",
                }}
              />
            </Col>
            <Col xs="4">
              <h5 style={{ margin: 0, padding: 0 }}>
                <b style={{ color: house.color }}>{house.name}</b>
                <br />
              </h5>
              {isVassal &&
                (this.suzerainHouse ? (
                  <>
                    Commanded by{" "}
                    <span style={{ color: this.suzerainHouse.color }}>
                      {this.suzerainHouse.name}
                    </span>
                  </>
                ) : (
                  <>Up for grab</>
                ))}
            </Col>
            <Col>
              <Row className="flex-nowrap justify-content-between">
                <Col
                  xs="auto"
                  className={classNames("d-flex align-items-center", {
                    invisible: isVassal,
                  })}
                >
                  <div
                    style={{
                      fontSize: "1.25rem",
                      color: victoryPointsWarning
                        ? "#F39C12"
                        : victoryPointsCritical
                          ? "#FF0000"
                          : undefined,
                    }}
                  >
                    <b>{victoryPoints}</b>
                  </div>
                  <img
                    className={classNames(
                      "ml-2",
                      { "dye-warning": victoryPointsWarning },
                      { "dye-critical": victoryPointsCritical }
                    )}
                    src={victoryImage}
                    width={40}
                  />
                </Col>
                <Col xs="auto" className="d-flex align-items-center">
                  <b
                    style={{
                      fontSize: "1.125rem",
                    }}
                  >
                    {this.house.landAreaCount}
                  </b>
                  <img className="ml-2" src={worldImage} width={24} />
                </Col>
                <Col
                  xs="auto"
                  className={classNames("d-flex align-items-center", {
                    invisible: isVassal,
                  })}
                >
                  <b style={{ fontSize: "1.125rem" }}>
                    {this.house.powerTokens}
                  </b>
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
            </Col>
          </Row>
          <Row className="justify-content-center">
            {!isVassal
              ? _.sortBy(
                  this.house.houseCards.map(
                    (hc) =>
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      [allKnownHouseCards.get(hc.id)!, hc.state] as [
                        HouseCard,
                        HouseCardState,
                      ]
                  ),
                  ([card, _]) => card.combatStrength
                ).map(([hc, state]) => (
                  <Col xs="auto" key={`house-card_${this.house.id}_${hc.id}`}>
                    {state == HouseCardState.AVAILABLE ? (
                      <HouseCardComponent houseCard={hc} size="tiny" />
                    ) : (
                      <HouseCardBackComponent
                        house={this.house}
                        houseCard={hc}
                        size="tiny"
                      />
                    )}
                  </Col>
                ))
              : _.sortBy(
                  this.game.vassalHouseCards.values,
                  (hc) => hc.combatStrength
                ).map((hc) => (
                  <Col xs="auto" key={`vassal-cards_${this.house.id}_${hc.id}`}>
                    {hc.state == HouseCardState.AVAILABLE ? (
                      <HouseCardComponent houseCard={hc} size="tiny" />
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
      </ListGroupItem>
    );
  }

  private renderUnitTypeTooltip(unitType: UnitType): OverlayChildren {
    return (
      <Tooltip id={unitType.id + "-tooltip"}>
        <b>{unitType.name}</b>
        <br />
        {unitType.description}
      </Tooltip>
    );
  }
}
