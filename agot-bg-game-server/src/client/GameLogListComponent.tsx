import { Component, ReactNode } from "react";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IngameGameState, {
  ReplacementReason,
} from "../common/ingame-game-state/IngameGameState";
import {
  GameLogData,
  PlayerActionType,
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
  timeToTicks,
} from "../common/ingame-game-state/game-data-structure/GameLogManager";
import { secondsToString } from "./utils/secondsToString";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import orderImages from "./orderImages";
import presentImage from "../../public/images/icons/present.svg";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import allKnownHouseCards from "./utils/houseCardHelper";
import classNames from "classnames";
import GameReplayManager from "./game-replay/GameReplayManager";

const fogOfWarPlaceholder = "a region";

interface GameLogListComponentProps {
  ingameGameState: IngameGameState;
  gameClient: GameClient;
  currentlyViewed: boolean;
  scrollToLog?: number;
}

@observer
export default class GameLogListComponent extends Component<GameLogListComponentProps> {
  private allHouseCards = allKnownHouseCards;
  allHouseCardsByAbilityId = new BetterMap(
    this.allHouseCards.values
      .filter((hc) => hc.ability != null)
      .map((hc) => [hc.ability?.id ?? "ability-never-null-here", hc])
  );

  currentRound = 0;

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
    return !this.ingame.isEndedOrCancelled && this.ingame.fogOfWar;
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

    this.currentRound = 0;

    const highlightLog = (i: number): boolean => {
      return this.replayManager.isReplayMode
        ? i == this.replayManager.selectedLogIndex
        : this.replayManager.isModifyingGameLogUI(this.logManager.logs[i].data);
    };

