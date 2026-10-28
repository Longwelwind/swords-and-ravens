import { t, Trans, translateGameText, getLanguage } from "./i18n";
import { Component, ReactNode } from "react";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IngameGameState, {
  ReplacementReason
} from "../common/ingame-game-state/IngameGameState";
import {
  GameLogData,
  PlayerActionType
} from "../common/ingame-game-state/game-data-structure/GameLog";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import House from "../common/ingame-game-state/game-data-structure/House";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import World from "../common/ingame-game-state/game-data-structure/World";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import { westerosCardTypes } from "../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";
import { observer } from "mobx-react";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";
import WildlingCard from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCard";
import WesterosCardComponent from "./game-state-panel/utils/WesterosCardComponent";
import _ from "lodash";
import joinReactNodes from "./utils/joinReactNodes";
import orders from "../common/ingame-game-state/game-data-structure/orders";
import CombatInfoComponent from "./CombatInfoComponent";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import User from "../server/User";
import BetterMap from "../utils/BetterMap";
import { tidesOfBattleCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import { preventOverflow } from "@popperjs/core";
import loanCardTypes from "../common/ingame-game-state/game-data-structure/loan-card/loanCardTypes";
import orderTypes from "../common/ingame-game-state/game-data-structure/order-types/orderTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFastForward } from "@fortawesome/free-solid-svg-icons";
import LoanCardComponent from "./game-state-panel/utils/LoanCardComponent";
import { objectiveCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/objectiveCards";
import ObjectiveCardComponent from "./game-state-panel/utils/ObjectiveCardComponent";
import { ObjectiveCard } from "../common/ingame-game-state/game-data-structure/static-data-structure/ObjectiveCard";
import crossedSwordsImage from "../../public/images/icons/crossed-swords.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import getUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";
import GameClient from "./GameClient";
import GameLogManager, {
  ticksToTime,
  timeToTicks
} from "../common/ingame-game-state/game-data-structure/GameLogManager";
import { secondsToString } from "./utils/secondsToString";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import orderImages from "./orderImages";
import presentImage from "../../public/images/icons/present.svg";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import allKnownHouseCards from "./utils/houseCardHelper";
import classNames from "classnames";
import GameReplayManager from "./game-replay/GameReplayManager";

interface GameLogListComponentProps {
  ingameGameState: IngameGameState;
  gameClient: GameClient;
  currentlyViewed: boolean;
  scrollToLog?: number;
  wildlingCardsOnly?: boolean;
}

@observer
export default class GameLogListComponent extends Component<GameLogListComponentProps> {
  private allHouseCards = allKnownHouseCards;
  allHouseCardsByAbilityId = new BetterMap(
    this.allHouseCards.values
      .filter((hc) => hc.ability != null)
      .map((hc) => [hc.ability?.id ?? "ability-never-null-here", hc])
  );

  get ingame(): IngameGameState {
    return this.props.ingameGameState;
  }

  get game(): Game {
    return this.ingame.game;
  }

  get world(): World {
    return this.game.world;
  }

  get logManager(): GameLogManager {
    return this.ingame.gameLogManager;
  }

  get replayManager(): GameReplayManager {
    return this.ingame.replayManager;
  }

  get fogOfWar(): boolean {
    return this.ingame.fogOfWar;
  }

  render(): ReactNode {
    const lastSeenLogTicks = this.props.gameClient.authenticatedUser
      ? this.logManager.lastSeenLogTimes.tryGet(
          this.props.gameClient.authenticatedUser,
          null
        )
      : null;

    const lastSeenLogTime = lastSeenLogTicks
      ? ticksToTime(lastSeenLogTicks)
      : null;

    let currentRound = 0;
    const visibleLogs = this.logManager.logs
      .map((log, index) => {
        if (log.data.type == "turn-begin") {
          currentRound = log.data.turn;
        }
        return { log, index, round: currentRound };
      })
      .filter(
        ({ log }) =>
          !this.props.wildlingCardsOnly ||
          log.data.type == "wildling-card-revealed"
      );

    if (this.props.wildlingCardsOnly && visibleLogs.length == 0) {
      return (
        <p className="text-center">
          {t("gameLogList.noWildlingCardsRevealed")}
        </p>
      );
    }

    const highlightLog = (i: number): boolean => {
      return this.replayManager.isReplayMode
        ? i == this.replayManager.selectedLogIndex
        : this.replayManager.isModifyingGameLogUI(this.logManager.logs[i].data);
    };

    return visibleLogs.map(({ log: l, index: i, round }, visibleIndex) => (
      <div key={`log_${i}`}>
        {this.props.wildlingCardsOnly &&
          (visibleIndex == 0 || visibleLogs[visibleIndex - 1].round != round) &&
          this.renderGameLogData({ type: "turn-begin", turn: round }, round)}
        {lastSeenLogTime == null && visibleIndex == 0 && (
          <Row className="justify-content-center align-items-center">
            <Col xs={true}>
              <hr className="red" />
            </Col>
            <Col xs="auto" style={{ color: "red" }}>
              <h6>{t("gameLogList.newLogEntriesb7cd7c")}</h6>
            </Col>
            <Col xs={true}>
              <hr className="red" />
            </Col>
          </Row>
        )}
        <Row>
          <Col xs="auto" className="text-muted px-0 ms-2">
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip id={"log-date-" + l.time.getUTCMilliseconds()}>
                  {l.time.toLocaleString(getLanguage())}
                </Tooltip>
              }
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <small>
                {l.time.toLocaleTimeString(getLanguage(), {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false
                })}
              </small>
            </OverlayTrigger>
          </Col>
          {l.resolvedAutomatically && (
            <Col xs="auto">
              <OverlayTrigger
                overlay={
                  <Tooltip id="logs-tooltip">
                    {t(
                      "gameLogList.thisActionHasBeenResolvedAutomatically3ead33"
                    )}
                  </Tooltip>
                }
                placement="auto"
                popperConfig={{ modifiers: [preventOverflow] }}
              >
                <span>
                  <FontAwesomeIcon
                    style={{ color: "white" }}
                    icon={faFastForward}
                  />
                </span>
              </OverlayTrigger>
            </Col>
          )}
          <Col className="me-2">
            <div
              id={`game-log-content-${i}`}
              className={classNames("game-log-content", {
                "highlight-log": highlightLog(i),
                "clickable-no-underline": this.replayManager.isReplayMode
              })}
              onClick={() => {
                if (this.replayManager.isReplayMode) {
                  this.onLogClick(i);
                } else if (highlightLog(i)) {
                  this.onLogClick(i);
                }
              }}
            >
              {this.renderGameLogData(l.data, round)}
            </div>
          </Col>
        </Row>
        {lastSeenLogTime &&
          visibleIndex + 1 < visibleLogs.length &&
          l.time <= lastSeenLogTime &&
          visibleLogs[visibleIndex + 1].log.time > lastSeenLogTime && (
            <Row className="justify-content-center align-items-center">
              <Col xs={true}>
                <hr className="red" />
              </Col>
              <Col xs="auto" style={{ color: "red" }}>
                <h6>{t("gameLogList.newLogEntriesb7cd7c")}</h6>
              </Col>
              <Col xs={true}>
                <hr className="red" />
              </Col>
            </Row>
          )}
      </div>
    ));
  }

  onLogClick(i: number): void {
    this.replayManager.selectLog(i);
  }

  renderGameLogData(data: GameLogData, currentRound: number): ReactNode {
    switch (data.type) {
      case "player-action": {
        const house = this.game.houses.get(data.house);
        const forHouses = data.forHouses
          ? data.forHouses.map((hid) => this.game.houses.get(hid))
          : null;
        let text: string;

        switch (data.action) {
          case PlayerActionType.ORDERS_PLACED:
            text = t("gameLogList.placedTheirOrders56f84c");
            break;
          case PlayerActionType.BID_MADE:
            text = t("gameLogList.madeTheirBid82f16f");
            break;
          case PlayerActionType.HOUSE_CARD_CHOSEN:
            text = t("gameLogList.choseTheirHouseCard7cc16f");
            break;
          default:
            text = t("gameLogList.invalidPlayeractiontypeReceived980e13");
            break;
        }
        return (
          <p>
            <Trans
              i18nKey="gameLogList.house1fa976"
              values={{ house: house.name, action: text }}
              components={{
                bold: <b />,
                vassals: (
                  <>
                    {forHouses ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.for196ccd"
                          components={{
                            houses: (
                              <>
                                {forHouses.length == 1 ? (
                                  <>
                                    <Trans
                                      i18nKey="gameLogList.vassalHouse9a9755"
                                      values={{ house: forHouses[0].name }}
                                      components={{
                                        bold: (
                                          <b
                                            key={`for_vassal_house_${forHouses[0].id}`}
                                          />
                                        )
                                      }}
                                    />
                                  </>
                                ) : (
                                  joinReactNodes(
                                    forHouses.map((h) => (
                                      <b key={`for_vassal_house_${h.id}`}>
                                        {h.name}
                                      </b>
                                    )),
                                    ", "
                                  )
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <></>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "user-house-assignments":
        const assignments = data.assignments.map(([houseId, userId]) => [
          this.game.houses.get(houseId),
          this.ingame.entireGame.users.get(userId)
        ]) as [House, User][];
        return (
          <>
            <div id="gamelog-round-0" className="text-center mb-4">
              <h4>
                <Trans
                  i18nKey="gameLogList.theWarOfTheKingsHasBegun9a446a"
                  values={{ kingCount: assignments.length }}
                />
              </h4>
            </div>
            {assignments.map(([house, user]) => (
              <p key={`${house.id}_${user.id}`}>
                <Trans
                  i18nKey="gameLogList.isControlledBy9cf9a1"
                  components={{
                    house: <>{this.renderHouseName(house)}</>,
                    bold: <b />,
                    user: <>{getUserLinkOrLabel(user)}</>
                  }}
                />
              </p>
            ))}
          </>
        );
      case "turn-begin":
        return (
          <Row className="justify-content-center">
            <Col xs={true}>
              <hr />
            </Col>
            <Col xs="auto">
              <h3 id={`gamelog-round-${data.turn}`}>
                <Trans
                  i18nKey="gameLogList.roundce52f1"
                  values={{ turn: data.turn }}
                  components={{ bold: <b /> }}
                />
              </h3>
            </Col>
            <Col xs={true}>
              <hr />
            </Col>
          </Row>
        );

      case "support-declared":
        const supporter = this.game.houses.get(data.supporter);
        const supported = data.supported
          ? this.game.houses.get(data.supported)
          : null;
        if (supported) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseSupportedHouseaa02c0"
                values={{
                  supporter: supporter.name,
                  supported: supported.name
                }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        } else {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseSupportedNoOnee03b29"
                values={{ supporter: supporter.name }}
                components={{ bold: <b /> }}
              />
            </p>
          );
        }

      case "support-refused": {
        const house = this.game.houses.get(data.house);
        const from = data.from ? this.game.houses.get(data.from) : null;
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseChoseToRefuseTheSupportTheyReceived753a8e"
              values={{
                house: house.name,
                allSupport: from == null ? t("gameLogList.all5ef5ef") : ""
              }}
              components={{
                bold: <b />,
                from: (
                  <>
                    {from ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.fromHouseb80cdb"
                          values={{ from: from.name }}
                          components={{
                            bold: <b />
                          }}
                        />
                      </>
                    ) : null}
                  </>
                )
              }}
            />
          </p>
        );
      }

      case "attack":
        const attacker = this.game.houses.get(data.attacker);
        // A "null" for "attacked" means it was an attack against a neutral force
        const attacked = data.attacked
          ? this.game.houses.get(data.attacked)
          : null;
        const attackingRegion = this.game.world.regions.get(
          data.attackingRegion
        );
        const attackedRegion = this.game.world.regions.get(data.attackedRegion);
        const army = data.units.map((utid) => unitTypes.get(utid));
        const orderImgUrl = data.orderType
          ? orderImages.get(data.orderType)
          : null;

        return (
          <Row className="align-items-center">
            {orderImgUrl && (
              <Col xs="auto">
                <img src={orderImgUrl} width="42px" />
              </Col>
            )}
            <Col xs="auto">
              <img src={crossedSwordsImage} width="32px" />
            </Col>
            <Col>
              <Trans
                i18nKey="gameLogList.houseAttackedFromToWith7c4199"
                values={{
                  attacker: attacker.name,
                  attackingRegion: attackingRegion.name,
                  attackedRegion: attackedRegion.name
                }}
                components={{
                  bold: <b />,
                  attacked: (
                    <>
                      {attacked ? (
                        <>
                          <Trans
                            i18nKey="gameLogList.house7d99a9"
                            values={{ attacked: attacked.name }}
                            components={{
                              bold: <b />
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <Trans
                            i18nKey="gameLogList.aNeutralForce77580a"
                            components={{ bold: <b /> }}
                          />
                        </>
                      )}
                    </>
                  ),
                  bold2: <b />,
                  bold3: <b />,
                  joinReactNodes: (
                    <>
                      {joinReactNodes(
                        army.map((ut, i) => (
                          <b key={`attack_${ut.id}_${i}`}>
                            {this.fogOfWar
                              ? t("common.hiddenUnit")
                              : translateGameText(ut.name)}
                          </b>
                        )),
                        ", "
                      )}
                    </>
                  )
                }}
              />
            </Col>
          </Row>
        );

      case "march-resolved": {
        const house = this.game.houses.get(data.house);

        if (this.fogOfWar) {
          return (
            <Row className="align-items-center">
              <Col>
                <p>
                  <Trans
                    i18nKey="gameLogList.houseResolvedAMarchOrderfa9694"
                    values={{ house: house.name }}
                    components={{
                      bold: <b />,
                      bold2: <b />
                    }}
                  />
                </p>
              </Col>
            </Row>
          );
        }

        const startingRegion = this.world.regions.get(data.startingRegion);
        const moves: [Region, UnitType[]][] = data.moves.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]);
        const orderImgUrl = data.orderType
          ? orderImages.get(data.orderType)
          : null;

        return (
          <Row className="align-items-center">
            {orderImgUrl && (
              <Col xs="auto">
                <img src={orderImgUrl} width="42px" />
              </Col>
            )}
            <Col>
              {moves.length > 0 ? (
                <>
                  <p>
                    <Trans
                      i18nKey="gameLogList.houseMarchedFrom5c5118"
                      values={{
                        house: house.name,
                        startingRegion: startingRegion.name
                      }}
                      components={{
                        bold: <b />,
                        bold2: <b />
                      }}
                    />
                  </p>
                  <ul>
                    {moves.map(([region, unitTypes]) => (
                      <li key={`march-resolved_${region.id}`}>
                        <Trans
                          i18nKey="gameLogList.to3609b4"
                          values={{ region: region.name }}
                          components={{
                            units: (
                              <>
                                {joinReactNodes(
                                  unitTypes.map((ut, i) => (
                                    <b key={`march_${region.id}_${ut.id}_${i}`}>
                                      {this.fogOfWar
                                        ? t("common.hiddenUnit")
                                        : translateGameText(ut.name)}
                                    </b>
                                  )),
                                  ", "
                                )}
                              </>
                            ),
                            bold: <b />
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    <Trans
                      i18nKey="gameLogList.houseRemovedTheirMarchOrderIn2f880b"
                      values={{
                        house: house.name,
                        startingRegion: startingRegion.name
                      }}
                      components={{
                        bold: <b />,
                        bold2: <b />
                      }}
                    />
                  </p>
                </>
              )}
            </Col>
          </Row>
        );
      }
      case "leave-power-token-choice": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseLeftPowerTokenIn5ca329"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                tokenPlacement: (
                  <>
                    {data.leftPowerToken ? (
                      <>{t("gameLogList.behindA03f8e8")}</>
                    ) : (
                      <b>{t("gameLogList.no939029")}</b>
                    )}
                  </>
                ),
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "westeros-card-executed":
        const westerosCardType = westerosCardTypes.get(data.westerosCardType);

        return (
          <>
            <Row className="justify-content-center">
              <Col xs="auto">
                <WesterosCardComponent
                  cardType={westerosCardType}
                  size="medium"
                  tooltip={true}
                  westerosDeckI={data.westerosDeckI}
                  showTitle={true}
                />
              </Col>
            </Row>
          </>
        );

      case "westeros-cards-drawn":
        const drawnWesterosCardTypes = data.westerosCardTypes.map((wctid) =>
          westerosCardTypes.get(wctid)
        );

        return (
          <>
            <p>{t("gameLogList.westerosCardsWereDrawn3f179c")}</p>
            <Row className="justify-content-around">
              {drawnWesterosCardTypes.map((wct, i) => (
                <Col xs="auto" key={`${wct.id}_${i}`}>
                  <WesterosCardComponent
                    cardType={wct}
                    size="small"
                    tooltip={true}
                    westerosDeckI={
                      !data.revealAndResolveTop3WesterosDeck4Cards ? i : 3
                    }
                    showTitle={true}
                  />
                </Col>
              ))}
            </Row>
            {data.addedWildlingStrength > 0 && (
              <p style={{ marginTop: "1.0em" }}>
                <Trans
                  i18nKey="gameLogList.wildlingThreatIncreasedBy7c5dd1"
                  values={{ addedWildlingStrength: data.addedWildlingStrength }}
                />
              </p>
            )}
          </>
        );

      case "combat-result":
        const winner = this.game.houses.get(data.winner);
        const houseCombatDatas = data.stats.map((stat) => {
          const house = this.game.houses.get(stat.house);
          const houseCard =
            stat.houseCard != null
              ? this.allHouseCards.get(stat.houseCard)
              : null;
          const tidesOfBattleCard =
            stat.tidesOfBattleCard === undefined
              ? undefined
              : stat.tidesOfBattleCard != null
                ? tidesOfBattleCards.get(stat.tidesOfBattleCard)
                : null;

          return {
            ...stat,
            house,
            region: this.world.regions.get(stat.region),
            houseCard: houseCard,
            armyUnits: stat.armyUnits.map((ut) => unitTypes.get(ut)),
            woundedUnits: stat.woundedUnits.map((ut) => unitTypes.get(ut)),
            tidesOfBattleCard: tidesOfBattleCard,
            isWinner: house == winner
          };
        });

        return (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CombatInfoComponent housesCombatData={houseCombatDatas} />
            </div>
            <p className="text-center mt-4">
              <Trans
                i18nKey="gameLogList.houseWonTheBattle8bc1a0"
                values={{ winner: winner.name }}
                components={{
                  bold: (
                    <b style={{ color: winner.color, fontSize: "1.25rem" }} />
                  )
                }}
              />
            </p>
          </>
        );
      case "wildling-card-revealed":
        const wildlingCard = this.game.wildlingDeck.find(
          (wc) => wc.id == data.wildlingCard
        ) as WildlingCard;

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.wildlingCardRevealed20a9c2"
                values={{ wildlingCardType: wildlingCard.type.name }}
                components={{
                  bold: <b />
                }}
              />
            </p>
            <Row className="justify-content-center">
              <Col xs="auto">
                <WildlingCardComponent
                  cardType={wildlingCard.type}
                  size="medium"
                  tooltip
                />
              </Col>
            </Row>
          </>
        );
      case "wildling-bidding": {
        const bids = _.flatMap(
          data.results.map(([bid, hids]) =>
            hids.map(
              (hid) => [this.game.houses.get(hid), bid] as [House, number]
            )
          )
        );

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.wildlingBiddingResultsForWildlingThreat1aac47"
                values={{ wildlingStrength: data.wildlingStrength }}
                components={{
                  bold: <b />
                }}
              />
            </p>
            <div className="mt-1">
              <HouseNumberResultsComponent
                results={bids}
                keyPrefix="wildlings-log"
              ></HouseNumberResultsComponent>
            </div>
            {data.nightsWatchVictory ? (
              <p className="text-center">
                <Trans
                  i18nKey="gameLogList.theNightSWatchWon84c407"
                  components={{ bold: <b /> }}
                />
              </p>
            ) : (
              <p className="text-center">
                <Trans
                  i18nKey="gameLogList.theWildlingsWonfc07f6"
                  components={{ bold: <b /> }}
                />
              </p>
            )}
          </>
        );
      }
      case "lowest-bidder-chosen": {
        const lowestBidder = this.game.houses.get(data.lowestBidder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseWasChosenAsTheLowestBidder31c374"
              values={{ lowestBidder: lowestBidder.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "highest-bidder-chosen":
        const highestBidder = this.game.houses.get(data.highestBidder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseWasChosenAsTheHighestBidder2e725c"
              values={{ highestBidder: highestBidder.name }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );

      case "player-mustered": {
        const house = this.game.houses.get(data.house);
        const musterings = data.musterings.map(
          ([originatingRegion, recruitments]) =>
            [
              this.game.world.regions.get(originatingRegion),
              recruitments.map(({ region, from, to }) => ({
                region: this.game.world.regions.get(region),
                from: from ? unitTypes.get(from) : null,
                to: unitTypes.get(to)
              }))
            ] as [
              Region,
              { region: Region; from: UnitType | null; to: UnitType }[]
            ]
        );

        return (
          <>
            {musterings.length == 0 && (
              <p>
                <Trans
                  i18nKey="gameLogList.houseMusteredNothingaa8622"
                  values={{ house: house.name }}
                  components={{ bold: <b /> }}
                />
              </p>
            )}
            {musterings.length > 0 && (
              <>
                {musterings.map(([originatingRegion, recruitments]) => (
                  <div key={`$mustering_${originatingRegion.id}`}>
                    <p>
                      <Trans
                        i18nKey="gameLogList.houseMusteredIn6fa3a2"
                        values={{
                          house: house.name,
                          originatingRegion: this.fogOfWar
                            ? t("common.hiddenRegion")
                            : originatingRegion.name
                        }}
                        components={{
                          bold: <b />,
                          bold2: <b />
                        }}
                      />
                    </p>
                    {!this.fogOfWar && (
                      <ul>
                        {recruitments.map(({ region, from, to }, i) => (
                          <li key={"recruitment-" + region.id + "-" + i}>
                            {from ? (
                              <>
                                <Trans
                                  i18nKey="gameLogList.aFromAef18b6"
                                  values={{
                                    newUnitType: translateGameText(to.name),
                                    oldUnitType: translateGameText(from.name)
                                  }}
                                  components={{
                                    bold: <b />,
                                    bold2: <b />,
                                    region: (
                                      <>
                                        {originatingRegion != region && (
                                          <>
                                            <Trans
                                              i18nKey="gameLogList.toc066b9"
                                              values={{
                                                region: this.fogOfWar
                                                  ? t("common.hiddenRegion")
                                                  : region.name
                                              }}
                                              components={{
                                                bold: <b />
                                              }}
                                            />
                                          </>
                                        )}
                                      </>
                                    )
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <Trans
                                  i18nKey="gameLogList.ab82d39"
                                  values={{
                                    unitType: translateGameText(to.name)
                                  }}
                                  components={{
                                    bold: <b />,
                                    region: (
                                      <>
                                        {originatingRegion != region && (
                                          <>
                                            <Trans
                                              i18nKey="gameLogList.toc066b9"
                                              values={{
                                                region: this.fogOfWar
                                                  ? t("common.hiddenRegion")
                                                  : region.name
                                              }}
                                              components={{
                                                bold: <b />
                                              }}
                                            />
                                          </>
                                        )}
                                      </>
                                    )
                                  }}
                                />
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        );
      }
      case "winner-declared": {
        const winner = this.game.houses.get(data.winner);
        return (
          <h4 className="text-center">
            <Trans
              i18nKey="gameLogList.gameHasEndedHasWonThisGameOfThrones1c42d4"
              components={{
                lineBreak: <br />,
                winner: <>{this.renderHouseName(winner)}</>
              }}
            />
          </h4>
        );
      }
      case "raven-holder-wildling-card-put-bottom": {
        const house = this.game.houses.get(data.ravenHolder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheMessengerRavenTokenChoseTof0b73b"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "raven-holder-wildling-card-put-top": {
        const house = this.game.houses.get(data.ravenHolder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheMessengerRavenTokenChoseTo3350b4"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "raven-holder-replace-order": {
        const house = this.game.houses.get(data.ravenHolder);
        const orderRegion = this.world.regions.get(data.region);
        const originalOrder = orders.get(data.originalOrder);
        const newOrder = orders.get(data.newOrder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheMessengerRavenTokenChoseTo6963a7"
              values={{
                house: house.name,
                originalOrder: this.fogOfWar
                  ? ""
                  : translateGameText(originalOrder.type.name),
                newOrder: this.fogOfWar
                  ? ""
                  : translateGameText(newOrder.type.name),
                orderRegion: this.fogOfWar
                  ? t("common.hiddenRegion")
                  : orderRegion.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "raven-not-used": {
        const house = this.game.houses.get(data.ravenHolder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseDidNotUseTheMessengerRavenTokene4f855"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }

      case "raid-done":
        const raider = this.game.houses.get(data.raider);
        const raiderRegion = this.world.regions.get(data.raiderRegion);
        const raidee = data.raidee ? this.game.houses.get(data.raidee) : null;
        const raidedRegion = data.raidedRegion
          ? this.world.regions.get(data.raidedRegion)
          : null;
        const orderRaided = data.orderRaided
          ? orders.get(data.orderRaided)
          : null;

        if (this.fogOfWar) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseResolvedARaidOrdereadfeb"
                values={{ raider: raider.name }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        }

        // Those 3 variables will always be all null or all non-null
        if (raidee && raidedRegion && orderRaided) {
          return (
            <>
              <p>
                <Trans
                  i18nKey="gameLogList.houseRaidedHouseSOrderInFromf7952e"
                  values={{
                    raider: raider.name,
                    raidee: raidee.name,
                    orderRaidedType: translateGameText(orderRaided.type.name),
                    raidedRegion: raidedRegion.name,
                    raiderRegion: raiderRegion.name
                  }}
                  components={{
                    bold: <b />,
                    bold2: <b />,
                    bold3: <b />,
                    bold4: <b />,
                    bold5: <b />
                  }}
                />
              </p>
              {data.raiderGainedPowerToken && (
                <p>
                  <Trans
                    i18nKey="gameLogList.raidPowerGained"
                    count={data.raiderGainedPowerToken ? 1 : 0}
                    values={{ raider: raider.name }}
                    components={{ bold: <b /> }}
                  />
                </p>
              )}
              {data.raidedHouseLostPowerToken != null && (
                <p>
                  <Trans
                    i18nKey="gameLogList.raidPowerLost"
                    count={data.raidedHouseLostPowerToken ? 1 : 0}
                    values={{ raidee: raidee.name }}
                    components={{ bold: <b /> }}
                  />
                </p>
              )}
            </>
          );
        } else {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseRaidedNothingFromd0b397"
                values={{
                  raider: raider.name,
                  raiderRegion: raiderRegion.name
                }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        }

      case "a-throne-of-blades-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheIronThroneTokenChoseTo537053"
              values={{
                house: house.name,
                choice:
                  data.choice == 0
                    ? t("gameLogList.triggerAMusteringeda291")
                    : data.choice == 1
                      ? t("gameLogList.triggerASupply6c6ad3")
                      : t("gameLogList.triggerNothing938c4b")
              }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );
      }
      case "the-burden-of-power-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheIronThroneTokenChoseTo537053"
              values={{
                house: house.name,
                choice:
                  data.choice == 0
                    ? t(
                        "gameLogList.reduceTheWildlingTrackToThe0Position1690f3"
                      )
                    : t("gameLogList.triggerAMusteringeda291")
              }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );
      }
      case "dark-wings-dark-words-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheMessengerRavenTokenChoseTo2fabef"
              values={{
                house: house.name,
                choice:
                  data.choice == 0
                    ? t("gameLogList.triggerAClashOfKingse1cab5")
                    : data.choice == 1
                      ? t("gameLogList.triggerAGameOfThrones4f1f2c")
                      : t("gameLogList.triggerNothing938c4b")
              }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );
      }
      case "put-to-the-sword-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHolderOfTheValyrianSteelBladeTokenChose75df2b"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                choice: (
                  <>
                    {data.choice == 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.forbidMarch1OrdersFromBeingPlayedDuringThis352c9f"
                          components={{ bold: <b /> }}
                        />
                      </>
                    ) : data.choice == 1 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.forbidDefenseOrdersFromBeingPlayedDuringThisPlanning7306b5"
                          components={{ bold: <b /> }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.forbidNothing5d57e1")}</>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "winter-is-coming":
        const drawnCardType = westerosCardTypes.get(data.drawnCardType);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.winterIsComingTheWesterosDeckWasShuffledAnd75a5ea"
              values={{
                deckNumber: data.deckIndex + 1,
                drawnCardType: drawnCardType.name
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );

      case "westeros-phase-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h4>
                <b>{t("gameLogList.westerosPhase9004d5")}</b>
              </h4>
            </Col>
          </Row>
        );

      case "claim-vassals-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>{t("gameLogList.claimVassals58bd2f")}</b>
              </h5>
            </Col>
          </Row>
        );

      case "planning-phase-began":
        const content = (
          <b>
            <Trans
              i18nKey="gameLogList.planningPhase9e4dd3"
              components={{ vassalLabel: <>{data.forVassals && "Vassal "}</> }}
            />
          </b>
        );
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              {data.forVassals ? <h5>{content}</h5> : <h4>{content}</h4>}
            </Col>
          </Row>
        );

      case "draft-house-cards-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>{t("common.draftHouseCards")}</b>
              </h5>
            </Col>
          </Row>
        );

      case "house-card-picked": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.housePickedbda163"
              values={{ house: house.name, houseCard: houseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }

      case "house-cards-chosen": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHasChosenTheirHouseCardsc142da"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }

      case "action-phase-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h4>
                <b>{t("gameLogList.actionPhasedccc8a")}</b>
              </h4>
            </Col>
          </Row>
        );

      case "action-phase-resolve-raid-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>{t("gameLogList.resolveRaidOrders200b6b")}</b>
              </h5>
            </Col>
          </Row>
        );

      case "action-phase-resolve-march-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>{t("gameLogList.resolveMarchOrders052d0f")}</b>
              </h5>
            </Col>
          </Row>
        );

      case "action-phase-resolve-consolidate-power-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>{t("gameLogList.resolveConsolidatePowerOrders94e9fd")}</b>
              </h5>
            </Col>
          </Row>
        );

      case "combat-valyrian-sword-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseUsedTheValyrianSteelBladeToe9e0dd"
              values={{
                house: house.name,
                effect: data.forNewTidesOfBattleCard
                  ? t("common.drawANewTidesOfBattleCard")
                  : t("common.increaseTheirCombatStrengthBy1")
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "combat-house-card-chosen":
        const houseCards = data.houseCards.map(([hid, hcid]) => {
          const house = this.game.houses.get(hid);
          const houseCard = this.allHouseCards.get(hcid);
          return [house, houseCard];
        });

        return (
          <ul>
            {houseCards.map(([h, hc]) => (
              <li key={`housecard-chosen_${h.id}_${hc.id}`}>
                <Trans
                  i18nKey="gameLogList.houseChose571829"
                  values={{ house: h.name, houseCard: hc.name }}
                  components={{
                    bold: <b />,
                    bold2: <b />
                  }}
                />
              </li>
            ))}
          </ul>
        );

      case "clash-of-kings-final-ordering":
        const finalOrder = data.finalOrder.map((hid) =>
          this.game.houses.get(hid)
        );

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.finalOrderOfTrack5a3759"
                values={{
                  influenceTrack: translateGameText(
                    this.game.getNameInfluenceTrack(data.trackerI)
                  )
                }}
                components={{
                  bold: <b />
                }}
              />
            </p>
            <Row className="mb-2 mt-1 ms-2">
              {finalOrder.map((h) => (
                <Col xs="auto" key={`cok_final_${data.trackerI}_${h.id}`}>
                  <SimpleInfluenceIconComponent house={h} />
                </Col>
              ))}
            </Row>
          </>
        );

      case "clash-of-kings-bidding-done": {
        const bids = _.flatMap(
          data.results.map(([bid, hids]) =>
            hids.map(
              (hid) => [this.game.houses.get(hid), bid] as [House, number]
            )
          )
        );
        const distributor = data.distributor
          ? this.game.houses.get(data.distributor)
          : null;

        return (
          <>
            {distributor != null ? (
              <p>
                <Trans
                  i18nKey="gameLogList.houseAdaptedTheBiddingsForTrack623768"
                  values={{
                    distributor: distributor.name,
                    influenceTrack: translateGameText(
                      this.game.getNameInfluenceTrack(data.trackerI)
                    )
                  }}
                  components={{
                    bold: <b />,
                    bold2: <b />
                  }}
                />
              </p>
            ) : (
              <p>
                <Trans
                  i18nKey="gameLogList.housesBidForTrackbe03db"
                  values={{
                    influenceTrack: translateGameText(
                      this.game.getNameInfluenceTrack(data.trackerI)
                    )
                  }}
                  components={{
                    bold: <b />
                  }}
                />
              </p>
            )}

            <Row className="mb-1 mt-2 ms-2">
              <HouseNumberResultsComponent
                results={bids}
                keyPrefix={`cok_${data.trackerI}`}
              />
            </Row>
          </>
        );
      }
      case "wildling-strength-trigger-wildlings-attack": {
        return (
          <Row className="align-items-center">
            <Col xs="auto">
              <img src={mammothImage} width="24px" />
            </Col>
            <Col>
              <Trans
                i18nKey="gameLogList.wildlingThreatReachedTriggeringAWildlingAttackf6d00d"
                values={{ wildlingStrength: data.wildlingStrength }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </Col>
          </Row>
        );
      }
      case "consolidate-power-order-resolved": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        const countPowerToken = data.powerTokenCount;

        if (this.fogOfWar) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseResolvedAConsolidatePowerOrder2ee66a"
                values={{ house: house.name }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        }

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseResolvedAConsolidatePowerOrderInToGain6f364c"
              values={{
                house: house.name,
                region: region.name,
                countPowerToken: countPowerToken,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: countPowerToken
                }),
                specialLabel: data.starred ? t("gameLogList.special6268c6") : ""
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "armies-reconciled": {
        const house = this.game.houses.get(data.house);
        const armies = data.armies.map(
          ([rid, utids]) =>
            [
              this.world.regions.get(rid),
              utids.map((utid) => unitTypes.get(utid))
            ] as [Region, UnitType[]]
        );

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.houseReconciledTheirArmiesByDestroyingba8e39"
                values={{ house: house.name }}
                components={{ bold: <b /> }}
              />
            </p>
            <ul>
              {armies.map(([region, unitTypes]) => (
                <li key={`armies-reconciled_${region.id}`}>
                  <Trans
                    i18nKey="common.in"
                    values={{
                      region: this.fogOfWar
                        ? t("common.hiddenRegion")
                        : region.name
                    }}
                    components={{
                      units: (
                        <>
                          {joinReactNodes(
                            unitTypes.map((ut, i) => (
                              <b
                                key={`armies-reconciled_${region.id}_${ut.id}_${i}`}
                              >
                                {this.fogOfWar
                                  ? t("common.hiddenUnit")
                                  : translateGameText(ut.name)}
                              </b>
                            )),
                            ", "
                          )}
                        </>
                      ),
                      bold: <b />
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        );
      }
      case "house-card-ability-not-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCardsByAbilityId.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseDidNotUseSAbility02ccbb"
              values={{ house: house.name, houseCard: houseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "patchface-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.patchfaceHouseDecidedToDiscardFromHouse91e36f"
              values={{
                house: house.name,
                houseCard: houseCard.name,
                affectedHouse: affectedHouse.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "melisandre-dwd-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.melisandreHouseDiscardedToReturnToHanda3d42d"
              values={{
                house: house.name,
                houseCardCombatStrength: houseCard.combatStrength,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: houseCard.combatStrength
                }),
                houseCard: houseCard.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "jon-snow-used": {
        const house = this.game.houses.get(data.house);
        let wilddlingStatus = t("common.increase");
        if (data.wildlingsStrength < 0) {
          wilddlingStatus = t("common.decrease");
        }
        return (
          <p>
            <Trans
              i18nKey="gameLogList.jonSnowHouseDecidedToTheWildlingTrackBy0a275e"
              values={{ house: house.name, wilddlingStatus: wilddlingStatus }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "doran-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const influenceTrack = translateGameText(
          this.game.getNameInfluenceTrack(data.influenceTrack)
        );
        const skippedHouse = data.skippedHouse
          ? this.game.houses.get(data.skippedHouse)
          : null;

        const skippedAddition = skippedHouse ? (
          <>
            <Trans
              i18nKey="gameLogList.causingHouseSTurnToBeSkippedUntilThea4b1dd"
              values={{ skippedHouse: skippedHouse.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </>
        ) : null;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.doranMartellHouseDecidedToMoveHouseToThe273941"
              values={{
                house: house.name,
                affectedHouse: affectedHouse.name,
                influenceTrack: influenceTrack
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                skippedAddition: <>{skippedAddition}</>
              }}
            />
          </p>
        );
      }
      case "ser-gerris-drinkwater-used": {
        const house = this.game.houses.get(data.house);
        const influenceTrack = translateGameText(
          this.game.getNameInfluenceTrack(data.influenceTrack)
        );

        return (
          <p>
            <Trans
              i18nKey="gameLogList.serGerrisDrinkwaterHouseDecidedToIncreaseHisPosition6e7906"
              values={{ house: house.name, influenceTrack: influenceTrack }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "reek-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.reekHouseDecidedToReturnReekToHandd4090e"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "reek-returned-ramsay": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.returnedCardId);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.reekOfHouseWasReturnedToHandddfe5a"
              values={{ houseCard: houseCard.name, house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "lysa-arryn-mod-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.lysaArrynHouseDecidedToReturnLysaArrynTo476541"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "qyburn-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.qyburnHouseDecidedToUseTheCombatStrengthFrom1cd16e"
              values={{
                house: house.name,
                houseCardCombatStrength: houseCard.combatStrength,
                houseCard: houseCard.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                details: (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <HouseCardComponent houseCard={houseCard} size="small" />
                  </div>
                )
              }}
            />
          </p>
        );
      }
      case "aeron-damphair-used": {
        const house = this.game.houses.get(data.house);
        const tokens = data.tokens;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aeronDamphairHouseDecidedToIncreaseTheCombatStrengthcc92cc"
              values={{ house: house.name, tokens: tokens }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "rodrik-the-reader-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.rodrikTheReaderHouseDecidedToChooseACardca4e9e"
              values={{ house: house.name, deckNumber: data.westerosDeckI + 1 }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "tyrion-lannister-choice-made": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const chooseToReplace = data.chooseToReplace;

        return (
          <p>
            <Trans
              i18nKey={
                chooseToReplace
                  ? "gameLogList.tyrionForcedReplacement"
                  : "gameLogList.tyrionKeptCard"
              }
              values={{ house: house.name, affectedHouse: affectedHouse.name }}
              components={{
                cardName: <b />,
                actingHouse: <b />,
                targetHouse: <b />
              }}
            />
          </p>
        );
      }
      case "tyrion-lannister-house-card-replaced": {
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const newHouseCard = data.newHouseCard
          ? this.allHouseCards.get(data.newHouseCard)
          : null;

        return newHouseCard ? (
          <p>
            <Trans
              i18nKey="gameLogList.houseChosefe099b"
              values={{
                affectedHouse: affectedHouse.name,
                newHouseCard: newHouseCard.name
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        ) : (
          <p>
            <Trans
              i18nKey="gameLogList.houseHadNoOtherAvailableHouseCardc56b10"
              values={{ affectedHouse: affectedHouse.name }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );
      }
      case "arianne-martell-prevent-movement": {
        const enemyHouse = this.game.houses.get(data.enemyHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.arianneMartellHouseCannotMoveTheirArmyIntoThe9ce25f"
              values={{ enemyHouse: enemyHouse.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "arianne-martell-force-retreat": {
        const house = this.game.houses.get(data.house);
        const enemyHouse = this.game.houses.get(data.enemyHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.arianneMartellHouseForcedHouseToRetreat1940ae"
              values={{ house: house.name, enemyHouse: enemyHouse.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "roose-bolton-house-cards-returned": {
        const house = this.game.houses.get(data.house);
        const returnedHouseCards = data.houseCards.map((hcid) =>
          this.allHouseCards.get(hcid)
        );

        return returnedHouseCards.length > 0 ? (
          <p>
            <Trans
              i18nKey="gameLogList.rooseBoltonHouseTookBackAllDiscardedHouseCards23162a"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                houseCards: (
                  <>
                    {joinReactNodes(
                      returnedHouseCards.map((hc) => (
                        <b key={`roose_${hc.id}`}>{hc.name}</b>
                      )),
                      ", "
                    )}
                  </>
                )
              }}
            />
          </p>
        ) : (
          <p>
            <Trans
              i18nKey="gameLogList.rooseBoltonHouseHadNoDiscardedHouseCards43100d"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "loras-tyrell-attack-order-moved":
        const order = orders.get(data.order);
        const embattledRegion = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.lorasTyrellTheOrderWasMovedTofd0bf0"
              values={{
                orderType: translateGameText(order.type.name),
                embattledRegion: this.fogOfWar
                  ? t("common.hiddenRegion")
                  : embattledRegion.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );

      case "queen-of-thorns-no-order-available": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.queenOfThornsThereWereNoOrdersOfHouse4e18fa"
              values={{ affectedHouse: affectedHouse.name, house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "queen-of-thorns-order-removed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const region = this.world.regions.get(data.region);
        const removedOrder = orders.get(data.orderRemoved);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.queenOfThornsHouseRemovedAOrderOfHouse6be416"
              values={{
                house: house.name,
                removedOrderType: translateGameText(removedOrder.type.name),
                affectedHouse: affectedHouse.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "tywin-lannister-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.tywinLannisterHouseGained0f5915"
              values={{
                house: house.name,
                powerTokensGained: powerTokensGained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: powerTokensGained
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "qarl-the-maid-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.qarlTheMaidHouseGained4de6d3"
              values={{
                house: house.name,
                powerTokensGained: powerTokensGained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: powerTokensGained
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "renly-baratheon-no-knight-available": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.renlyBaratheonHouseHadNoAvailableKnightToUpgrade5783e9"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "renly-baratheon-no-footman-available": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.renlyBaratheonHouseHadNoAvailableFootmanToUpgradea3d2e4"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "renly-baratheon-footman-upgraded-to-knight": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.renlyBaratheonHouseUpgradedAFootmanToAKnight56890b"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "mace-tyrell-casualties-prevented": {
        return (
          <p>
            <Trans
              i18nKey="gameLogList.maceTyrellCasualtiesWerePreventedByTheBlackfish09f5e5"
              components={{ bold: <b />, bold2: <b /> }}
            />
          </p>
        );
      }
      case "mace-tyrell-no-footman-available":
        const houseCardName = data.houseCard
          ? this.allHouseCards.get(data.houseCard).name
          : "Mace Tyrell";
        return (
          <p>
            <Trans
              i18nKey="gameLogList.noEnemyFootmanWasAvailableToBeDestroyed1dc586"
              values={{ houseCardName: houseCardName }}
              components={{ bold: <b /> }}
            />
          </p>
        );

      case "mace-tyrell-footman-killed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        const houseCardName = data.houseCard
          ? this.allHouseCards.get(data.houseCard).name
          : "Mace Tyrell";

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseDestroyedAnEnemyFootmanIn3f96f8"
              values={{
                houseCardName: houseCardName,
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "ser-ilyn-payne-footman-killed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.serIlynPayneHouseDestroyedAnEnemyFootmanIn08e07c"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "cersei-lannister-no-order-available":
        return (
          <p>
            <Trans
              i18nKey="gameLogList.cerseiLannisterThereWereNoOrderTokensToBed7061d"
              components={{ bold: <b /> }}
            />
          </p>
        );

      case "cersei-lannister-order-removed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const region = this.world.regions.get(data.region);
        const removedOrder = orders.get(data.order);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.cerseiLannisterHouseRemovedAOrderOfIne605fc"
              values={{
                house: house.name,
                removedOrderType: translateGameText(removedOrder.type.name),
                affectedHouse: affectedHouse.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "robb-stark-retreat-location-overriden": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseChoseTheRetreatLocationOfTheRetreatingArmy21bf7e"
              values={{
                houseCard: houseCard.name,
                house: house.name,
                affectedHouse: affectedHouse.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "retreat-region-chosen": {
        const house = this.game.houses.get(data.house);
        const regionFrom = this.game.world.regions.get(data.regionFrom);
        const regionTo = this.game.world.regions.get(data.regionTo);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseRetreatsFromToa1d19f"
              values={{
                house: house.name,
                regionFrom: this.fogOfWar
                  ? t("common.hiddenRegion")
                  : regionFrom.name,
                regionTo: this.fogOfWar
                  ? t("common.hiddenRegion")
                  : regionTo.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "retreat-failed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseWasNotAbleToRetreatc1de6a"
              values={{
                house: house.name,
                direction: data.isAttacker
                  ? t("gameLogList.to663ea1")
                  : t("gameLogList.from75857a"),
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "retreat-casualties-suffered": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map((ut) => unitTypes.get(ut).name);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseSufferedCasualtiesFromTheRetreatAndChoseThesebab2bd"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                joinReactNodes: (
                  <>
                    {joinReactNodes(
                      units.map((unitType, i) => (
                        <b key={`retreat-casualties-suffered_${unitType}_${i}`}>
                          {this.fogOfWar ? t("common.hiddenUnit") : unitType}
                        </b>
                      )),
                      ", "
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "enemy-port-taken": {
        const newController = this.game.houses.get(data.newController);
        const oldController = this.game.houses.get(data.oldController);
        const port = this.world.regions.get(data.port);
        if (this.fogOfWar) {
          return null;
        }
        return data.shipCount > 0 ? (
          <p>
            <Trans
              i18nKey="gameLogList.houseConvertedFromHouseIn21f41b"
              values={{
                newController: newController.name,
                shipCount: data.shipCount,
                ship: t("common.ship", { count: data.shipCount }),
                oldController: oldController.name,
                port: port.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        ) : (
          <p>
            <Trans
              i18nKey="gameLogList.houseDestroyedAllShipsIn0487d2"
              values={{
                newController: newController.name,
                oldController: oldController.name,
                port: port.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "ships-destroyed-by-empty-castle": {
        const house = this.game.houses.get(data.house);
        const port = this.game.world.regions.get(data.port);
        const castle = this.game.world.regions.get(data.castle);
        return !this.fogOfWar ? (
          <p>
            <Trans
              i18nKey="gameLogList.houseLostInBecauseIsEmptyNowa251d6"
              values={{
                house: house.name,
                shipCount: data.shipCount,
                shipLabel: t("common.ShipLabel", { count: data.shipCount }),
                port: port.name,
                castle: castle.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        ) : null;
      }
      case "silence-at-the-wall-executed":
        return (
          <p>
            <Trans
              i18nKey="gameLogList.silenceAtTheWallNothingHappened24542a"
              components={{ bold: <b /> }}
            />
          </p>
        );

      case "preemptive-raid-choice-done": {
        const house = this.game.houses.get(data.house);

        if (data.choice == 0) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.preemptiveRaidHouseChoseToDestroy2OfTheir160e51"
                values={{ house: house.name }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        } else {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.preemptiveRaidHouseChoseToReduce2PositionsOn6ca3c6"
                values={{ house: house.name }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        }
      }
      case "preemptive-raid-track-reduced": {
        const chooser = data.chooser
          ? this.game.houses.get(data.chooser)
          : null;
        const house = this.game.houses.get(data.house);
        const trackName = translateGameText(
          this.game.getNameInfluenceTrack(data.trackI)
        );

        if (chooser == null) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseWasReduced2PositionsOnTheTrack22057b"
                values={{ house: house.name, trackName: trackName }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        } else {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseChoseToReduceHouse2PositionsOnThec2c21d"
                values={{
                  chooser: chooser.name,
                  house: house.name,
                  trackName: trackName
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </p>
          );
        }
      }
      case "preemptive-raid-units-killed": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(
          ([rid, utids]) =>
            [
              this.world.regions.get(rid),
              utids.map((utid) => unitTypes.get(utid))
            ] as [Region, UnitType[]]
        );

        return (
          <p>
            <Trans
              i18nKey="gameLogList.house7da3b4"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                casualties: (
                  <>
                    {units.length > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.choseToDestroyceb5fc"
                          components={{
                            units: (
                              <>
                                {joinReactNodes(
                                  units.map(([region, unitTypes]) => (
                                    <span key={`preemptive_${region.id}`}>
                                      <Trans
                                        i18nKey="common.in"
                                        values={{
                                          region: this.fogOfWar
                                            ? t("common.hiddenRegion")
                                            : region.name
                                        }}
                                        components={{
                                          units: (
                                            <>
                                              {joinReactNodes(
                                                unitTypes.map((ut, i) => (
                                                  <b
                                                    key={`preemptive_${ut.id}_${i}`}
                                                  >
                                                    {this.fogOfWar
                                                      ? t("common.hiddenUnit")
                                                      : translateGameText(
                                                          ut.name
                                                        )}
                                                  </b>
                                                )),
                                                ", "
                                              )}
                                            </>
                                          ),
                                          bold: <b />
                                        }}
                                      />
                                    </span>
                                  )),
                                  t("gameLogList.ande3ee91")
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.hadNoUnitsToDestroy8607b5")}</>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "preemptive-raid-wildlings-attack": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.preemptiveRaidANewWildlingsAttackWithStrengthWas2b384f"
              values={{
                wildlingStrength: data.wildlingStrength,
                house: house.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "massing-on-the-milkwater-house-cards-back": {
        const house = this.game.houses.get(data.house);
        const houseCardsReturned = data.houseCardsReturned.map((hcid) =>
          this.allHouseCards.get(hcid)
        );

        return (
          <p>
            <Trans
              i18nKey="gameLogList.massingOnTheMilkwaterHousee84208"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                returnedCards: (
                  <>
                    {houseCardsReturned.length > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.tookBackf59df9"
                          components={{
                            houseCards: (
                              <>
                                {joinReactNodes(
                                  houseCardsReturned.map((hc) => (
                                    <b
                                      key={`massing-on-the-milkwater-cards-back_${hc.id}`}
                                    >
                                      {hc.name}
                                    </b>
                                  )),
                                  ", "
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {t(
                          "gameLogList.hadNoHouseCardsOnTheirDiscardPile607e7f"
                        )}
                      </>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "massing-on-the-milkwater-wildling-victory": {
        const lowestBidder = this.game.houses.get(data.lowestBidder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.massingOnTheMilkwaterHouseDiscardsAllHouseCards04a021"
              values={{ lowestBidder: lowestBidder.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "massing-on-the-milkwater-house-cards-removed": {
        const house = this.game.houses.get(data.house);
        const houseCardsUsed = data.houseCardsUsed.map((hcid) =>
          this.allHouseCards.get(hcid)
        );

        return houseCardsUsed.length > 0 ? (
          <p>
            <Trans
              i18nKey="gameLogList.houseDiscardeda5e7fc"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                houseCards: (
                  <>
                    {joinReactNodes(
                      houseCardsUsed.map((hc) => (
                        <b
                          key={`massing-on-the-milkwater-cards-removed_${hc.id}`}
                        >
                          {hc.name}
                        </b>
                      )),
                      ", "
                    )}
                  </>
                )
              }}
            />
          </p>
        ) : (
          <p>
            <Trans
              i18nKey="gameLogList.houseDidNotDiscardAHouseCard0da336"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "a-king-beyond-the-wall-highest-top-track": {
        const house = this.game.houses.get(data.house);
        const trackName = translateGameText(
          this.game.getNameInfluenceTrack(data.trackI)
        );

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aKingBeyondTheWallHouseChoseToMovea74b6a"
              values={{ house: house.name, trackName: trackName }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "a-king-beyond-the-wall-lowest-reduce-tracks":
        const lowestBidder = this.game.houses.get(data.lowestBidder);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aKingBeyondTheWallHouseWasMovedTob7d8c5"
              values={{ lowestBidder: lowestBidder.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );

      case "a-king-beyond-the-wall-house-reduce-track": {
        const house = this.game.houses.get(data.house);
        const trackName = translateGameText(
          this.game.getNameInfluenceTrack(data.trackI)
        );

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aKingBeyondTheWallHouseChoseToMovee4ac5c"
              values={{ house: house.name, trackName: trackName }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "mammoth-riders-destroy-units": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]) as [Region, UnitType[]][];

        return (
          <p>
            <Trans
              i18nKey="gameLogList.mammothRidersHouse38b193"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                casualties: (
                  <>
                    {units.length > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.choseToDestroyceb5fc"
                          components={{
                            units: (
                              <>
                                {joinReactNodes(
                                  units.map(([region, unitTypes]) => (
                                    <span key={`mammoth-riders_${region.id}`}>
                                      <Trans
                                        i18nKey="common.in"
                                        values={{
                                          region: this.fogOfWar
                                            ? t("common.hiddenRegion")
                                            : region.name
                                        }}
                                        components={{
                                          units: (
                                            <>
                                              {joinReactNodes(
                                                unitTypes.map((ut, i) => (
                                                  <b
                                                    key={`mammoth-riders_${ut.id}_${i}`}
                                                  >
                                                    {this.fogOfWar
                                                      ? t("common.hiddenUnit")
                                                      : translateGameText(
                                                          ut.name
                                                        )}
                                                  </b>
                                                )),
                                                ", "
                                              )}
                                            </>
                                          ),
                                          bold: <b />
                                        }}
                                      />
                                    </span>
                                  )),
                                  ", "
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.hadNoUnitsToDestroy8607b5")}</>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "mammoth-riders-return-card": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.mammothRidersHouseChoseToRegain71ffec"
              values={{ house: house.name, houseCard: houseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "the-horde-descends-highest-muster": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.theHordeDescendsHouseMayMusterForcesInAny87f42b"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "the-horde-descends-units-killed": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]) as [Region, UnitType[]][];

        return (
          <p>
            <Trans
              i18nKey="gameLogList.theHordeDescendsHouse909690"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                casualties: (
                  <>
                    {units.length > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.choseToDestroyceb5fc"
                          components={{
                            units: (
                              <>
                                {joinReactNodes(
                                  units.map(([region, unitTypes]) => (
                                    <span
                                      key={`the-horde-descends_${region.id}`}
                                    >
                                      <Trans
                                        i18nKey="common.in"
                                        values={{
                                          region: this.fogOfWar
                                            ? t("common.hiddenRegion")
                                            : region.name
                                        }}
                                        components={{
                                          units: (
                                            <>
                                              {joinReactNodes(
                                                unitTypes.map((ut, i) => (
                                                  <b
                                                    key={`the-horde-descends_${ut.id}_${i}`}
                                                  >
                                                    {this.fogOfWar
                                                      ? t("common.hiddenUnit")
                                                      : translateGameText(
                                                          ut.name
                                                        )}
                                                  </b>
                                                )),
                                                ", "
                                              )}
                                            </>
                                          ),
                                          bold: <b />
                                        }}
                                      />
                                    </span>
                                  )),
                                  ", "
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.hadNoUnitsToDestroy8607b5")}</>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "crow-killers-knights-replaced": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]) as [Region, UnitType[]][];

        return (
          <p>
            {units.length > 0 ? (
              <>
                <Trans
                  i18nKey="gameLogList.crowKillersHouseReplacedWithFootmene0239a"
                  values={{ house: house.name }}
                  components={{
                    bold: <b />,
                    bold2: <b />,
                    units: (
                      <>
                        {joinReactNodes(
                          units.map(([region, unitTypes], i) => (
                            <span key={`crow-killers-replace_${i}`}>
                              <Trans
                                i18nKey="gameLogList.in08e815"
                                values={{
                                  unitTypesCount: unitTypes.length,
                                  knightLabel: t("common.KnightLabel", {
                                    count: unitTypes.length
                                  }),
                                  region: this.fogOfWar
                                    ? t("common.hiddenRegion")
                                    : region.name
                                }}
                                components={{
                                  bold: <b />,
                                  bold2: <b />
                                }}
                              />
                            </span>
                          )),
                          ", "
                        )}
                      </>
                    )
                  }}
                />
              </>
            ) : (
              <>
                <Trans
                  i18nKey="gameLogList.crowKillersHouseHadNoKnightsToReplaceWithc7e161"
                  values={{ house: house.name }}
                  components={{
                    bold: <b />,
                    bold2: <b />
                  }}
                />
              </>
            )}
          </p>
        );
      }
      case "crow-killers-knights-killed": {
        const house = this.game.houses.get(data.house);
        const units: [Region, UnitType[]][] = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.crowKillersHouseHadToDestroy30fd1c"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                units: (
                  <>
                    {joinReactNodes(
                      units.map(([region, unitTypes], i) => (
                        <span key={`crow-killers-kill_${i}`}>
                          <Trans
                            i18nKey="gameLogList.in08e815"
                            values={{
                              unitTypesCount: unitTypes.length,
                              knightLabel: t("common.KnightLabel", {
                                count: unitTypes.length
                              }),
                              region: this.fogOfWar
                                ? t("common.hiddenRegion")
                                : region.name
                            }}
                            components={{
                              bold: <b />,
                              bold2: <b />
                            }}
                          />
                        </span>
                      )),
                      ", "
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }

      case "crow-killers-footman-upgraded": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]) as [Region, UnitType[]][];

        return units.length > 0 ? (
          <p>
            <Trans
              i18nKey="gameLogList.crowKillersHouseReplacedWithKnights546e5c"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                units: (
                  <>
                    {joinReactNodes(
                      units.map(([region, unitTypes], i) => (
                        <span key={`crow-killers-upgrade_${i}`}>
                          <Trans
                            i18nKey="gameLogList.footmenInRegion"
                            values={{
                              unitTypesCount: unitTypes.length,
                              footmen: t("common.footmen", {
                                count: unitTypes.length
                              }),
                              region: this.fogOfWar
                                ? t("common.hiddenRegion")
                                : region.name
                            }}
                            components={{
                              bold: <b />,
                              bold2: <b />
                            }}
                          />
                        </span>
                      )),
                      ", "
                    )}
                  </>
                )
              }}
            />
          </p>
        ) : (
          <p>
            <Trans
              i18nKey="gameLogList.crowKillersHouseWasNotAbleToReplaceAny4d6046"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "skinchanger-scout-nights-watch-victory": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.skinchangerScoutHouseGetsBack1a8b48"
              values={{
                house: house.name,
                powerToken: data.powerToken,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerToken
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "skinchanger-scout-wildling-victory": {
        const house = this.game.houses.get(data.house);
        const powerTokensLost = data.powerTokensLost.map(
          ([hid, amount]) =>
            [this.game.houses.get(hid), amount] as [House, number]
        );

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.skinchangerScoutHouseLostAllOfTheirPowerTokens179555"
                values={{ house: house.name }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
            <ul>
              {powerTokensLost.map(([house, amount]) => (
                <li key={`skinchanger-scout_${house.id}_${amount}`}>
                  <Trans
                    i18nKey="gameLogList.houseLost1db272"
                    values={{
                      house: house.name,
                      powerTokens: amount,
                      powerTokenLabel: t("common.PowertokenLabel", {
                        count: amount
                      })
                    }}
                    components={{
                      bold: <b />,
                      bold2: <b />
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        );
      }
      case "rattleshirts-raiders-nights-watch-victory":
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.rattleshirtSRaidersHouseGainedOneLevelOfSupply13e8f2"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                supplyChange: (
                  <>
                    {!this.fogOfWar && (
                      <>
                        <Trans
                          i18nKey="gameLogList.andIsNowAt7e33eb"
                          values={{ newSupply: data.newSupply }}
                          components={{
                            bold: <b />
                          }}
                        />
                      </>
                    )}
                  </>
                )
              }}
            />
          </p>
        );

      case "rattleshirts-raiders-wildling-victory": {
        const lowestBidder = this.game.houses.get(data.lowestBidder);
        const newSupply = data.newSupply.map(
          ([hid, supply]) =>
            [this.game.houses.get(hid), supply] as [House, number]
        );

        return (
          <>
            <Trans
              i18nKey="gameLogList.rattleshirtSRaidersHouseLost2LevelsOfSupply165ee5"
              values={{ lowestBidder: lowestBidder.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                newSupply: (
                  <>
                    {!this.fogOfWar && (
                      <ul>
                        {newSupply.map(([house, supply]) => (
                          <li
                            key={`rattleshirts-raiders_${house.id}_${supply}`}
                          >
                            <Trans
                              i18nKey="gameLogList.houseIsNowAt43fd2c"
                              values={{ house: house.name, supply: supply }}
                              components={{
                                bold: <b />,
                                bold2: <b />
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )
              }}
            />
          </>
        );
      }
      case "game-of-thrones-power-tokens-gained":
        const gains = data.gains.map(
          ([hid, gain]) => [this.game.houses.get(hid), gain] as [House, number]
        );

        return (
          <ul>
            {gains.map(([house, gain]) => (
              <li key={`got_${house.id}_${gain}`}>
                <Trans
                  i18nKey="gameLogList.houseGained807d9e"
                  values={{
                    house: house.name,
                    gain: gain,
                    powerTokenLabel: t("common.PowertokenLabel", {
                      count: gain
                    })
                  }}
                  components={{
                    bold: <b />,
                    bold2: <b />
                  }}
                />
              </li>
            ))}
          </ul>
        );
      case "immediatly-killed-after-combat": {
        const house = this.game.houses.get(data.house);
        const killedBecauseWounded = data.killedBecauseWounded.map(
          (utid) => unitTypes.get(utid).name
        );
        const killedBecauseCantRetreat = data.killedBecauseCantRetreat.map(
          (utid) => unitTypes.get(utid).name
        );
        return (
          <p>
            {killedBecauseWounded.length > 0 && (
              <>
                <Trans
                  i18nKey="gameLogList.houseSufferedBattleCasualtiesBecauseTheseUnitsWereWounded47a38d"
                  values={{ house: house.name }}
                  components={{
                    bold: <b />,
                    joinReactNodes: (
                      <>
                        {joinReactNodes(
                          killedBecauseWounded.map((unitType, i) => (
                            <b key={`wounded_${unitType}_${i}`}>
                              {this.fogOfWar
                                ? t("common.hiddenUnit")
                                : unitType}
                            </b>
                          )),
                          ", "
                        )}
                      </>
                    )
                  }}
                />
              </>
            )}
            {killedBecauseWounded.length > 0 &&
              killedBecauseCantRetreat.length > 0 && <br />}
            {killedBecauseCantRetreat.length > 0 && (
              <>
                <Trans
                  i18nKey="gameLogList.houseSufferedBattleCasualtiesBecauseTheseUnitsCanT01eec9"
                  values={{ house: house.name }}
                  components={{
                    bold: <b />,
                    joinReactNodes: (
                      <>
                        {joinReactNodes(
                          killedBecauseCantRetreat.map((unitType, i) => (
                            <b key={`cant-retreat_${unitType}_${i}`}>
                              {this.fogOfWar
                                ? t("common.hiddenUnit")
                                : unitType}
                            </b>
                          )),
                          ", "
                        )}
                      </>
                    )
                  }}
                />
              </>
            )}
          </p>
        );
      }
      case "killed-after-combat": {
        const house = this.game.houses.get(data.house);
        const killed = data.killed.map((utid) => unitTypes.get(utid).name);
        return killed.length > 0 ? (
          <>
            <Trans
              i18nKey="gameLogList.houseSufferedBattleCasualtiesAndChoseTheseUnitsTocadc32"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                joinReactNodes: (
                  <>
                    {joinReactNodes(
                      killed.map((unitType, i) => (
                        <b key={`casualties_${unitType}_${i}`}>
                          {this.fogOfWar ? t("common.hiddenUnit") : unitType}
                        </b>
                      )),
                      ", "
                    )}
                  </>
                )
              }}
            />
          </>
        ) : (
          <></>
        );
      }
      case "supply-adjusted":
        const supplies: [House, number][] = data.supplies.map(
          ([hid, supply]) => [this.game.houses.get(hid), supply]
        );

        return (
          <>
            <p>{t("gameLogList.supplyLevelsHaveBeenAdjusted34f851")}</p>
            <div className="mt-1">
              <HouseNumberResultsComponent
                results={supplies}
                keyPrefix="supply"
              />
            </div>
          </>
        );
      case "player-replaced": {
        const oldUser = this.ingame.entireGame.users.get(data.oldUser);
        const newUser = data.newUser
          ? this.ingame.entireGame.users.get(data.newUser)
          : null;
        const house = this.game.houses.get(data.house);
        const newCommanderHouse = data.newCommanderHouse
          ? this.game.houses.get(data.newCommanderHouse)
          : null;
        const newUserLabel = newUser ? getUserLinkOrLabel(newUser) : null;
        const reason =
          data.reason == ReplacementReason.CLOCK_TIMEOUT
            ? t("gameLogList.dueToClockTimeout400aca")
            : data.reason == ReplacementReason.VOTE
              ? t("gameLogList.dueToVote0578f7")
              : "";

        return (
          <>
            <Trans
              i18nKey="gameLogList.wasReplacedBy59fdbc"
              values={{ reason: reason }}
              components={{
                bold: <b />,
                oldUser: <>{getUserLinkOrLabel(oldUser)}</>,
                house: <>{this.renderHouseName(house)}</>,
                replacement: (
                  <>
                    {newUserLabel ? (
                      <b>{newUserLabel}</b>
                    ) : (
                      t("gameLogList.aVassal4df4bb")
                    )}
                  </>
                ),
                lineBreak: <br />,
                commanderAssignment: (
                  <>
                    {newCommanderHouse && (
                      <>
                        <Trans
                          i18nKey="gameLogList.untilTheNextVassalClaimPhaseHasBeenRandomly726c26"
                          components={{
                            house: <>{this.renderHouseName(house)}</>,
                            newCommanderHouse: (
                              <>{this.renderHouseName(newCommanderHouse)}</>
                            )
                          }}
                        />
                      </>
                    )}
                  </>
                )
              }}
            />
          </>
        );
      }
      case "vassal-replaced": {
        const user = this.ingame.entireGame.users.get(data.user);
        const house = this.game.houses.get(data.house);

        return (
          <>
            <Trans
              i18nKey="gameLogList.vassalHouseWasReplacedBy5114c9"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                user: <>{getUserLinkOrLabel(user)}</>
              }}
            />
          </>
        );
      }
      case "vassals-claimed": {
        const vassals = data.vassals.map((hid) => this.game.houses.get(hid));
        const house = this.game.houses.get(data.house);

        return (
          <p>
            {vassals.length > 0 ? (
              <>
                <Trans
                  i18nKey="gameLogList.houseClaimedAsf53a3c"
                  values={{
                    house: house.name,
                    vassal: t("common.vassal", { count: vassals.length })
                  }}
                  components={{
                    bold: <b />,
                    vassals: (
                      <>
                        {joinReactNodes(
                          vassals.map((v) => (
                            <b key={`vassals-claimed_${v.id}`}>{v.name}</b>
                          )),
                          ", "
                        )}
                      </>
                    )
                  }}
                />
              </>
            ) : (
              <>
                <Trans
                  i18nKey="gameLogList.houseHasDeclinedToCommandAVassalAndHas92f4f9"
                  values={{ house: house.name }}
                  components={{ bold: <b /> }}
                />
              </>
            )}
          </p>
        );
      }
      case "commander-power-token-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.commandingHouseGainedAPowerTokenForThisBattlea82893"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "beric-dondarrion-used": {
        const house = this.game.houses.get(data.house);
        const casualty = unitTypes.get(data.casualty).name;
        return (
          <p>
            <Trans
              i18nKey="gameLogList.bericDondarrionHouseChoseAToBeDestroyedd352cd"
              values={{ house: house.name, casualty: casualty }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "varys-used": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.varysHouseIsNowOnTopOfTheFiefdomsed837a"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "jaqen-h-ghar-house-card-replaced": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const newHouseCard = this.allHouseCards.get(data.newHouseCard);
        const usedByHouseCard = this.allHouseCards.get(data.usedById);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseRandomlyChoseAsSNewHouseCard084ea8"
              values={{
                usedByHouseCard: usedByHouseCard.name,
                house: house.name,
                newHouseCard: newHouseCard.name,
                affectedHouse: affectedHouse.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "jon-connington-used": {
        const house = this.game.houses.get(data.house);
        const region = this.game.world.regions.get(data.region);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.jonConningtionHouseChoseToRecruitAKnightInc30e86"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "bronn-used": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.bronnHouseChoseToDiscard2PowerTokensTofa5a24"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "littlefinger-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.littlefingerHouseGainede21782"
              values={{
                house: house.name,
                powerTokens: data.powerTokens,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokens
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "alayne-stone-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.alayneStoneHouseForcedHouseToDiscardAllTheir8b8c1c"
              values={{
                house: house.name,
                affectedHouse: affectedHouse.name,
                lostPowerTokens: data.lostPowerTokens,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.lostPowerTokens
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "lysa-arryn-ffc-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.lysaArrynHouseGainedcf9450"
              values={{
                house: house.name,
                powerTokens: data.powerTokens,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokens
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "anya-waynwood-power-tokens-gained": {
        const gains = data.gains.map(
          ([hid, gain]) => [this.game.houses.get(hid), gain] as [House, number]
        );

        return (
          <>
            <p>
              <b>{"Anya Waynwood"}</b>:
            </p>
            <ul>
              {gains.map(([house, gain]) => (
                <li key={`anya-waynwood_${house.id}_${gain}`}>
                  <Trans
                    i18nKey="common.houseGained"
                    values={{
                      house: house.name,
                      gain: gain,
                      powerTokenLabel: t("common.PowertokenLabel", {
                        count: gain
                      })
                    }}
                    components={{
                      bold: <b />,
                      bold2: <b />
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        );
      }
      case "robert-arryn-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const removedHouseCard = data.removedHouseCard
          ? this.allHouseCards.get(data.removedHouseCard)
          : null;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.robertArrynHouseDecidedToRemoveRobertArrynFroma9e329"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                removedHouseCard: (
                  <>
                    {removedHouseCard && (
                      <>
                        <Trans
                          i18nKey="gameLogList.andOfeaaeb2"
                          values={{
                            removedHouseCard: removedHouseCard.name,
                            affectedHouse: affectedHouse.name
                          }}
                          components={{
                            bold: <b />,
                            bold2: <b />
                          }}
                        />
                      </>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "house-card-removed-from-game": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.ofHouseWasRemovedFromTheGame4c6263"
              values={{ houseCard: houseCard.name, house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "viserys-targaryen-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.viserysTargaryenHouseDecidedToAddTheStrengthFromb7e503"
              values={{
                house: house.name,
                houseCardCombatStrength: houseCard.combatStrength,
                houseCard: houseCard.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "illyrio-mopatis-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.illyrioMopatisHouseGainedcd40b2"
              values={{
                house: house.name,
                powerTokensGained: powerTokensGained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: powerTokensGained
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "daenerys-targaryen-b-power-tokens-discarded": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.daenerysTargaryenHouseForcedHouseToDiscard2cc485"
              values={{
                house: house.name,
                affectedHouse: affectedHouse.name,
                powerTokensDiscarded: data.powerTokensDiscarded,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokensDiscarded
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "missandei-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.missandeiHouseDecidedToReturnToHand30c5b5"
              values={{ house: house.name, houseCard: houseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "power-tokens-gifted": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <Row className="align-items-center">
            <Col xs="auto">
              <img src={presentImage} width="32px" />
            </Col>
            <Col>
              <Trans
                i18nKey="gameLogList.houseGiftedToHouse164679"
                values={{
                  house: house.name,
                  powerTokens: data.powerTokens,
                  powerTokenLabel: t("common.PowertokenLabel", {
                    count: data.powerTokens
                  }),
                  affectedHouse: affectedHouse.name
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </Col>
          </Row>
        );
      }
      case "influence-track-position-chosen": {
        const house = this.game.houses.get(data.house);
        const track = translateGameText(
          this.game.getNameInfluenceTrack(data.trackerI)
        );
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHasChosenPositionOnTracka3f071"
              values={{
                house: house.name,
                position: data.position,
                track: track
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "ties-decided": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHasDecidedTies2391ce"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "place-loyalty-choice": {
        const house = this.game.houses.get(data.house);
        const verb =
          data.discardedPowerTokens == 0
            ? t("common.placeNoLoyaltyToken")
            : data.discardedPowerTokens == 1
              ? t("common.placeLoyaltyToken", { count: data.loyaltyTokenCount })
              : null;
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseDecidedToDiscarda65997"
              values={{
                house: house.name,
                discardedPowerTokens: data.discardedPowerTokens,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.discardedPowerTokens
                }),
                additionalAction:
                  verb && t("gameLogList.and49ff7b", { verb: verb })
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "loyalty-token-placed": {
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.aLoyaltyTokenHasBeenPlacedIn55a185"
              values={{
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );
      }
      case "loyalty-token-gained": {
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseGainedIna2c74a"
              values={{
                targaryen: this.game.targaryen?.name ?? "Targaryen",
                tokenCount: data.count,
                loyaltyTokenLabel: t("common.LoyaltytokenLabel", {
                  count: data.count
                }),
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "fire-made-flesh-choice": {
        const house = this.game.houses.get(data.house);

        if (data.ignored) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.fireMadeFleshHouseDecidedToDoNothing9f7fd9"
                values={{ house: house.name }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        } else if (data.dragonKilledInRegion) {
          const region = this.world.regions.get(data.dragonKilledInRegion);
          return (
            <p>
              <Trans
                i18nKey="gameLogList.fireMadeFleshHouseDecidedToDestroyADragonf09320"
                values={{
                  house: house.name,
                  region: this.fogOfWar ? t("common.hiddenRegion") : region.name
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </p>
          );
        } else if (data.removedDragonStrengthToken) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.fireMadeFleshHouseDecidedToRemoveTheDragon7e6d26"
                values={{
                  house: house.name,
                  removedDragonStrengthToken: data.removedDragonStrengthToken
                }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        } else if (data.regainedDragonRegion) {
          const region = this.world.regions.get(data.regainedDragonRegion);
          return (
            <p>
              <Trans
                i18nKey="gameLogList.fireMadeFleshHouseDecidedToPlaceADragonef2593"
                values={{
                  house: house.name,
                  region: this.fogOfWar ? t("common.hiddenRegion") : region.name
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </p>
          );
        } else {
          return <></>;
        }
      }
      case "playing-with-fire-choice": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        const unitType = unitTypes.get(data.unitType);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.playingWithFireHouseChoseToPlaceAIn9ac2d9"
              values={{
                house: house.name,
                unitType: this.fogOfWar
                  ? t("common.hiddenUnit")
                  : translateGameText(unitType.name),
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "the-long-plan-choice": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.theLongPlanHouseChoseHouseToPlace281faf1"
              values={{ house: house.name, affectedHouse: affectedHouse.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "move-loyalty-token-choice": {
        const house = this.game.houses.get(data.house);

        if (data.powerTokensDiscardedToCancelMovement == 0) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseChoseNotToCancelThePreviousMovement0b771b"
                values={{ house: house.name }}
                components={{ bold: <b /> }}
              />
            </p>
          );
        } else if (
          data.powerTokensDiscardedToCancelMovement &&
          data.powerTokensDiscardedToCancelMovement > 0
        ) {
          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseDiscardedToCancelThePreviousMovementab47e0"
                values={{
                  house: house.name,
                  powerTokens: data.powerTokensDiscardedToCancelMovement,
                  powerTokenLabel: t("common.PowertokenLabel", {
                    count: data.powerTokensDiscardedToCancelMovement
                  })
                }}
                components={{
                  bold: <b />,
                  bold2: <b />
                }}
              />
            </p>
          );
        } else if (data.regionFrom && data.regionTo) {
          const regionFrom = this.world.regions.get(data.regionFrom);
          const regionTo = this.world.regions.get(data.regionTo);

          return (
            <p>
              <Trans
                i18nKey="gameLogList.houseMovedALoyaltyTokenFromToa7bfb7"
                values={{
                  house: house.name,
                  regionFrom: this.fogOfWar
                    ? t("common.hiddenRegion")
                    : regionFrom.name,
                  regionTo: this.fogOfWar
                    ? t("common.hiddenRegion")
                    : regionTo.name
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </p>
          );
        } else {
          return <></>;
        }
      }
      case "loan-purchased": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        const loan = loanCardTypes.get(data.loanType);

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.houseResolvedAnIronBankOrderInAndPaideec19e"
                values={{
                  house: house.name,
                  region: this.fogOfWar
                    ? t("common.hiddenRegion")
                    : region.name,
                  paid: data.paid,
                  powerTokenLabel: t("common.PowertokenLabel", {
                    count: data.paid
                  })
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />,
                  bold4: <b />
                }}
              />
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <LoanCardComponent loanCard={loan} />
            </div>
          </>
        );
      }
      case "order-removed": {
        const house = data.house ? this.game.houses.get(data.house) : null;
        const region = this.world.regions.get(data.region);
        const orderType = orderTypes.get(data.order);

        return house ? (
          <p>
            <Trans
              i18nKey="gameLogList.houseRemovedTheirOrderIn5e8d7e"
              values={{
                house: house.name,
                orderType: translateGameText(orderType.name),
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        ) : (
          <p>
            <Trans
              i18nKey="gameLogList.aOrderHasBeenRemovedFrom18490d"
              values={{
                orderType: translateGameText(orderType.name),
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "interest-paid": {
        const house = this.game.houses.get(data.house);
        const debt = data.cost + data.paid;
        return (
          <p>
            <Trans
              i18nKey="gameLogList.housePaidAnInterestOfToTheIronBank182461"
              values={{
                house: house.name,
                abs: Math.abs(data.paid),
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: Math.abs(data.paid)
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                unpaidDebt: (
                  <>
                    {debt > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.interestDebtCouldNotBePaidec5ed0"
                          values={{ debt: debt }}
                          components={{ bold: <b /> }}
                        />
                      </>
                    ) : (
                      ""
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "debt-paid": {
        const house = this.game.houses.get(data.house);
        const resolver = this.game.houses.get(data.resolver);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid))
        ]) as [Region, UnitType[]][];

        return (
          <p>
            <b>{t("gameLogList.debtsToTheIronBank6b9aef")}</b>:{" "}
            {units.length > 0 ? (
              <>
                <Trans
                  i18nKey="gameLogList.houseChoseToDestroyOfHouse6b6511"
                  values={{ resolver: resolver.name, house: house.name }}
                  components={{
                    bold: <b />,
                    units: (
                      <>
                        {joinReactNodes(
                          units.map(([region, unitTypes]) => (
                            <span key={`pay-debt_${region.id}_${house.id}`}>
                              <Trans
                                i18nKey="common.in"
                                values={{
                                  region: this.fogOfWar
                                    ? t("common.hiddenRegion")
                                    : region.name
                                }}
                                components={{
                                  units: (
                                    <>
                                      {joinReactNodes(
                                        unitTypes.map((ut, i) => (
                                          <b key={`pay-debt_${ut.id}_${i}`}>
                                            {this.fogOfWar
                                              ? t("common.hiddenUnit")
                                              : translateGameText(ut.name)}
                                          </b>
                                        )),
                                        ", "
                                      )}
                                    </>
                                  ),
                                  bold: <b />
                                }}
                              />
                            </span>
                          )),
                          ", "
                        )}
                      </>
                    ),
                    bold2: <b />
                  }}
                />
              </>
            ) : (
              <>
                <Trans
                  i18nKey="gameLogList.houseHadNoUnitsToDestroy013560"
                  values={{ house: house.name }}
                  components={{ bold: <b /> }}
                />
              </>
            )}
          </p>
        );
      }
      case "customs-officer-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.customsOfficerHouseGained8355bf"
              values={{
                house: house.name,
                gained: data.gained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.gained
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "sellswords-placed": {
        const house = this.game.houses.get(data.house);
        const placedSellswords = data.units.map(
          ([regionId, units]) =>
            [
              this.world.regions.get(regionId),
              units.map((ut) => unitTypes.get(ut))
            ] as [Region, UnitType[]]
        );
        const loan = loanCardTypes.get(data.loanType);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.house310c67"
              values={{ loan: loan.name, house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                placement: (
                  <>
                    {placedSellswords.length > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.choseToPlaceedcee6"
                          components={{
                            units: (
                              <>
                                {joinReactNodes(
                                  placedSellswords.map(
                                    ([region, unitTypes]) => (
                                      <span
                                        key={`place-sellsword_${region.id}`}
                                      >
                                        <Trans
                                          i18nKey="common.in"
                                          values={{
                                            region: this.fogOfWar
                                              ? t("common.hiddenRegion")
                                              : region.name
                                          }}
                                          components={{
                                            units: (
                                              <>
                                                {joinReactNodes(
                                                  unitTypes.map((ut, i) => (
                                                    <b
                                                      key={`place-sellsword_${region.id}_${ut.id}_${i}`}
                                                    >
                                                      {this.fogOfWar
                                                        ? t("common.hiddenUnit")
                                                        : translateGameText(
                                                            ut.name
                                                          )}
                                                    </b>
                                                  )),
                                                  ", "
                                                )}
                                              </>
                                            ),
                                            bold: <b />
                                          }}
                                        />
                                      </span>
                                    )
                                  ),
                                  t("gameLogList.ande3ee91")
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.placedNoSellswordsa37a7f")}</>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "the-faceless-men-units-destroyed": {
        const house = this.game.houses.get(data.house);
        const destroyedUnits = data.units.map((unitInfo) => ({
          region: this.world.regions.get(unitInfo.regionId),
          house: unitInfo.houseId
            ? this.game.houses.get(unitInfo.houseId)
            : null,
          unitType: unitTypes.get(unitInfo.unitTypeId)
        }));
        return (
          <p>
            <Trans
              i18nKey="gameLogList.theFacelessMenHouseChose1a3134"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                casualties: (
                  <>
                    {destroyedUnits.length > 0 ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.toDestroy13c937"
                          components={{
                            units: (
                              <>
                                {joinReactNodes(
                                  destroyedUnits.map((unitInfo) => (
                                    <span
                                      key={`the-faceless-men_${unitInfo.region.id}_${unitInfo.unitType.id}`}
                                    >
                                      <Trans
                                        i18nKey="gameLogList.aOfIn8ddfd5"
                                        values={{
                                          unitType: this.fogOfWar
                                            ? t("common.hiddenUnit")
                                            : translateGameText(
                                                unitInfo.unitType.name
                                              ),
                                          house:
                                            unitInfo.house?.name ??
                                            t("common.unknown"),
                                          unitInfoRegion: unitInfo.region.name
                                        }}
                                        components={{
                                          bold: <b />,
                                          bold2: <b />,
                                          bold3: <b />
                                        }}
                                      />
                                    </span>
                                  )),
                                  t("gameLogList.ande3ee91")
                                )}
                              </>
                            )
                          }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.notToDestroyAnyUnits9a4c81")}</>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "pyromancer-executed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.pyromancerHouseChoseToDegradeAndPlaceAThere378dfe"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name,
                upgradeType: data.upgradeType
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "expert-artificer-executed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.expertArtificerHouseChoseToPlaceACrownInbe2a14"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name,
                gainedPowerTokens: data.gainedPowerTokens,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.gainedPowerTokens
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "loyal-maester-executed": {
        const house = this.game.houses.get(data.house);
        const regions = data.regions.map((rid) => this.world.regions.get(rid));
        return (
          <p>
            <Trans
              i18nKey="gameLogList.loyalMaesterHouseChoseToPlaceABarrelIn41a769"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                regions: (
                  <>
                    {joinReactNodes(
                      regions.map((r) => (
                        <b key={`loyal_maester_${r.id}`}>
                          {this.fogOfWar ? t("common.hiddenRegion") : r.name}
                        </b>
                      )),
                      t("gameLogList.andInf2d950")
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "master-at-arms-executed": {
        const house = this.game.houses.get(data.house);
        const regions = data.regions.map((rid) => this.world.regions.get(rid));
        return (
          <p>
            <Trans
              i18nKey="gameLogList.masterAtArmsHouseChoseToUpgradeTheCastlesdc6ab9"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                regions: (
                  <>
                    {joinReactNodes(
                      regions.map((r) => (
                        <b key={`master-at-arms_${r.id}`}>
                          {this.fogOfWar ? t("common.hiddenRegion") : r.name}
                        </b>
                      )),
                      t("gameLogList.andInf2d950")
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "savvy-steward-executed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.savvyStewardHouseChoseToPlaceABarrelIn130a30"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name,
                newSupply: data.newSupply
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "spymaster-executed": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.spymasterHouseChoseWesterosDeckAndPutOnTop9133c9"
              values={{
                house: house.name,
                deckNumber: data.westerosDeckI + 1,
                westerosCardsCountForTopOfDeck:
                  data.westerosCardsCountForTopOfDeck,
                card: t("common.card", {
                  count: data.westerosCardsCountForTopOfDeck
                }),
                westerosCardsCountForBottomOfDeck:
                  data.westerosCardsCountForBottomOfDeck,
                card2: t("common.card", {
                  count: data.westerosCardsCountForBottomOfDeck
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "objectives-chosen": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHasChosenTheir3Objectivesd246e6"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "new-objective-card-drawn": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseDrewANewObjectiveCard3e68aa"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "special-objective-scored": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.housec2c96c"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                objectiveResult: (
                  <>
                    {data.scored ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.scoredTheirSpecialObjectiveAndNowHasATotal936d92"
                          values={{ newTotal: data.newTotal }}
                          components={{
                            bold: <b />
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {t(
                          "gameLogList.didNotScoreTheirSpecialObjective9c0836"
                        )}
                      </>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "objective-scored": {
        const house = this.game.houses.get(data.house);
        const objective =
          data.objectiveCard != null
            ? objectiveCards.get(data.objectiveCard)
            : null;

        return objective != null ? (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.houseScoredAwardedAndNowHasATotalOf3fda08"
                values={{
                  house: house.name,
                  objective: objective.name,
                  victoryPoints: data.victoryPoints,
                  victorypoint: t("common.victorypoint", {
                    count: data.victoryPoints
                  }),
                  newTotal: data.newTotal
                }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />,
                  bold4: <b />
                }}
              />
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ObjectiveCardComponent objectiveCard={objective} size="small" />
            </div>
          </>
        ) : (
          <>
            <Trans
              i18nKey="gameLogList.houseDidNotScoreAnObjectiveCard35f40e"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </>
        );
      }
      case "ironborn-raid": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.ironbornRaidHouseWasReducedOnePositionOnThe498fd2"
              values={{ house: house.name, newTotal: data.newTotal }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "shifting-ambitions-objective-chosen-from-hand": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.shiftingAmbitionsHousePutOneObjectiveCardToThe875ea2"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "shifting-ambitions-objective-chosen-from-pool": {
        const house = this.game.houses.get(data.house);
        const objective = objectiveCards.get(data.objectiveCard);

        return (
          <>
            <p>
              <Trans
                i18nKey="gameLogList.shiftingAmbitionsHouseChooseFromTheObjectiveCardPool325467"
                values={{ house: house.name, objective: objective.name }}
                components={{
                  bold: <b />,
                  bold2: <b />,
                  bold3: <b />
                }}
              />
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ObjectiveCardComponent objectiveCard={objective} size="small" />
            </div>
          </>
        );
      }
      case "new-information-objective-card-chosen": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.newInformationHouseChoseOneObjectiveCardInTheirb164b6"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "reveal-all-objectives": {
        const objectivesOfHouses = data.objectivesOfHouses.map(
          ([hid, ocids]) =>
            [
              this.game.houses.get(hid),
              ocids.map((ocid) => objectiveCards.get(ocid))
            ] as [House, ObjectiveCard[]]
        );

        return objectivesOfHouses.map(([house, objectives]) => (
          <Col xs={12} key={`objectives-of-house_${house.id}`}>
            <Col xs={12} className="text-center">
              <Trans
                i18nKey="gameLogList.remainingObjectivesOfHouse2e37a9"
                values={{ house: house.name }}
                components={{ bold: <b /> }}
              />
            </Col>
            <Col xs="12">
              <Row className="justify-content-center">
                {objectives.map((oc) => (
                  <Col xs="auto" key={oc.id}>
                    <ObjectiveCardComponent objectiveCard={oc} size="small" />
                  </Col>
                ))}
              </Row>
            </Col>
          </Col>
        ));
      }
      case "garrison-removed": {
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aGarrisonTokenWithStrengthWasRemovedFrom360d59"
              values={{
                strength: data.strength,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "garrison-returned": {
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aGarrisonTokenWithStrengthWasReturnedTof4e7d5"
              values={{
                strength: data.strength,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "objective-deck-empty": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseWasNotAbleToDrawANewObjective6fae67"
              values={{ house: house.name }}
              components={{ bold: <b /> }}
            />
          </p>
        );
      }
      case "orders-revealed": {
        if (data.onlySnapshot) return null;
        return (
          <p id={`gamelog-orders-revealed-round-${currentRound}`}>
            {t("gameLogList.ordersWereRevealedd851f4")}
          </p>
        );
      }
      case "house-cards-returned": {
        const house = this.game.houses.get(data.house);
        const returnedHouseCards = data.houseCards.map((hcid) =>
          this.allHouseCards.get(hcid)
        );
        const houseCardDiscarded = data.houseCardDiscarded
          ? this.allHouseCards.get(data.houseCardDiscarded)
          : null;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseTookBackTheirDiscardedHouseCards270e75"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                houseCards: (
                  <>
                    {joinReactNodes(
                      returnedHouseCards.map((hc) => (
                        <b key={`house-cards-returned_${hc.id}`}>{hc.name}</b>
                      )),
                      ", "
                    )}
                  </>
                ),
                houseCardDiscarded: (
                  <>
                    {houseCardDiscarded ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.wasPlayedAsTheLastCardAndRemainsDiscardedcc9c65"
                          values={{
                            houseCardDiscarded: houseCardDiscarded.name
                          }}
                          components={{
                            lineBreak: <br />,
                            bold: <b />
                          }}
                        />
                      </>
                    ) : (
                      <></>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "balon-greyjoy-asos-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.balonGreyjoyHouseGained60619d"
              values={{
                house: house.name,
                powerTokensGained: powerTokensGained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: powerTokensGained
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "mace-tyrell-asos-order-placed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        const order = orders.get(data.order);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.maceTyrellHouseDecidedToPlaceAOrderIn93df50"
              values={{
                house: house.name,
                orderType: translateGameText(order.type.name),
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "bran-stark-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.branStarkHouseDecidedToReturnToHandc63983"
              values={{ house: house.name, houseCard: houseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "cersei-lannister-asos-power-tokens-discarded": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.cerseiLannisterHouseForcedHouseToDiscard44e4ce"
              values={{
                house: house.name,
                affectedHouse: affectedHouse.name,
                powerTokensDiscarded: data.powerTokensDiscarded,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokensDiscarded
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "doran-martell-asos-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.doranMartellHouseMovedHouseToTheBottomOfe8d26f"
              values={{ house: house.name, affectedHouse: affectedHouse.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "melisandre-of-asshai-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.melisandreOfAsshaiHouseGainedaab782"
              values={{
                house: house.name,
                powerTokens: data.powerTokens,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokens
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "salladhar-saan-asos-power-tokens-changed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.salladharSaanHouseGainedHouseLost1f8855"
              values={{
                house: house.name,
                powerTokensGained: data.powerTokensGained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokensGained
                }),
                affectedHouse: affectedHouse.name,
                powerTokensLost: data.powerTokensLost,
                lostTokenLabel: t("common.PowertokenLabel", {
                  count: data.powerTokensLost
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "ser-davos-seaworth-asos-fortification-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.serDavosSeaworthHouseHasSpent2PowerTokens3e2569"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "casualties-prevented": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.preventedCasualtiesOfHouse71958a"
              values={{ houseCard: houseCard.name, house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "ser-ilyn-payne-asos-casualty-suffered": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const unitType = unitTypes.get(data.unit);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.serIlynPayneHouseForcedHouseToLoseA1f792c"
              values={{
                house: house.name,
                affectedHouse: affectedHouse.name,
                affectedHouse2: affectedHouse.name,
                unitType: this.fogOfWar
                  ? t("common.hiddenUnit")
                  : translateGameText(unitType.name)
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "dominance-token-stolen": {
        const oldHolder = this.game.houses.get(data.oldHolder);
        const newHolder = this.game.houses.get(data.newHolder);
        const dominanceToken =
          data.dominanceToken == "iron-throne"
            ? t("common.ironThrone")
            : data.dominanceToken == "valyrian-steel-blade"
              ? t("gameLogList.valyrianSteelBladef2fa0f")
              : data.dominanceToken == "raven"
                ? t("gameLogList.raven9cccdb")
                : t("common.unknown");

        const houseCardName = this.allHouseCards.get(data.houseCardId).name;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseHasStolenTheDominanceTokenFromHouse1d720f"
              values={{
                houseCardName: houseCardName,
                newHolder: newHolder.name,
                dominanceToken: dominanceToken,
                oldHolder: oldHolder.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "aeron-damphair-house-card-changed": {
        const house = this.game.houses.get(data.house);
        const newHouseCard = this.allHouseCards.get(data.newHouseCard);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aeronDamphairHouseChoseToDiscard2PowerTokensa6014a"
              values={{ house: house.name, newHouseCard: newHouseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                combatPenalty: (
                  <>
                    {data.reducedCombatStrength ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.atTheCostOf1CombatStrength065d72"
                          components={{ bold: <b /> }}
                        />
                      </>
                    ) : (
                      ""
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
      case "control-power-token-removed": {
        const region = this.world.regions.get(data.regionId);
        const house = this.game.houses.get(data.houseId);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.aPowerTokenOfHouseWasRemovedFromfacd8d"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "game-paused": {
        return <p>{t("gameLogList.theGameWasPausedByVote5b0f00")}</p>;
      }
      case "empowered-vassals-enabled":
        return <p>{t("gameLogList.empoweredVassalsEnabled")}</p>;
      case "game-resumed": {
        return (
          <p>
            <Trans
              i18nKey="gameLogList.theGameWasPauseTime7a639e"
              values={{
                resumeMethod: data.autoResumed
                  ? t("gameLogList.automaticallyResumed7b44b1")
                  : t("gameLogList.resumedByVote693194"),
                pauseDuration: secondsToString(data.pauseTimeInSeconds, true)
              }}
            />
          </p>
        );
      }
      case "support-attack-against-neutral-force": {
        const region = this.world.regions.get(data.region);
        const house = this.game.houses.get(data.house);
        const supporter = this.game.houses.get(data.supporter);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.houseToAttackTheNeutralForceIn4368eb"
              values={{
                supporter: supporter.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                supportDecision: (
                  <>
                    {data.refused ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.refusedToGrantSupportToHouse9bbf39"
                          values={{ house: house.name }}
                          components={{
                            bold: <b />
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <Trans
                          i18nKey="gameLogList.wouldSupportHouse1d12f4"
                          values={{ house: house.name }}
                          components={{
                            bold: <b />
                          }}
                        />
                      </>
                    )}
                  </>
                ),
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "houses-swapped": {
        const initiator = this.ingame.entireGame.users.get(data.initiator);
        const swappingUser = this.ingame.entireGame.users.get(
          data.swappingUser
        );
        const initiatorHouse = this.game.houses.get(data.initiatorHouse);
        const swappingHouse = this.game.houses.get(data.swappingHouse);
        const newUserLabel = getUserLinkOrLabel(swappingUser);

        return (
          <>
            <Trans
              i18nKey="gameLogList.houseSwappedHousesWithHouse62115d"
              values={{
                initiatorHouse: initiatorHouse.name,
                swappingHouse: swappingHouse.name
              }}
              components={{
                bold: <b />,
                initiator: <>{getUserLinkOrLabel(initiator)}</>,
                bold2: <b />,
                newUser: <>{<b>{newUserLabel}</b>}</>,
                bold3: <b />
              }}
            />
          </>
        );
      }
      case "westeros-deck-4-skipped": {
        const westerosCardType = data.westerosCardType
          ? westerosCardTypes.get(data.westerosCardType)
          : null;
        return (
          <>
            <Trans
              i18nKey="gameLogList.theExecutionOfWasSkippedBecauseHouseTargaryenIsc08889"
              values={{ reason: data.reason }}
              components={{
                westerosCardType: (
                  <>
                    {westerosCardType ? (
                      <>
                        <Trans
                          i18nKey="gameLogList.theWesterosCard971bba"
                          values={{ westerosCardType: westerosCardType.name }}
                          components={{
                            bold: <b />
                          }}
                        />
                      </>
                    ) : (
                      <>{t("gameLogList.westerosDeck4417a01")}</>
                    )}
                  </>
                ),
                bold: <b />,
                bold2: <b />
              }}
            />
          </>
        );
      }
      case "no-loyalty-token-available": {
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.thereWasNoFurtherLoyaltyTokenAvailableThatCouldf90e93"
              values={{
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />
              }}
            />
          </p>
        );
      }
      case "last-land-unit-transformed-to-dragon": {
        const house = this.game.houses.get(data.house);
        const unitType = unitTypes.get(data.transformedUnitType);
        const region = this.world.regions.get(data.region);

        return (
          <>
            <Trans
              i18nKey="gameLogList.dragonRevengeTheLastOfHouseHasBeenTransformed2ec9ee"
              values={{
                unitType: this.fogOfWar
                  ? t("common.hiddenUnit")
                  : translateGameText(unitType.name),
                house: house.name,
                region: region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </>
        );
      }
      case "live-pbem-switch": {
        return (
          <p>
            <h5 className="text-center">
              {t("gameLogList.gameTypeHasBeenChanged5fa74c")}
            </h5>
            <div className="text-center">
              <Trans
                i18nKey="gameLogList.itIsNow54f8d3"
                values={{
                  gameType: data.isNowPbem ? "PBEM" : t("common.live")
                }}
                components={{
                  bold: <b />
                }}
              />
            </div>
          </p>
        );
        break;
      }
      case "jamie-lannister-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <Trans
              i18nKey="gameLogList.jamieLannisterHouseGained6e7084"
              values={{
                house: house.name,
                powerTokensGained: powerTokensGained,
                powerTokenLabel: t("common.PowertokenLabel", {
                  count: powerTokensGained
                })
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "maester-luwin-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.maesterLuwinHouseDecidedToReturnToHand24b07b"
              values={{ house: house.name, houseCard: houseCard.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "melisandre-of-asshai-1st-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <Trans
              i18nKey="gameLogList.melisandreOfAsshaiHouseSpent1PowerTokenTo262cdb"
              values={{
                house: house.name,
                houseCard: houseCard.name,
                affectedHouse: affectedHouse.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />
              }}
            />
          </p>
        );
      }
      case "asha-greyjoy-1st-no-order-available":
        return (
          <p>
            <Trans
              i18nKey="gameLogList.ashaGreyjoyThereWereNoOrderTokensToBeb22171"
              components={{ bold: <b /> }}
            />
          </p>
        );

      case "asha-greyjoy-1st-order-removed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const region = this.world.regions.get(data.region);
        const removedOrder = orders.get(data.order);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.ashaGreyjoyHouseRemovedAOrderOfInbabea0"
              values={{
                house: house.name,
                removedOrderType: translateGameText(removedOrder.type.name),
                affectedHouse: affectedHouse.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                bold4: <b />,
                bold5: <b />
              }}
            />
          </p>
        );
      }
      case "ellaria-sand-1st-no-knight-available": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.ellariaSandHouseHadNoAvailableKnightToUpgrade6d5a93"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "ellaria-sand-1st-no-footman-available": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.ellariaSandHouseHadNoAvailableFootmanToUpgradebc8e6a"
              values={{ house: house.name }}
              components={{
                bold: <b />,
                bold2: <b />
              }}
            />
          </p>
        );
      }
      case "ellaria-sand-1st-footman-upgraded-to-knight": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.ellariaSandHouseUpgradedAFootmanToAKnight285a12"
              values={{
                house: house.name,
                region: this.fogOfWar ? t("common.hiddenRegion") : region.name
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </p>
        );
      }
      case "arianne-martell-1st-army-unit-killed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const unitType = unitTypes.get(data.unit);

        return (
          <p>
            <Trans
              i18nKey="gameLogList.arianneMartellHouseForcedHouseToDestroyAUnitc949f3"
              values={{ house: house.name, affectedHouse: affectedHouse.name }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />,
                lineBreak: <br />,
                casualty: (
                  <>
                    {!this.fogOfWar && (
                      <>
                        <Trans
                          i18nKey="gameLogList.houseChoseToDestroyAa590ac"
                          values={{
                            affectedHouse: affectedHouse.name,
                            unitType: translateGameText(unitType.name)
                          }}
                          components={{
                            bold: <b />,
                            bold2: <b />
                          }}
                        />
                      </>
                    )}
                  </>
                )
              }}
            />
          </p>
        );
      }
    }
  }

  renderHouseName(house: House): ReactNode {
    return (
      <>
        <Trans
          i18nKey="gameLogList.house7d99a9"
          values={{ attacked: house.name }}
          components={{
            bold: <b style={{ color: house.color }} />
          }}
        />
      </>
    );
  }

  debounceSendGameLogSeen = _.debounce(
    (time) => {
      this.logManager.sendGameLogSeen(time);
    },
    2000,
    { trailing: true }
  );

  componentDidUpdate(
    prevProps: Readonly<GameLogListComponentProps>,
    _prevState: Readonly<Record<string, unknown>>
  ): void {
    if (this.replayManager.isReplayMode) {
      return;
    }

    const now = this.props.ingameGameState.entireGame.now;
    if (this.props.currentlyViewed) {
      this.debounceSendGameLogSeen(timeToTicks(now));
    }

    if (
      this.props.gameClient.authenticatedUser &&
      prevProps.currentlyViewed == true &&
      !this.props.currentlyViewed
    ) {
      this.logManager.lastSeenLogTimes.set(
        this.props.gameClient.authenticatedUser,
        timeToTicks(now)
      );
    }
  }

  componentDidMount(): void {
    const now = this.props.ingameGameState.entireGame.now;
    if (this.props.currentlyViewed) {
      this.logManager.sendGameLogSeen(timeToTicks(now));
    }
  }
}