    return this.logManager.logs.map((l, i) => (
      <div key={`log_${i}`}>
        {lastSeenLogTime == null && i == 0 && (
          <Row className="justify-content-center align-items-center">
            <Col xs={true}>
              <hr className="red" />
            </Col>
            <Col xs="auto" style={{ color: "red" }}>
              <h6>New log entries</h6>
            </Col>
            <Col xs={true}>
              <hr className="red" />
            </Col>
          </Row>
        )}
        <Row>
          <Col xs="auto" className="text-muted px-0 ml-2">
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip id={"log-date-" + l.time.getUTCMilliseconds()}>
                  {l.time.toLocaleString()}
                </Tooltip>
              }
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <small>
                {l.time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </small>
            </OverlayTrigger>
          </Col>
          {l.resolvedAutomatically && (
            <Col xs="auto">
              <OverlayTrigger
                overlay={
                  <Tooltip id="logs-tooltip">
                    This action has been resolved automatically.
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
          <Col className="mr-2">
            <div
              id={`game-log-content-${i}`}
              className={classNames("game-log-content", {
                "highlight-log": highlightLog(i),
                "clickable-no-underline": this.replayManager.isReplayMode,
              })}
              onClick={() => {
                if (this.replayManager.isReplayMode) {
                  this.onLogClick(i);
                } else if (highlightLog(i)) {
                  this.onLogClick(i);
                }
              }}
            >
              {this.renderGameLogData(l.data, this.currentRound)}
            </div>
          </Col>
        </Row>
        {lastSeenLogTime &&
          i + 1 < this.logManager.logs.length &&
          this.logManager.logs[i].time <= lastSeenLogTime &&
          this.logManager.logs[i + 1].time > lastSeenLogTime && (
            <Row className="justify-content-center align-items-center">
              <Col xs={true}>
                <hr className="red" />
              </Col>
              <Col xs="auto" style={{ color: "red" }}>
                <h6>New log entries</h6>
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
            text = "placed their orders";
            break;
          case PlayerActionType.BID_MADE:
            text = "made their bid";
            break;
          case PlayerActionType.HOUSE_CARD_CHOSEN:
            text = "chose their House card";
            break;
          default:
            text = "Invalid PlayerActionType received";
            break;
        }
        return (
          <p>
            House <b>{house.name}</b> {text}
            {forHouses ? (
              <>
                {" "}
                for{" "}
                {forHouses.length == 1 ? (
                  <>
                    Vassal house{" "}
                    <b key={`for_vassal_house_${forHouses[0].id}`}>
                      {forHouses[0].name}
                    </b>
                  </>
                ) : (
                  joinReactNodes(
                    forHouses.map((h) => (
                      <b key={`for_vassal_house_${h.id}`}>{h.name}</b>
                    )),
                    ", "
                  )
                )}
              </>
            ) : (
              <></>
            )}
            .
          </p>
        );
      }
      case "user-house-assignments":
        const assignments = data.assignments.map(([houseId, userId]) => [
          this.game.houses.get(houseId),
          this.ingame.entireGame.users.get(userId),
        ]) as [House, User][];
        return (
          <>
            <div id="gamelog-round-0" className="text-center mb-4">
              <h4>The war of the {assignments.length} kings has begun!</h4>
            </div>
            {assignments.map(([house, user]) => (
              <p key={`${house.id}_${user.id}`}>
                {this.renderHouseName(house)} is controlled by{" "}
                <b>
                  {getUserLinkOrLabel(
                    this.ingame.entireGame,
                    user,
                    this.ingame.players.tryGet(user, null)
                  )}
                </b>
                .
              </p>
            ))}
          </>
        );
      case "turn-begin":
        this.currentRound = data.turn;
        return (
          <Row className="justify-content-center">
            <Col xs={true}>
              <hr />
            </Col>
            <Col xs="auto">
              <h3 id={`gamelog-round-${data.turn}`}>
                Round <b>{data.turn}</b>
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
              House <b>{supporter.name}</b> supported House{" "}
              <b>{supported.name}</b>.
            </p>
          );
        } else {
          return (
            <p>
              House <b>{supporter.name}</b> supported no-one.
            </p>
          );
        }

      case "support-refused": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            House <b>{house.name}</b> chose to refuse all the support they
            received.
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
              House <b>{attacker.name}</b> attacked{" "}
              {attacked ? (
                <>
                  House <b>{attacked.name}</b>
                </>
              ) : (
                <>
                  a <b>Neutral Force</b>
                </>
              )}{" "}
              from <b>{attackingRegion.name}</b> to <b>{attackedRegion.name}</b>{" "}
              with{" "}
              <>
                {joinReactNodes(
                  army.map((ut, i) => (
                    <b key={`attack_${ut.id}_${i}`}>{ut.name}</b>
                  )),
                  ", "
                )}
              </>
              .
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
                  House <b>{house.name}</b> resolved a <b>March</b> order.
                </p>
              </Col>
            </Row>
          );
        }

        const startingRegion = this.world.regions.get(data.startingRegion);
        const moves: [Region, UnitType[]][] = data.moves.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
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
                    House <b>{house.name}</b> marched from{" "}
                    <b>{startingRegion.name}</b>:
                  </p>
                  <ul>
                    {moves.map(([region, unitTypes]) => (
                      <li key={`march-resolved_${region.id}`}>
                        {joinReactNodes(
                          unitTypes.map((ut, i) => (
                            <b key={`march_${region.id}_${ut.id}_${i}`}>
                              {ut.name}
                            </b>
                          )),
                          ", "
                        )}{" "}
                        to <b>{region.name}</b>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    House <b>{house.name}</b> removed their March Order in{" "}
                    <b>{startingRegion.name}</b>.
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
            House <b>{house.name}</b> left{" "}
            {data.leftPowerToken ? <>behind a</> : <b>no</b>} Power&nbsp;token
            in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
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
            <p>Westeros cards were drawn:</p>
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
                Wildling Threat increased by {data.addedWildlingStrength}
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
            isWinner: house == winner,
          };
        });

        return (
          <>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CombatInfoComponent housesCombatData={houseCombatDatas} />
            </div>
            <p className="text-center mt-4">
              House{" "}
              <b style={{ color: winner.color, fontSize: "1.25rem" }}>
                {winner.name}
              </b>{" "}
              won the battle!
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
              Wildling card revealed: <b>{wildlingCard.type.name}</b>
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
              Wildling bidding results for Wildling Threat{" "}
              <b>{data.wildlingStrength}</b>:
            </p>
            <div className="mt-1">
              <HouseNumberResultsComponent
                results={bids}
                keyPrefix="wildlings-log"
              ></HouseNumberResultsComponent>
            </div>
            {data.nightsWatchVictory ? (
              <p className="text-center">
                The <b>Night&apos;s Watch</b> won!
              </p>
            ) : (
              <p className="text-center">
                The <b>Wildlings</b> won!
              </p>
            )}
          </>
        );
      }
      case "lowest-bidder-chosen": {
        const lowestBidder = this.game.houses.get(data.lowestBidder);

        return (
          <p>
            House <b>{lowestBidder.name}</b> was chosen as the lowest bidder.
          </p>
        );
      }
      case "highest-bidder-chosen":
        const highestBidder = this.game.houses.get(data.highestBidder);

        return (
          <p>
            House <b>{highestBidder.name}</b> was chosen as the highest bidder.
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
                to: unitTypes.get(to),
              })),
            ] as [
              Region,
              { region: Region; from: UnitType | null; to: UnitType }[],
            ]
        );

        return (
          <>
            {musterings.length == 0 && (
              <p>
                House <b>{house.name}</b> mustered nothing.
              </p>
            )}
            {musterings.length > 0 && (
              <>
                {musterings.map(([originatingRegion, recruitments]) => (
                  <div key={`$mustering_${originatingRegion.id}`}>
                    <p>
                      House <b>{house.name}</b> mustered in{" "}
                      <b>
                        {this.fogOfWar
                          ? fogOfWarPlaceholder
                          : originatingRegion.name}
                      </b>
                      .
                    </p>
                    {!this.fogOfWar && (
                      <ul>
                        {recruitments.map(({ region, from, to }, i) => (
                          <li key={"recruitment-" + region.id + "-" + i}>
                            {from ? (
                              <>
                                A <b>{to.name}</b> from a <b>{from.name}</b>
                                {originatingRegion != region && (
                                  <>
                                    {" "}
                                    to{" "}
                                    <b>
                                      {this.fogOfWar
                                        ? fogOfWarPlaceholder
                                        : region.name}
                                    </b>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                A <b>{to.name}</b>
                                {originatingRegion != region && (
                                  <>
                                    {" "}
                                    to{" "}
                                    <b>
                                      {this.fogOfWar
                                        ? fogOfWarPlaceholder
                                        : region.name}
                                    </b>
                                  </>
                                )}
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
            Game has ended.
            <br />
            {this.renderHouseName(winner)} has won this Game of Thrones!
          </h4>
        );
      }
      case "raven-holder-wildling-card-put-bottom": {
        const house = this.game.houses.get(data.ravenHolder);

        return (
          <p>
            House <b>{house.name}</b>, holder of the Messenger Raven token,
            chose to look at the top card of the Wildling deck and to move it at
            the bottom of the deck.
          </p>
        );
      }
      case "raven-holder-wildling-card-put-top": {
        const house = this.game.houses.get(data.ravenHolder);

        return (
          <p>
            House <b>{house.name}</b>, holder of the Messenger Raven token,
            chose to look at the top card of the Wildling deck and to leave it
            at the top of the deck.
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
            House <b>{house.name}</b>, holder of the Messenger Raven token,
            chose to replace a{" "}
            <b>{this.fogOfWar ? "" : originalOrder.type.name}</b> order with a{" "}
            <b>{this.fogOfWar ? "" : newOrder.type.name}</b> order in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : orderRegion.name}</b>.
          </p>
        );
      }
      case "raven-not-used": {
        const house = this.game.houses.get(data.ravenHolder);

        return (
          <p>
            House <b>{house.name}</b> did not use the Messenger Raven token.
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
              <b>House {raider.name}</b> resolved a <b>Raid</b> order.
            </p>
          );
        }

        // Those 3 variables will always be all null or all non-null
        if (raidee && raidedRegion && orderRaided) {
          return (
            <>
              <p>
                House <b>{raider.name}</b> raided House <b>{raidee.name}</b>
                &apos;s <b>{orderRaided.type.name} Order</b> in{" "}
                <b>{raidedRegion.name}</b> from <b>{raiderRegion.name}</b>.
              </p>
              {data.raiderGainedPowerToken && (
                <p>
                  House <b>{raider.name}</b> gained{" "}
                  {data.raiderGainedPowerToken ? "a" : "no"} Power&nbsp;token
                  from this raid.
                </p>
              )}
              {data.raidedHouseLostPowerToken != null && (
                <p>
                  House <b>{raidee.name}</b> lost{" "}
                  {data.raidedHouseLostPowerToken ? "a" : "no"} Power&nbsp;token
                  from this raid.
                </p>
              )}
            </>
          );
        } else {
          return (
            <p>
              <b>House {raider.name}</b> raided nothing from{" "}
              <b>{raiderRegion.name}</b>.
            </p>
          );
        }

      case "a-throne-of-blades-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b>, holder of the Iron Throne token, chose to
            {data.choice == 0 ? (
              <> trigger a Mustering.</>
            ) : data.choice == 1 ? (
              <> trigger a Supply.</>
            ) : (
              <> trigger nothing.</>
            )}
          </p>
        );
      }
      case "the-burden-of-power-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b>, holder of the Iron Throne token, chose to
            {data.choice == 0 ? (
              <> reduce the Wildling track to the &quot;0&quot; position.</>
            ) : (
              <> trigger a Mustering.</>
            )}
          </p>
        );
      }
      case "dark-wings-dark-words-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b>, holder of the Messenger Raven token,
            chose to
            {data.choice == 0 ? (
              <> trigger a Clash of Kings.</>
            ) : data.choice == 1 ? (
              <> trigger a Game of Thrones.</>
            ) : (
              <> trigger nothing.</>
            )}
          </p>
        );
      }
      case "put-to-the-sword-choice": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b>, holder of the Valyrian Steel Blade token,
            chose to
            {data.choice == 0 ? (
              <>
                {" "}
                forbid <b>March +1</b> Orders from being played during this
                Planning Phase.
              </>
            ) : data.choice == 1 ? (
              <>
                {" "}
                forbid <b>Defense</b> Orders from being played during this
                Planning Phase.
              </>
            ) : (
              <> forbid nothing.</>
            )}
          </p>
        );
      }
      case "winter-is-coming":
        const drawnCardType = westerosCardTypes.get(data.drawnCardType);

        return (
          <p>
            <b>Winter is Coming</b>: The Westeros deck {data.deckIndex + 1} was
            shuffled and the new Westeros card drawn is{" "}
            <b>{drawnCardType.name}</b>.
          </p>
        );

      case "westeros-phase-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h4>
                <b>Westeros Phase</b>
              </h4>
            </Col>
          </Row>
        );

      case "claim-vassals-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>Claim Vassals</b>
              </h5>
            </Col>
          </Row>
        );

      case "planning-phase-began":
        const content = <b>{data.forVassals && "Vassal "}Planning Phase</b>;
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
                <b>Draft House cards</b>
              </h5>
            </Col>
          </Row>
        );

      case "house-card-picked": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            House <b>{house.name}</b> picked <b>{houseCard.name}</b>.
          </p>
        );
      }

      case "house-cards-chosen": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            House <b>{house.name}</b> has chosen their House cards.
          </p>
        );
      }

      case "action-phase-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h4>
                <b>Action Phase</b>
              </h4>
            </Col>
          </Row>
        );

      case "action-phase-resolve-raid-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>Resolve Raid Orders</b>
              </h5>
            </Col>
          </Row>
        );

      case "action-phase-resolve-march-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>Resolve March Orders</b>
              </h5>
            </Col>
          </Row>
        );

      case "action-phase-resolve-consolidate-power-began":
        return (
          <Row className="justify-content-center">
            <Col xs="auto">
              <h5>
                <b>Resolve Consolidate Power Orders</b>
              </h5>
            </Col>
          </Row>
        );

      case "combat-valyrian-sword-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b> used the <b>Valyrian Steel Blade</b> to{" "}
            {data.forNewTidesOfBattleCard
              ? "draw a new Tides of Battle card"
              : "increase their combat strength by 1"}
            .
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
                House <b>{h.name}</b> chose <b>{hc.name}</b>
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
              Final order of{" "}
              <b>{this.game.getNameInfluenceTrack(data.trackerI)}</b> track:
            </p>
            <Row className="mb-2 mt-1 ml-2">
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
                House <b>{distributor.name}</b> adapted the biddings for{" "}
                <b>{this.game.getNameInfluenceTrack(data.trackerI)}</b> track:
              </p>
            ) : (
              <p>
                Houses bid for{" "}
                <b>{this.game.getNameInfluenceTrack(data.trackerI)}</b> track:
              </p>
            )}

            <Row className="mb-1 mt-2 ml-2">
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
              <b>Wildling Threat</b> reached <b>{data.wildlingStrength}</b>,
              triggering a <b>Wildling Attack</b>!
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
              House <b>{house.name}</b> resolved a <b>Consolidate Power</b>{" "}
              order.
            </p>
          );
        }

        return (
          <p>
            House <b>{house.name}</b> resolved a{" "}
            <b>{data.starred && "Special "}Consolidate Power</b> order in{" "}
            <b>{region.name}</b> to gain <b>{countPowerToken}</b>{" "}
            Power&nbsp;token{countPowerToken != 1 ? "s" : ""}.
          </p>
        );
      }
      case "armies-reconciled": {
        const house = this.game.houses.get(data.house);
        const armies = data.armies.map(
          ([rid, utids]) =>
            [
              this.world.regions.get(rid),
              utids.map((utid) => unitTypes.get(utid)),
            ] as [Region, UnitType[]]
        );

        return (
          <>
            <p>
              House <b>{house.name}</b> reconciled their armies by destroying:
            </p>
            <ul>
              {armies.map(([region, unitTypes]) => (
                <li key={`armies-reconciled_${region.id}`}>
                  {joinReactNodes(
                    unitTypes.map((ut, i) => (
                      <b key={`armies-reconciled_${region.id}_${ut.id}_${i}`}>
                        {ut.name}
                      </b>
                    )),
                    ", "
                  )}{" "}
                  in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
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
            House <b>{house.name}</b> did not use <b>{houseCard.name}&apos;s</b>{" "}
            ability.
          </p>
        );
      }
      case "patchface-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <b>Patchface</b>: House <b>{house.name}</b> decided to discard{" "}
            <b>{houseCard.name}</b> from House <b>{affectedHouse.name}</b>.
          </p>
        );
      }
      case "melisandre-dwd-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <b>Melisandre</b>: House <b>{house.name}</b> discarded{" "}
            <b>{houseCard.combatStrength}</b> Power token
            {houseCard.combatStrength != 1 ? "s" : ""} to return{" "}
            <b>{houseCard.name}</b> to hand.
          </p>
        );
      }
      case "jon-snow-used": {
        const house = this.game.houses.get(data.house);
        let wilddlingStatus = "increase";
        if (data.wildlingsStrength < 0) {
          wilddlingStatus = "decrease";
        }
        return (
          <p>
            <b>Jon Snow</b>: House <b>{house.name}</b> decided to{" "}
            <b>{wilddlingStatus}</b> the Wildling track by one space.
          </p>
        );
      }
      case "doran-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const influenceTrack = this.game.getNameInfluenceTrack(
          data.influenceTrack
        );
        const skippedHouse = data.skippedHouse
          ? this.game.houses.get(data.skippedHouse)
          : null;

        const skippedAddition = skippedHouse ? (
          <>
            , causing House <b>{skippedHouse.name}</b>&apos;s turn to be skipped
            until the next pass of the <b>Iron Throne</b> track
          </>
        ) : null;

        return (
          <p>
            <b>Doran Martell</b>: House <b>{house.name}</b> decided to move
            House <b>{affectedHouse.name}</b> to the bottom of the{" "}
            <b>{influenceTrack}</b> track{skippedAddition}.
          </p>
        );
      }
      case "ser-gerris-drinkwater-used": {
        const house = this.game.houses.get(data.house);
        const influenceTrack = this.game.getNameInfluenceTrack(
          data.influenceTrack
        );

        return (
          <p>
            <b>Ser Gerris Drinkwater</b>: House <b>{house.name}</b> decided to
            increase his position on <b>{influenceTrack}</b> track.
          </p>
        );
      }
      case "reek-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Reek</b>: House <b>{house.name}</b> decided to return <b>Reek</b>{" "}
            to hand.
          </p>
        );
      }
      case "reek-returned-ramsay": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.returnedCardId);

        return (
          <p>
            <b>Reek</b>: <b>{houseCard.name}</b> of House <b>{house.name}</b>{" "}
            was returned to hand.
          </p>
        );
      }
      case "lysa-arryn-mod-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Lysa Arryn</b>: House <b>{house.name}</b> decided to return{" "}
            <b>Lysa Arryn</b> to hand.
          </p>
        );
      }
      case "qyburn-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <b>Qyburn</b>: House <b>{house.name}</b> decided to use the combat
            strength <b>{houseCard.combatStrength}</b> from{" "}
            <b>{houseCard.name}</b>.
            <div style={{ display: "flex", justifyContent: "center" }}>
              <HouseCardComponent houseCard={houseCard} size="small" />
            </div>
          </p>
        );
      }
      case "aeron-damphair-used": {
        const house = this.game.houses.get(data.house);
        const tokens = data.tokens;

        return (
          <p>
            <b>Aeron Damphair</b>: House <b>{house.name}</b> decided to increase
            the combat strength of this card by <b>{tokens}</b>.
          </p>
        );
      }
      case "rodrik-the-reader-used": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Rodrik the Reader</b>: House <b>{house.name}</b> decided to
            choose a card from Westeros Deck <b>{data.westerosDeckI + 1}</b>.
          </p>
        );
      }
      case "tyrion-lannister-choice-made": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const chooseToReplace = data.chooseToReplace;

        return (
          <p>
            <b>Tyrion Lannister</b>: House <b>{house.name}</b>{" "}
            {!chooseToReplace && "didn't "}force{chooseToReplace && "d"} House{" "}
            <b>{affectedHouse.name}</b> to choose a new House card.
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
            House <b>{affectedHouse.name}</b> chose <b>{newHouseCard.name}.</b>
          </p>
        ) : (
          <p>
            House <b>{affectedHouse.name}</b> had no other available House card.
          </p>
        );
      }
      case "arianne-martell-prevent-movement": {
        const enemyHouse = this.game.houses.get(data.enemyHouse);

        return (
          <p>
            <b>Arianne Martell</b>: House <b>{enemyHouse.name}</b> cannot move
            their army into the embattled area.
          </p>
        );
      }
      case "arianne-martell-force-retreat": {
        const house = this.game.houses.get(data.house);
        const enemyHouse = this.game.houses.get(data.enemyHouse);

        return (
          <p>
            <b>Arianne Martell</b>: House <b>{house.name}</b> forced House{" "}
            <b>{enemyHouse.name}</b> to retreat.
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
            <b>Roose Bolton</b>: House <b>{house.name}</b> took back all
            discarded House cards (
            {joinReactNodes(
              returnedHouseCards.map((hc) => (
                <b key={`roose_${hc.id}`}>{hc.name}</b>
              )),
              ", "
            )}
            ).
          </p>
        ) : (
          <p>
            <b>Roose Bolton</b>: House <b>{house.name}</b> had no discarded
            House cards.
          </p>
        );
      }
      case "loras-tyrell-attack-order-moved":
        const order = orders.get(data.order);
        const embattledRegion = this.world.regions.get(data.region);

        return (
          <p>
            <b>Loras Tyrell</b>: The <b>{order.type.name}</b> Order was moved to{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : embattledRegion.name}</b>.
          </p>
        );

      case "queen-of-thorns-no-order-available": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <b>Queen of Thorns</b>: There were no orders of House{" "}
            <b>{affectedHouse.name}</b> that could have been removed by House{" "}
            <b>{house.name}</b>.
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
            <b>Queen of Thorns</b>: House <b>{house.name}</b> removed a{" "}
            <b>{removedOrder.type.name}</b> Order of House{" "}
            <b>{affectedHouse.name}</b> in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "tywin-lannister-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <b>Tywin Lannister</b>: House <b>{house.name}</b> gained{" "}
            <b>{powerTokensGained}</b> Power&nbsp;token
            {powerTokensGained != 1 ? "s" : ""}.
          </p>
        );
      }
      case "qarl-the-maid-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <b>Qarl the Maid</b>: House <b>{house.name}</b> gained{" "}
            <b>{powerTokensGained}</b> Power&nbsp;token
            {powerTokensGained != 1 ? "s" : ""}.
          </p>
        );
      }
      case "renly-baratheon-no-knight-available": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Renly Baratheon</b>: House <b>{house.name}</b> had no available
            Knight to upgrade to.
          </p>
        );
      }
      case "renly-baratheon-no-footman-available": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Renly Baratheon</b>: House <b>{house.name}</b> had no available
            Footman to upgrade.
          </p>
        );
      }
      case "renly-baratheon-footman-upgraded-to-knight": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <b>Renly Baratheon</b>: House <b>{house.name}</b> upgraded a Footman
            to a Knight in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "mace-tyrell-casualties-prevented": {
        return (
          <p>
            <b>Mace Tyrell</b>: Casualties were prevented by{" "}
            <b>The Blackfish</b>.
          </p>
        );
      }
      case "mace-tyrell-no-footman-available":
        return (
          <p>
            <b>Mace Tyrell</b>: No enemy Footman was available to be destroyed.
          </p>
        );

      case "mace-tyrell-footman-killed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <b>Mace Tyrell</b>: House <b>{house.name}</b> destroyed an enemy
            Footman in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "ser-ilyn-payne-footman-killed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            <b>Ser Ilyn Payne</b>: House <b>{house.name}</b> destroyed an enemy
            Footman in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "cersei-lannister-no-order-available":
        return (
          <p>
            <b>Cersei Lannister</b>: There were no Order tokens to be removed.
          </p>
        );

      case "cersei-lannister-order-removed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const region = this.world.regions.get(data.region);
        const removedOrder = orders.get(data.order);

        return (
          <p>
            <b>Cersei Lannister</b>: House <b>{house.name}</b> removed a{" "}
            <b>{removedOrder.type.name}</b> Order of <b>{affectedHouse.name}</b>{" "}
            in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "robb-stark-retreat-location-overriden": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <b>{houseCard.name}</b>: House <b>{house.name}</b> chose the retreat
            location of the retreating army of <b>{affectedHouse.name}</b>.
          </p>
        );
      }
      case "retreat-region-chosen": {
        const house = this.game.houses.get(data.house);
        const regionFrom = this.game.world.regions.get(data.regionFrom);
        const regionTo = this.game.world.regions.get(data.regionTo);
        return (
          <p>
            House <b>{house.name}</b> retreats from{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : regionFrom.name}</b> to{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : regionTo.name}</b>.
          </p>
        );
      }
      case "retreat-failed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);

        return (
          <p>
            House <b>{house.name}</b> was not able to retreat{" "}
            {data.isAttacker ? "to" : "from"}{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "retreat-casualties-suffered": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map((ut) => unitTypes.get(ut).name);
        return (
          <p>
            House <b>{house.name}</b> suffered casualties from the retreat and
            chose these units to be destroyed:{" "}
            <>
              {joinReactNodes(
                units.map((unitType, i) => (
                  <b key={`retreat-casualties-suffered_${unitType}_${i}`}>
                    {unitType}
                  </b>
                )),
                ", "
              )}
            </>
            .
          </p>
        );
      }
      case "enemy-port-taken": {
        const newController = this.game.houses.get(data.newController);
        const oldController = this.game.houses.get(data.oldController);
        const port = this.world.regions.get(data.port);
        return data.shipCount > 0 ? (
          <p>
            House <b>{newController.name}</b> converted {data.shipCount} ship
            {data.shipCount == 1 ? "" : "s"} from House{" "}
            <b>{oldController.name}</b> in <b>{port.name}</b>.
          </p>
        ) : (
          <p>
            House <b>{newController.name}</b> destroyed all{" "}
            <b>{oldController.name}</b> ships in <b>{port.name}</b>.
          </p>
        );
      }
      case "ships-destroyed-by-empty-castle": {
        const house = this.game.houses.get(data.house);
        const port = this.game.world.regions.get(data.port);
        const castle = this.game.world.regions.get(data.castle);
        return (
          <p>
            House <b>{house.name}</b> lost {data.shipCount} Ship
            {data.shipCount > 1 ? "s" : ""} in <b>{port.name}</b> because{" "}
            <b>{castle.name}</b> is empty now.
          </p>
        );
      }
      case "silence-at-the-wall-executed":
        return (
          <p>
            <b>Silence at the Wall</b>: Nothing happened.
          </p>
        );

      case "preemptive-raid-choice-done": {
        const house = this.game.houses.get(data.house);

        if (data.choice == 0) {
          return (
            <p>
              <b>Preemptive Raid</b>: House <b>{house.name}</b> chose to kill 2
              of their units.
            </p>
          );
        } else {
          return (
            <p>
              <b>Preemptive Raid</b>: House <b>{house.name}</b> chose to reduce
              2 positions on their highest Influence track.
            </p>
          );
        }
      }
      case "preemptive-raid-track-reduced": {
        const chooser = data.chooser
          ? this.game.houses.get(data.chooser)
          : null;
        const house = this.game.houses.get(data.house);
        const trackName = this.game.getNameInfluenceTrack(data.trackI);

        if (chooser == null) {
          return (
            <p>
              House <b>{house.name}</b> was reduced 2 positions on the{" "}
              <b>{trackName}</b> track.
            </p>
          );
        } else {
          return (
            <p>
              <b>House {chooser.name}</b> chose to reduce House{" "}
              <b>{house.name}</b> 2 positions on the <b>{trackName}</b> track.
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
              utids.map((utid) => unitTypes.get(utid)),
            ] as [Region, UnitType[]]
        );

        return (
          <p>
            House <b>{house.name}</b>
            {units.length > 0 ? (
              <>
                {" "}
                chose to destroy{" "}
                {joinReactNodes(
                  units.map(([region, unitTypes]) => (
                    <span key={`preemptive_${region.id}`}>
                      {joinReactNodes(
                        unitTypes.map((ut, i) => (
                          <b key={`preemptive_${ut.id}_${i}`}>{ut.name}</b>
                        )),
                        ", "
                      )}{" "}
                      in{" "}
                      <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                    </span>
                  )),
                  " and "
                )}
                .
              </>
            ) : (
              <> had no units to destroy.</>
            )}
          </p>
        );
      }
      case "preemptive-raid-wildlings-attack": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Preemptive Raid</b>: A new Wildlings Attack with strength{" "}
            <b>{data.wildlingStrength}</b> was triggered where House{" "}
            <b>{house.name}</b> will not be participating.
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
            <b>Massing on the Milkwater</b>: House <b>{house.name}</b>{" "}
            {houseCardsReturned.length > 0 ? (
              <>
                took back{" "}
                {joinReactNodes(
                  houseCardsReturned.map((hc) => (
                    <b key={`massing-on-the-milkwater-cards-back_${hc.id}`}>
                      {hc.name}
                    </b>
                  )),
                  ", "
                )}
                .
              </>
            ) : (
              <>had no House cards on their discard pile.</>
            )}
          </p>
        );
      }
      case "massing-on-the-milkwater-wildling-victory": {
        const lowestBidder = this.game.houses.get(data.lowestBidder);

        return (
          <p>
            <b>Massing on the Milkwater</b>: House <b>{lowestBidder.name}</b>{" "}
            discards all House cards with the highest combat strength, all other
            houses must discard one House card.
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
            House <b>{house.name}</b> discarded{" "}
            {joinReactNodes(
              houseCardsUsed.map((hc) => (
                <b key={`massing-on-the-milkwater-cards-removed_${hc.id}`}>
                  {hc.name}
                </b>
              )),
              ", "
            )}
            .
          </p>
        ) : (
          <p>
            House <b>{house.name}</b> did not discard a House card.
          </p>
        );
      }
      case "a-king-beyond-the-wall-highest-top-track": {
        const house = this.game.houses.get(data.house);
        const trackName = this.game.getNameInfluenceTrack(data.trackI);

        return (
          <p>
            <b>A King Beyond the Wall</b>: House <b>{house.name}</b> chose to
            move at the top of the <b>{trackName}</b> track.
          </p>
        );
      }
      case "a-king-beyond-the-wall-lowest-reduce-tracks":
        const lowestBidder = this.game.houses.get(data.lowestBidder);

        return (
          <p>
            <b>A King Beyond the Wall</b>: House <b>{lowestBidder.name}</b> was
            moved to the bottom of all influence tracks.
          </p>
        );

      case "a-king-beyond-the-wall-house-reduce-track": {
        const house = this.game.houses.get(data.house);
        const trackName = this.game.getNameInfluenceTrack(data.trackI);

        return (
          <p>
            <b>A King Beyond the Wall</b>: House <b>{house.name}</b> chose to
            move at the bottom of the <b>{trackName}</b> influence track.
          </p>
        );
      }
      case "mammoth-riders-destroy-units": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
        ]) as [Region, UnitType[]][];

        return (
          <p>
            <b>Mammoth Riders</b>: House <b>{house.name}</b>
            {units.length > 0 ? (
              <>
                {" "}
                chose to destroy{" "}
                {joinReactNodes(
                  units.map(([region, unitTypes]) => (
                    <span key={`mammoth-riders_${region.id}`}>
                      {joinReactNodes(
                        unitTypes.map((ut, i) => (
                          <b key={`mammoth-riders_${ut.id}_${i}`}>{ut.name}</b>
                        )),
                        ", "
                      )}{" "}
                      in{" "}
                      <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                    </span>
                  )),
                  ", "
                )}
                .
              </>
            ) : (
              <> had no units to destroy.</>
            )}
          </p>
        );
      }
      case "mammoth-riders-return-card": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <b>Mammoth Riders</b>: House <b>{house.name}</b> chose to regain{" "}
            <b>{houseCard.name}</b>.
          </p>
        );
      }
      case "the-horde-descends-highest-muster": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>The Horde Descends</b>: House <b>{house.name}</b> may muster
            forces in any one Castle or Stronghold they control.
          </p>
        );
      }
      case "the-horde-descends-units-killed": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
        ]) as [Region, UnitType[]][];

        return (
          <p>
            <b>The Horde Descends</b>: House <b>{house.name}</b>
            {units.length > 0 ? (
              <>
                {" "}
                chose to destroy{" "}
                {joinReactNodes(
                  units.map(([region, unitTypes]) => (
                    <span key={`the-horde-descends_${region.id}`}>
                      {joinReactNodes(
                        unitTypes.map((ut, i) => (
                          <b key={`the-horde-descends_${ut.id}_${i}`}>
                            {ut.name}
                          </b>
                        )),
                        ", "
                      )}{" "}
                      in{" "}
                      <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                    </span>
                  )),
                  ", "
                )}
                .
              </>
            ) : (
              <> had no units to destroy.</>
            )}
          </p>
        );
      }
      case "crow-killers-knights-replaced": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
        ]) as [Region, UnitType[]][];

        return (
          <p>
            {units.length > 0 ? (
              <>
                <b>Crow Killers</b>: House <b>{house.name}</b> replaced{" "}
                {joinReactNodes(
                  units.map(([region, unitTypes], i) => (
                    <span key={`crow-killers-replace_${i}`}>
                      <b>{unitTypes.length}</b> Knight
                      {unitTypes.length != 1 ? "s" : ""} in{" "}
                      <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                    </span>
                  )),
                  ", "
                )}{" "}
                with Footmen.
              </>
            ) : (
              <>
                <b>Crow Killers</b>: House <b>{house.name}</b> had no Knights to
                replace with Footmen.
              </>
            )}
          </p>
        );
      }
      case "crow-killers-knights-killed": {
        const house = this.game.houses.get(data.house);
        const units: [Region, UnitType[]][] = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
        ]);

        return (
          <p>
            <b>Crow Killers</b>: House <b>{house.name}</b> had to destroy{" "}
            {joinReactNodes(
              units.map(([region, unitTypes], i) => (
                <span key={`crow-killers-kill_${i}`}>
                  <b>{unitTypes.length}</b> Knight
                  {unitTypes.length != 1 ? "s" : ""} in{" "}
                  <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                </span>
              )),
              ", "
            )}
            .
          </p>
        );
      }

      case "crow-killers-footman-upgraded": {
        const house = this.game.houses.get(data.house);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
        ]) as [Region, UnitType[]][];

        return units.length > 0 ? (
          <p>
            <b>Crow Killers</b>: House <b>{house.name}</b> replaced{" "}
            {joinReactNodes(
              units.map(([region, unitTypes], i) => (
                <span key={`crow-killers-upgrade_${i}`}>
                  <b>{unitTypes.length}</b> Footm
                  {unitTypes.length == 1 ? "a" : "e"}n in{" "}
                  <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                </span>
              )),
              ", "
            )}{" "}
            with Knights.
          </p>
        ) : (
          <p>
            <b>Crow Killers</b>: House <b>{house.name}</b> was not able to
            replace any Footman with Knights.
          </p>
        );
      }
      case "skinchanger-scout-nights-watch-victory": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Skinchanger Scout</b>: House <b>{house.name}</b> gets back{" "}
            <b>{data.powerToken}</b> Power&nbsp;token
            {data.powerToken != 1 ? "s" : ""}.
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
              <b>Skinchanger Scout</b>: House <b>{house.name}</b> lost all of
              their Power&nbsp;tokens, all other houses lost 2
              Power&nbsp;tokens.
            </p>
            <ul>
              {powerTokensLost.map(([house, amount]) => (
                <li key={`skinchanger-scout_${house.id}_${amount}`}>
                  House <b>{house.name}</b> lost <b>{amount}</b>{" "}
                  Power&nbsp;token{amount != 1 ? "s" : ""}.
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
            <b>Rattleshirt&apos;s Raiders</b>: House <b>{house.name}</b> gained
            one level of supply, and is now at <b>{data.newSupply}</b>.
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
            <b>Rattleshirt&apos;s Raiders</b>: House <b>{lowestBidder.name}</b>{" "}
            lost 2 levels of supply, all other houses lost 1 levels of supply.
            <ul>
              {newSupply.map(([house, supply]) => (
                <li key={`rattleshirts-raiders_${house.id}_${supply}`}>
                  House <b>{house.name}</b> is now at <b>{supply}</b>.
                </li>
              ))}
            </ul>
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
                House <b>{house.name}</b> gained <b>{gain}</b> Power&nbsp;token
                {gain != 1 ? "s" : ""}.
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
                House <b>{house.name}</b> suffered battle casualties because
                these units were wounded:{" "}
                <>
                  {joinReactNodes(
                    killedBecauseWounded.map((unitType, i) => (
                      <b key={`wounded_${unitType}_${i}`}>{unitType}</b>
                    )),
                    ", "
                  )}
                </>
                .
              </>
            )}
            {killedBecauseWounded.length > 0 &&
              killedBecauseCantRetreat.length > 0 && <br />}
            {killedBecauseCantRetreat.length > 0 && (
              <>
                House <b>{house.name}</b> suffered battle casualties because
                these units can&apos;t retreat:{" "}
                <>
                  {joinReactNodes(
                    killedBecauseCantRetreat.map((unitType, i) => (
                      <b key={`cant-retreat_${unitType}_${i}`}>{unitType}</b>
                    )),
                    ", "
                  )}
                </>
                .
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
            House <b>{house.name}</b> suffered battle casualties and chose these
            units to be destroyed:{" "}
            <>
              {joinReactNodes(
                killed.map((unitType, i) => (
                  <b key={`casualties_${unitType}_${i}`}>{unitType}</b>
                )),
                ", "
              )}
            </>
            .
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
            <p>Supply levels have been adjusted:</p>
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
        const newUserLabel = newUser
          ? getUserLinkOrLabel(
              this.ingame.entireGame,
              newUser,
              this.ingame.players.tryGet(newUser, null)
            )
          : null;
        const reason =
          data.reason == ReplacementReason.CLOCK_TIMEOUT
            ? " due to clock timeout"
            : data.reason == ReplacementReason.VOTE
              ? " due to vote"
              : "";

        return (
          <>
            <b>
              {getUserLinkOrLabel(
                this.ingame.entireGame,
                oldUser,
                this.ingame.players.tryGet(oldUser, null)
              )}
            </b>{" "}
            ({this.renderHouseName(house)}) was replaced by{" "}
            {newUserLabel ? <b>{newUserLabel}</b> : " a vassal"}
            {reason}.<br />
            {newCommanderHouse && (
              <>
                Until the next vassal claim phase, {this.renderHouseName(house)}{" "}
                has been randomly assigned to{" "}
                {this.renderHouseName(newCommanderHouse)}.
              </>
            )}
          </>
        );
      }
      case "vassal-replaced": {
        const user = this.ingame.entireGame.users.get(data.user);
        const house = this.game.houses.get(data.house);

        return (
          <>
            Vassal house <b>{house.name}</b> was replaced by{" "}
            <b>
              {getUserLinkOrLabel(
                this.ingame.entireGame,
                user,
                this.ingame.players.tryGet(user, null)
              )}
            </b>
            .
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
                House <b>{house.name}</b> claimed{" "}
                {joinReactNodes(
                  vassals.map((v) => (
                    <b key={`vassals-claimed_${v.id}`}>{v.name}</b>
                  )),
                  ", "
                )}{" "}
                as vassal{vassals.length > 1 && "s"}.
              </>
            ) : (
              <>
                House <b>{house.name}</b> has declined to command a vassal and
                has handed their set of vassal order tokens to the next player
                on the Iron Throne track.
              </>
            )}
          </p>
        );
      }
      case "commander-power-token-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            Commanding House <b>{house.name}</b> gained a Power&nbsp;token for
            this battle.
          </p>
        );
      }
      case "beric-dondarrion-used": {
        const house = this.game.houses.get(data.house);
        const casualty = unitTypes.get(data.casualty).name;
        return (
          <p>
            <b>Beric Dondarrion</b>: House <b>{house.name}</b> chose a{" "}
            <b>{casualty}</b> to be destroyed.
          </p>
        );
      }
      case "varys-used": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Varys</b>: House <b>{house.name}</b> is now on top of the
            Fiefdoms track.
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
            <b>{usedByHouseCard.name}</b>: House <b>{house.name}</b> randomly
            chose <b>{newHouseCard.name}</b> as{" "}
            <b>{affectedHouse.name}&apos;s</b> new House card.
          </p>
        );
      }
      case "jon-connington-used": {
        const house = this.game.houses.get(data.house);
        const region = this.game.world.regions.get(data.region);
        return (
          <p>
            <b>Jon Conningtion</b>: House <b>{house.name}</b> chose to recruit a
            Knight in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
            .
          </p>
        );
      }
      case "bronn-used": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Bronn</b>: House <b>{house.name}</b> chose to discard 2
            Power&nbsp;tokens to reduce Bron&apos;s combat strength to 0.
          </p>
        );
      }
      case "littlefinger-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Littlefinger</b>: House <b>{house.name}</b> gained{" "}
            <b>{data.powerTokens}</b> Power&nbsp;token
            {data.powerTokens != 1 ? "s" : ""}.
          </p>
        );
      }
      case "alayne-stone-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        return (
          <p>
            <b>Alayne Stone</b>: House <b>{house.name}</b> forced House{" "}
            <b>{affectedHouse.name}</b> to discard all their{" "}
            <b>{data.lostPowerTokens}</b> available Power&nbsp;token
            {data.lostPowerTokens != 1 ? "s" : ""}.
          </p>
        );
      }
      case "lysa-arryn-ffc-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Lysa Arryn</b>: House <b>{house.name}</b> gained{" "}
            <b>{data.powerTokens}</b> Power&nbsp;token
            {data.powerTokens != 1 ? "s" : ""}.
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
              <b>Anya Waynwood</b>:
            </p>
            <ul>
              {gains.map(([house, gain]) => (
                <li key={`anya-waynwood_${house.id}_${gain}`}>
                  House <b>{house.name}</b> gained <b>{gain}</b>{" "}
                  Power&nbsp;token{gain != 1 ? "s" : ""}.
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
            <b>Robert Arryn</b>: House <b>{house.name}</b> decided to remove{" "}
            <b>Robert Arryn</b>{" "}
            {removedHouseCard && (
              <>
                and <b>{removedHouseCard.name}</b> of{" "}
                <b>{affectedHouse.name}</b>{" "}
              </>
            )}
            from the game.
          </p>
        );
      }
      case "house-card-removed-from-game": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <b>{houseCard.name}</b> of House <b>{house.name}</b> was removed
            from the game.
          </p>
        );
      }
      case "viserys-targaryen-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <b>Viserys Targaryen</b>: House <b>{house.name}</b> decided to add
            the strength <b>{houseCard.combatStrength}</b> from{" "}
            <b>{houseCard.name}</b>.
          </p>
        );
      }
      case "illyrio-mopatis-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <b>Illyrio Mopatis</b>: House <b>{house.name}</b> gained{" "}
            <b>{powerTokensGained}</b> Power&nbsp;token
            {powerTokensGained != 1 ? "s" : ""}.
          </p>
        );
      }
      case "daenerys-targaryen-b-power-tokens-discarded": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <b>Daenerys Targaryen</b>: House <b>{house.name}</b> forced House{" "}
            <b>{affectedHouse.name}</b> to discard{" "}
            <b>{data.powerTokensDiscarded}</b> Power&nbsp;token
            {data.powerTokensDiscarded != 1 ? "s" : ""}.
          </p>
        );
      }
      case "missandei-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <b>Missandei</b>: House <b>{house.name}</b> decided to return{" "}
            <b>{houseCard.name}</b> to hand.
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
              House <b>{house.name}</b> gifted <b>{data.powerTokens}</b>{" "}
              Power&nbsp;token{data.powerTokens != 1 ? "s" : ""} to House{" "}
              <b>{affectedHouse.name}</b>.
            </Col>
          </Row>
        );
      }
      case "influence-track-position-chosen": {
        const house = this.game.houses.get(data.house);
        const track = this.game.getNameInfluenceTrack(data.trackerI);
        return (
          <p>
            House <b>{house.name}</b> has chosen position <b>{data.position}</b>{" "}
            on <b>{track} Track</b>.
          </p>
        );
      }
      case "ties-decided": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            House <b>{house.name}</b> has decided ties.
          </p>
        );
      }
      case "place-loyalty-choice": {
        const house = this.game.houses.get(data.house);
        const verb =
          data.discardedPowerTokens == 0
            ? "place no loyalty\xa0token"
            : data.discardedPowerTokens == 1
              ? `place ${data.loyaltyTokenCount > 1 ? "loyalty\xa0tokens" : "a loyalty\xa0token"}`
              : null;
        return (
          <p>
            House <b>{house.name}</b> decided to discard{" "}
            <b>{data.discardedPowerTokens}</b> Power&nbsp;token
            {data.discardedPowerTokens != 1 && "s"}
            {verb && ` and ${verb}`}.
          </p>
        );
      }
      case "loyalty-token-placed": {
        const region = this.world.regions.get(data.region);
        return (
          <p>
            A loyalty&nbsp;token has been placed in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "loyalty-token-gained": {
        const region = this.world.regions.get(data.region);
        return (
          <p>
            House <b>{this.game.targaryen?.name ?? "Targaryen"}</b> gained{" "}
            {data.count} Loyalty&nbsp;token{data.count != 1 ? "s" : ""} in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "fire-made-flesh-choice": {
        const house = this.game.houses.get(data.house);

        if (data.ignored) {
          return (
            <p>
              <b>Fire Made Flesh</b>: House <b>{house.name}</b> decided to do
              nothing.
            </p>
          );
        } else if (data.dragonKilledInRegion) {
          const region = this.world.regions.get(data.dragonKilledInRegion);
          return (
            <p>
              <b>Fire Made Flesh</b>: House <b>{house.name}</b> decided to
              destroy a dragon in{" "}
              <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
            </p>
          );
        } else if (data.removedDragonStrengthToken) {
          return (
            <p>
              <b>Fire Made Flesh</b>: House <b>{house.name}</b> decided to
              remove the dragon strength token from round{" "}
              {data.removedDragonStrengthToken}.
            </p>
          );
        } else if (data.regainedDragonRegion) {
          const region = this.world.regions.get(data.regainedDragonRegion);
          return (
            <p>
              <b>Fire Made Flesh</b>: House <b>{house.name}</b> decided to place
              a dragon in{" "}
              <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
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
            <b>Playing with Fire</b>: House <b>{house.name}</b> chose to place a{" "}
            <b>{unitType.name}</b> in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "the-long-plan-choice": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <b>The Long Plan</b>: House <b>{house.name}</b> chose House{" "}
            <b>{affectedHouse.name}</b> to place 2 loyalty&nbsp;tokens.
          </p>
        );
      }
      case "move-loyalty-token-choice": {
        const house = this.game.houses.get(data.house);

        if (data.powerTokensDiscardedToCancelMovement == 0) {
          return (
            <p>
              House <b>{house.name}</b> chose not to cancel the previous
              movement.
            </p>
          );
        } else if (
          data.powerTokensDiscardedToCancelMovement &&
          data.powerTokensDiscardedToCancelMovement > 0
        ) {
          return (
            <p>
              House <b>{house.name}</b> discarded{" "}
              <b>{data.powerTokensDiscardedToCancelMovement}</b>{" "}
              Power&nbsp;token
              {data.powerTokensDiscardedToCancelMovement != 1 ? "s" : ""} to
              cancel the previous movement.
            </p>
          );
        } else if (data.regionFrom && data.regionTo) {
          const regionFrom = this.world.regions.get(data.regionFrom);
          const regionTo = this.world.regions.get(data.regionTo);

          return (
            <p>
              House <b>{house.name}</b> moved a loyalty&nbsp;token from{" "}
              <b>{this.fogOfWar ? fogOfWarPlaceholder : regionFrom.name}</b> to{" "}
              <b>{this.fogOfWar ? fogOfWarPlaceholder : regionTo.name}</b>.
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
              House <b>{house.name}</b> resolved an <b>Iron&nbsp;Bank</b> order
              in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b> and
              paid <b>{data.paid}</b> Power&nbsp;token
              {data.paid != 1 ? "s" : ""} for
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
            House <b>{house.name}</b> removed their <b>{orderType.name}</b>{" "}
            order in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        ) : (
          <p>
            A <b>{orderType.name}</b> order has been removed from{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "interest-paid": {
        const house = this.game.houses.get(data.house);
        const debt = data.cost + data.paid;
        return (
          <p>
            House <b>{house.name}</b> paid an interest of{" "}
            <b>{Math.abs(data.paid)}</b> Power token
            {Math.abs(data.paid) != 1 ? "s" : ""} to the Iron&nbsp;Bank.
            {debt > 0 ? (
              <>
                &nbsp;<b>{debt}</b> interest debt could not be paid.
              </>
            ) : (
              ""
            )}
          </p>
        );
      }
      case "debt-paid": {
        const house = this.game.houses.get(data.house);
        const resolver = this.game.houses.get(data.resolver);
        const units = data.units.map(([rid, utids]) => [
          this.world.regions.get(rid),
          utids.map((utid) => unitTypes.get(utid)),
        ]) as [Region, UnitType[]][];

        return (
          <p>
            <b>Debts to the Iron&nbsp;Bank</b>:{" "}
            {units.length > 0 ? (
              <>
                House <b>{resolver.name}</b> chose to destroy{" "}
                {joinReactNodes(
                  units.map(([region, unitTypes]) => (
                    <span key={`pay-debt_${region.id}_${house.id}`}>
                      {joinReactNodes(
                        unitTypes.map((ut, i) => (
                          <b key={`pay-debt_${ut.id}_${i}`}>{ut.name}</b>
                        )),
                        ", "
                      )}{" "}
                      in{" "}
                      <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                    </span>
                  )),
                  ", "
                )}{" "}
                of House <b>{house.name}</b>.
              </>
            ) : (
              <>
                House <b>{house.name} </b> had no units to destroy.
              </>
            )}
          </p>
        );
      }
      case "customs-officer-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Customs Officer</b>: House <b>{house.name}</b> gained{" "}
            <b>{data.gained}</b> Power&nbsp;token{data.gained != 1 ? "s" : ""}.
          </p>
        );
      }
      case "sellswords-placed": {
        const house = this.game.houses.get(data.house);
        const placedSellswords = data.units.map(
          ([regionId, units]) =>
            [
              this.world.regions.get(regionId),
              units.map((ut) => unitTypes.get(ut)),
            ] as [Region, UnitType[]]
        );
        const loan = loanCardTypes.get(data.loanType);
        return (
          <p>
            <b>{loan.name}</b>: House <b>{house.name}</b>
            {placedSellswords.length > 0 ? (
              <>
                {" "}
                chose to place{" "}
                {joinReactNodes(
                  placedSellswords.map(([region, unitTypes]) => (
                    <span key={`place-sellsword_${region.id}`}>
                      {joinReactNodes(
                        unitTypes.map((ut, i) => (
                          <b key={`place-sellsword_${region.id}_${ut.id}_${i}`}>
                            {ut.name}
                          </b>
                        )),
                        ", "
                      )}{" "}
                      in{" "}
                      <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
                    </span>
                  )),
                  " and "
                )}
                .
              </>
            ) : (
              <> placed no sellswords.</>
            )}
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
          unitType: unitTypes.get(unitInfo.unitTypeId),
        }));
        return (
          <p>
            <b>The Faceless Men</b>: House <b>{house.name}</b> chose{" "}
            {destroyedUnits.length > 0 ? (
              <>
                to destroy{" "}
                {joinReactNodes(
                  destroyedUnits.map((unitInfo) => (
                    <span
                      key={`the-faceless-men_${unitInfo.region.id}_${unitInfo.unitType.id}`}
                    >
                      a <b>{unitInfo.unitType.name}</b> of{" "}
                      <b>{unitInfo.house?.name ?? "Unknown"}</b> in{" "}
                      <b>{unitInfo.region.name}</b>
                    </span>
                  )),
                  " and "
                )}
                .
              </>
            ) : (
              <>not to destroy any units.</>
            )}
          </p>
        );
      }
      case "pyromancer-executed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <b>Pyromancer</b>: House <b>{house.name}</b> chose to degrade{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b> and place
            a <b>{data.upgradeType}</b> there.
          </p>
        );
      }
      case "expert-artificer-executed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <b>Expert Artificer</b>: House <b>{house.name}</b> chose to place a{" "}
            <b>Crown</b> in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b> and
            gained <b>{data.gainedPowerTokens}</b> Power token
            {data.gainedPowerTokens != 1 ? "s" : ""}.
          </p>
        );
      }
      case "loyal-maester-executed": {
        const house = this.game.houses.get(data.house);
        const regions = data.regions.map((rid) => this.world.regions.get(rid));
        return (
          <p>
            <b>Loyal Maester</b>: House <b>{house.name}</b> chose to place a{" "}
            <b>Barrel</b> in{" "}
            {joinReactNodes(
              regions.map((r) => (
                <b key={`loyal_maester_${r.id}`}>
                  {this.fogOfWar ? fogOfWarPlaceholder : r.name}
                </b>
              )),
              " and in "
            )}
            .
          </p>
        );
      }
      case "master-at-arms-executed": {
        const house = this.game.houses.get(data.house);
        const regions = data.regions.map((rid) => this.world.regions.get(rid));
        return (
          <p>
            <b>Master-at-Arms</b>: House <b>{house.name}</b> chose to upgrade
            the castles in{" "}
            {joinReactNodes(
              regions.map((r) => (
                <b key={`master-at-arms_${r.id}`}>
                  {this.fogOfWar ? fogOfWarPlaceholder : r.name}
                </b>
              )),
              " and in "
            )}
            .
          </p>
        );
      }
      case "savvy-steward-executed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        return (
          <p>
            <b>Savvy Steward</b>: House <b>{house.name}</b> chose to place a{" "}
            <b>Barrel</b> in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>. Their
            new supply level is <b>{data.newSupply}</b>.
          </p>
        );
      }
      case "spymaster-executed": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            <b>Spymaster</b>: House <b>{house.name}</b> chose Westeros deck{" "}
            <b>{data.westerosDeckI + 1}</b> and put{" "}
            <b>{data.westerosCardsCountForTopOfDeck}</b> card
            {data.westerosCardsCountForTopOfDeck != 1 ? "s" : ""} on top of the
            deck and <b>{data.westerosCardsCountForBottomOfDeck}</b> card
            {data.westerosCardsCountForBottomOfDeck != 1 ? "s" : ""} to the
            bottom of the deck.
          </p>
        );
      }
      case "objectives-chosen": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b> has chosen their 3 objectives.
          </p>
        );
      }
      case "new-objective-card-drawn": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b> drew a new Objective card.
          </p>
        );
      }
      case "special-objective-scored": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b>{" "}
            {data.scored ? (
              <>
                scored their Special Objective and now has a total of{" "}
                <b>{data.newTotal}</b> victory points
              </>
            ) : (
              <>did not score their Special Objective</>
            )}
            .
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
              House <b>{house.name}</b> scored <b>{objective.name}</b>, awarded{" "}
              <b>{data.victoryPoints}</b>&nbsp;victory&nbsp;point
              {data.victoryPoints != 1 ? "s" : ""} and now has a total of{" "}
              <b>{data.newTotal}</b>&nbsp;victory&nbsp;points.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ObjectiveCardComponent objectiveCard={objective} size="small" />
            </div>
          </>
        ) : (
          <>
            House <b>{house.name}</b> did not score an Objective card.
          </>
        );
      }
      case "ironborn-raid": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Ironborn Raid</b>: House <b>{house.name}</b> was reduced one
            position on the Victory track and now has a total of{" "}
            <b>{data.newTotal}</b> victory points.
          </p>
        );
      }
      case "shifting-ambitions-objective-chosen-from-hand": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Shifting Ambitions</b>: House <b>{house.name}</b> put one
            Objective card to the pool.
          </p>
        );
      }
      case "shifting-ambitions-objective-chosen-from-pool": {
        const house = this.game.houses.get(data.house);
        const objective = objectiveCards.get(data.objectiveCard);

        return (
          <>
            <p>
              <b>Shifting Ambitions</b>: House <b>{house.name}</b> choose{" "}
              <b>{objective.name}</b> from the Objective card pool.
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
            <b>New Information</b>: House <b>{house.name}</b> chose one
            Objective card in their hand and shuffled it back into the objective
            deck.
          </p>
        );
      }
      case "reveal-all-objectives": {
        const objectivesOfHouses = data.objectivesOfHouses.map(
          ([hid, ocids]) =>
            [
              this.game.houses.get(hid),
              ocids.map((ocid) => objectiveCards.get(ocid)),
            ] as [House, ObjectiveCard[]]
        );

        return objectivesOfHouses.map(([house, objectives]) => (
          <Col xs={12} key={`objectives-of-house_${house.id}`}>
            <Col xs={12} className="text-center">
              Remaining Objectives of House <b>{house.name}</b>.
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
            A <b>garrison token</b> with strength <b>{data.strength}</b> was{" "}
            <b>removed</b> from{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "garrison-returned": {
        const region = this.world.regions.get(data.region);

        return (
          <p>
            A <b>garrison token</b> with strength <b>{data.strength}</b> was{" "}
            <b>returned</b> to{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "objective-deck-empty": {
        const house = this.game.houses.get(data.house);

        return (
          <p>
            House <b>{house.name}</b> was not able to draw a new Objective card
            because the deck is empty.
          </p>
        );
      }
      case "orders-revealed": {
        if (data.onlySnapshot) return null;
        return (
          <p id={`gamelog-orders-revealed-round-${currentRound}`}>
            Orders were revealed.
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
            House <b>{house.name}</b> took back their discarded House cards (
            {joinReactNodes(
              returnedHouseCards.map((hc) => (
                <b key={`house-cards-returned_${hc.id}`}>{hc.name}</b>
              )),
              ", "
            )}
            ).
            {houseCardDiscarded ? (
              <>
                <br />
                <b>{houseCardDiscarded.name}</b> was played as the last card and
                remains discarded.
              </>
            ) : (
              <></>
            )}
          </p>
        );
      }
      case "balon-greyjoy-asos-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        const powerTokensGained = data.powerTokensGained;

        return (
          <p>
            <b>Balon Greyjoy</b>: House <b>{house.name}</b> gained{" "}
            <b>{powerTokensGained}</b> Power&nbsp;token
            {powerTokensGained != 1 ? "s" : ""}.
          </p>
        );
      }
      case "mace-tyrell-asos-order-placed": {
        const house = this.game.houses.get(data.house);
        const region = this.world.regions.get(data.region);
        const order = orders.get(data.order);

        return (
          <p>
            <b>Mace Tyrell</b>: House <b>{house.name}</b> decided to place a{" "}
            <b>{order.type.name}</b> order in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "bran-stark-used": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);
        return (
          <p>
            <b>Bran Stark</b>: House <b>{house.name}</b> decided to return{" "}
            <b>{houseCard.name}</b> to hand.
          </p>
        );
      }
      case "cersei-lannister-asos-power-tokens-discarded": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <b>Cersei Lannister</b>: House <b>{house.name}</b> forced House{" "}
            <b>{affectedHouse.name}</b> to discard{" "}
            <b>{data.powerTokensDiscarded}</b> Power&nbsp;token
            {data.powerTokensDiscarded != 1 ? "s" : ""}.
          </p>
        );
      }
      case "doran-martell-asos-used": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);

        return (
          <p>
            <b>Doran Martell</b>: House <b>{house.name}</b> moved House{" "}
            <b>{affectedHouse.name}</b> to the bottom of the <b>Fiefdoms</b>{" "}
            track.
          </p>
        );
      }
      case "melisandre-of-asshai-power-tokens-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Melisandre of Asshai</b>: House <b>{house.name}</b> gained{" "}
            <b>{data.powerTokens}</b> Power&nbsp;token
            {data.powerTokens != 1 ? "s" : ""}.
          </p>
        );
      }
      case "salladhar-saan-asos-power-tokens-changed": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        return (
          <p>
            <b>Salladhar Saan</b>: House <b>{house.name}</b> gained{" "}
            <b>{data.powerTokensGained}</b> Power&nbsp;token
            {data.powerTokensGained != 1 ? "s" : ""}. House{" "}
            <b>{affectedHouse.name}</b> lost <b>{data.powerTokensLost}</b>{" "}
            Power&nbsp;token{data.powerTokensLost != 1 ? "s" : ""}.
          </p>
        );
      }
      case "ser-davos-seaworth-asos-fortification-gained": {
        const house = this.game.houses.get(data.house);
        return (
          <p>
            <b>Ser Davos Seaworth</b>: House <b>{house.name}</b> has spent{" "}
            <b>2</b> Power&nbsp;tokens and gained 1 Fortification Icon.
          </p>
        );
      }
      case "casualties-prevented": {
        const house = this.game.houses.get(data.house);
        const houseCard = this.allHouseCards.get(data.houseCard);

        return (
          <p>
            <b>{houseCard.name}</b> prevented casualties of House{" "}
            <b>{house.name}</b>.
          </p>
        );
      }
      case "ser-ilyn-payne-asos-casualty-suffered": {
        const house = this.game.houses.get(data.house);
        const affectedHouse = this.game.houses.get(data.affectedHouse);
        const unitType = unitTypes.get(data.unit);

        return (
          <p>
            <b>Ser Ilyn Payne</b>: House <b>{house.name}</b> forced House{" "}
            <b>{affectedHouse.name}</b> to lose a casualty. House{" "}
            <b>{affectedHouse.name}</b> chose a <b>{unitType.name}</b>.
          </p>
        );
      }
      case "stannis-baratheon-asos-used": {
        const house = this.game.houses.get(data.house);
        const oldThroneOwner = this.game.houses.get(data.oldThroneOwner);

        return (
          <p>
            <b>Stannis Baratheon</b>: House <b>{house.name}</b> has stolen the
            Iron Throne dominance token from House <b>{oldThroneOwner.name}</b>.
          </p>
        );
      }
      case "aeron-damphair-house-card-changed": {
        const house = this.game.houses.get(data.house);
        const newHouseCard = this.allHouseCards.get(data.newHouseCard);

        return (
          <p>
            <b>Aeron Damphair</b>: House <b>{house.name}</b> chose to discard{" "}
            <b>2</b> Power tokens to use <b>{newHouseCard.name}</b> as their new
            House card
            {data.reducedCombatStrength ? (
              <>
                {" "}
                at the cost of <b>-1</b> combat strength
              </>
            ) : (
              ""
            )}
            .
          </p>
        );
      }
      case "control-power-token-removed": {
        const region = this.world.regions.get(data.regionId);
        const house = this.game.houses.get(data.houseId);

        return (
          <p>
            A <b>Power token</b> of House <b>{house.name}</b> was removed from{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
          </p>
        );
      }
      case "game-paused": {
        return <p>The game was paused by vote.</p>;
      }
      case "game-resumed": {
        return (
          <p>
            The game was{" "}
            {data.autoResumed ? "automatically resumed" : "resumed by vote"}.
            Pause time: {secondsToString(data.pauseTimeInSeconds, true)}
          </p>
        );
      }
      case "support-attack-against-neutral-force": {
        const region = this.world.regions.get(data.region);
        const house = this.game.houses.get(data.house);
        const supporter = this.game.houses.get(data.supporter);

        return (
          <p>
            House <b>{supporter.name}</b>{" "}
            {data.refused ? (
              <>
                refused to grant support to House <b>{house.name}</b>
              </>
            ) : (
              <>
                would support House <b>{house.name}</b>
              </>
            )}{" "}
            to attack the Neutral Force in{" "}
            <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>.
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
        const newUserLabel = getUserLinkOrLabel(
          this.ingame.entireGame,
          swappingUser,
          this.ingame.players.tryGet(swappingUser, null)
        );

        return (
          <>
            <b>
              {getUserLinkOrLabel(
                this.ingame.entireGame,
                initiator,
                this.ingame.players.tryGet(initiator, null)
              )}
            </b>{" "}
            (House <b>{initiatorHouse.name}</b>) swapped houses with{" "}
            {<b>{newUserLabel}</b>} (House <b>{swappingHouse.name}</b>).
          </>
        );
      }
      case "westeros-deck-4-skipped": {
        const westerosCardType = westerosCardTypes.get(data.westerosCardType);
        return (
          <>
            The execution of the Westeros card <b>{westerosCardType.name}</b>{" "}
            was skipped because House <b>Targaryen</b> is <b>{data.reason}</b>.
          </>
        );
      }
      case "no-loyalty-token-available": {
        const region = this.world.regions.get(data.region);

        return (
          <p>
            There was no further loyalty token available that could have been
            placed in <b>{this.fogOfWar ? fogOfWarPlaceholder : region.name}</b>
            .
          </p>
        );
      }
      case "last-land-unit-transformed-to-dragon": {
        const house = this.game.houses.get(data.house);
        const unitType = unitTypes.get(data.transformedUnitType);
        const region = this.world.regions.get(data.region);

        return (
          <>
            <b>Dragon revenge</b>: The last <b>{unitType.name}</b> of House{" "}
            <b>{house.name}</b> has been transformed into a <b>Dragon</b> in{" "}
            <b>{region.name}</b>.
          </>
        );
      }
      case "live-pbem-switch": {
        return (
          <p>
            <h5 className="text-center">Game type has been changed</h5>
            <div className="text-center">
              It is now <b>{data.isNowPbem ? "PBEM" : "Live"}</b>.
            </div>
          </p>
        );
        break;
      }
    }
  }

  renderHouseName(house: House): ReactNode {
    return (
      <>
        House <b style={{ color: house.color }}>{house.name}</b>
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
    if (this.props.currentlyViewed) {
      this.debounceSendGameLogSeen(timeToTicks(new Date()));
    }

    if (
      this.props.gameClient.authenticatedUser &&
      prevProps.currentlyViewed == true &&
      !this.props.currentlyViewed
    ) {
      this.logManager.lastSeenLogTimes.set(
        this.props.gameClient.authenticatedUser,
        timeToTicks(new Date())
      );
    }
  }

  componentDidMount(): void {
    if (this.props.currentlyViewed) {
      this.logManager.sendGameLogSeen(timeToTicks(new Date()));
    }
  }
}
