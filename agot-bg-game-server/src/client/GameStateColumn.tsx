import React, { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";

import {
  Col,
  Row,
  Card,
  ListGroup,
  ListGroupItem,
  OverlayTrigger,
  Tooltip,
  Spinner,
  Popover,
} from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";

import { MAX_WILDLING_STRENGTH } from "../common/ingame-game-state/game-data-structure/Game";

import classNames from "classnames";
import * as _ from "lodash";

import BetterMap from "../utils/BetterMap";
import PartialRecursive from "../utils/PartialRecursive";

import ConditionalWrap from "./utils/ConditionalWrap";
import renderChildGameState from "./utils/renderChildGameState";
import joinNaturalLanguage from "./utils/joinNaturalLanguage";

import IngameGameState from "../common/ingame-game-state/IngameGameState";
import GameClient from "./GameClient";
import MapControls, { RegionOnMapProperties } from "./MapControls";
import WildlingCardType from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import Region from "../common/ingame-game-state/game-data-structure/Region";

import WesterosGameState from "../common/ingame-game-state/westeros-game-state/WesterosGameState";
import PlanningGameState from "../common/ingame-game-state/planning-game-state/PlanningGameState";
import ActionGameState from "../common/ingame-game-state/action-game-state/ActionGameState";
import DraftGameState from "../common/ingame-game-state/draft-game-state/DraftGameState";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import PayDebtsGameState from "../common/ingame-game-state/pay-debts-game-state/PayDebtsGameState";
import ChooseInitialObjectivesGameState from "../common/ingame-game-state/choose-initial-objectives-game-state/ChooseInitialObjectivesGameState";

import GameTabsComponent from "./GameTabsComponent";
import ColumnSwapButton from "./game-state-panel/utils/ColumnSwapButton";

import WesterosGameStateComponent from "./game-state-panel/WesterosGameStateComponent";
import PlanningComponent from "./game-state-panel/PlanningComponent";
import ActionComponent from "./game-state-panel/ActionComponent";
import DraftComponent from "./game-state-panel/DraftComponent";
import GameEndedComponent from "./game-state-panel/GameEndedComponent";
import IngameCancelledComponent from "./game-state-panel/IngameCancelledComponent";
import PayDebtsComponent from "./game-state-panel/PayDebtsComponent";
import ChooseInitialObjectivesComponent from "./game-state-panel/ChooseInitialObjectivesComponent";
import WesterosCardComponent from "./game-state-panel/utils/WesterosCardComponent";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";

import hourglassImage from "../../public/images/icons/hourglass.svg";
import mammothImage from "../../public/images/icons/mammoth.svg";
import spikedDragonHeadImage from "../../public/images/icons/spiked-dragon-head.svg";
import ClaimVassalsGameState from "../common/ingame-game-state/planning-game-state/claim-vassals-game-state/ClaimVassalsGameState";
import ClaimVassalsComponent from "./game-state-panel/ClaimVassalsComponent";

interface GameStateColumnProps {
  ingame: IngameGameState;
  gameClient: GameClient;
  mapControls: MapControls;
  onColumnSwapClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

@observer
export default class GameStateColumn extends Component<GameStateColumnProps> {
  @observable highlightedRegions = new BetterMap<
    Region,
    RegionOnMapProperties
  >();

  modifyRegionsOnMapCallback: any;

  private ingame = this.props.ingame;
  private game = this.ingame.game;
  private gameClient = this.props.gameClient;
  private mapControls = this.props.mapControls;
  private gameSettings = this.ingame.entireGame.gameSettings;
  private authenticatedPlayer = this.gameClient.authenticatedPlayer;

  render(): ReactNode {
    const phases = [
      {
        name: "Westeros",
        gameState: WesterosGameState,
        component: WesterosGameStateComponent,
      },
      {
        name: "Planning",
        gameState: PlanningGameState,
        component: PlanningComponent,
      },
      {
        name: "Action",
        gameState: ActionGameState,
        component: ActionComponent,
      },
    ];

    const gameRunning = !this.ingame.isEndedOrCancelled;
    const roundWarning =
      gameRunning && this.ingame.game.maxTurns - this.ingame.game.turn == 1;
    const roundCritical =
      gameRunning && this.ingame.game.turn == this.ingame.game.maxTurns;

    const wildlingsWarning =
      gameRunning &&
      this.ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH - 4;
    const wildlingsCritical =
      gameRunning &&
      (this.ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH ||
        this.ingame.game.wildlingStrength == MAX_WILDLING_STRENGTH - 2);

    const knowsWildlingCard =
      this.authenticatedPlayer != null &&
      this.authenticatedPlayer.house.knowsNextWildlingCard;
    const nextWildlingCard = this.game.wildlingDeck.find(
      (c) => c.id == this.game.clientNextWildlingCardId,
    );

    let isOwnTurn = false;
    try {
      isOwnTurn = this.gameClient.isOwnTurn();
    } catch (e) {
      // Ignore getControllerOfHouse errors that can occur
      // after vassal to player replacement
      if (
        e instanceof Error &&
        e.message.includes("failed as there is no suzerainHouse")
      ) {
        console.warn(e.message);
        isOwnTurn = false;
      } else {
        throw e;
      }
    }
    const border = isOwnTurn
      ? "warning"
      : this.ingame.childGameState instanceof CancelledGameState
        ? "danger"
        : undefined;

    const isPhaseActive = (phase: any): boolean =>
      this.ingame.childGameState instanceof phase.gameState;

    return (
      <div className="flex-ratio-container">
        <Card
          key={`leaf-state-${this.props.ingame.entireGame.leafStateId}`}
          id="game-state-panel"
          className="flex-sized-to-content mb-2"
          border={border}
          style={{
            maxHeight: "65%",
            paddingRight: "2px",
            borderWidth: "3px",
            overflowY: "scroll",
          }}
        >
          <Row className="no-space-around">
            <Col>
              <ListGroup variant="flush">
                {phases.some((phase) => isPhaseActive(phase)) && (
                  <ListGroupItem>
                    <Row className="justify-content-between align-items-center">
                      <Col
                        xs="auto"
                        key={phases[0].name + "_phase"}
                        className="px-1"
                      >
                        <OverlayTrigger
                          overlay={this.renderRemainingWesterosCards()}
                          trigger="click"
                          placement="bottom-start"
                          rootClose
                        >
                          <div
                            className={classNames(
                              "clickable btn btn-sm btn-secondary dropdown-toggle",
                              {
                                "weak-box-outline": isPhaseActive(phases[0]),
                                "text-muted": !isPhaseActive(phases[0]),
                              },
                            )}
                          >
                            <ConditionalWrap
                              condition={isPhaseActive(phases[0])}
                              wrap={(child) => <b>{child}</b>}
                            >
                              <>{phases[0].name} phase</>
                            </ConditionalWrap>
                          </div>
                        </OverlayTrigger>
                      </Col>
                      {_.drop(phases).map((phase) => (
                        <Col
                          xs="auto"
                          key={`${phase.name}_phase`}
                          className="px-1"
                        >
                          <div
                            className={classNames({
                              "p-1": true,
                              "weak-box-outline": isPhaseActive(phase),
                              "text-muted": !isPhaseActive(phase),
                            })}
                          >
                            <ConditionalWrap
                              condition={isPhaseActive(phase)}
                              wrap={(child) => <b>{child}</b>}
                            >
                              <>{phase.name} phase</>
                            </ConditionalWrap>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </ListGroupItem>
                )}
                <ListGroupItem className="text-large">
                  {renderChildGameState(
                    {
                      mapControls: this.mapControls,
                      gameClient: this.gameClient,
                      gameState: this.ingame,
                    },
                    _.concat(
                      phases.map(
                        (phase) =>
                          [phase.gameState, phase.component] as [
                            any,
                            typeof Component,
                          ],
                      ),
                      [[DraftGameState, DraftComponent]],
                      [[GameEndedGameState, GameEndedComponent]],
                      [[CancelledGameState, IngameCancelledComponent]],
                      [[PayDebtsGameState, PayDebtsComponent]],
                      [[ClaimVassalsGameState, ClaimVassalsComponent]],
                      [
                        [
                          ChooseInitialObjectivesGameState,
                          ChooseInitialObjectivesComponent,
                        ],
                      ],
                    ),
                  )}
                </ListGroupItem>
              </ListGroup>
            </Col>
            <Col xs="auto" className="mx-1 px-0">
              <Col
                style={{ width: "28px", fontSize: "1.375rem" }}
                className="px-0 text-center"
              >
                <Row
                  className="mb-3 mx-0"
                  onMouseEnter={() => this.highlightRegionsOfHouses()}
                  onMouseLeave={() => this.highlightedRegions.clear()}
                >
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="round-tooltip">
                        <h5>
                          Round {this.game.turn} / {this.game.maxTurns}
                        </h5>
                      </Tooltip>
                    }
                    placement="auto"
                  >
                    <div>
                      <img
                        className={classNames(
                          { "dye-warning": roundWarning },
                          { "dye-critical": roundCritical },
                        )}
                        src={hourglassImage}
                        width={28}
                      />
                      <div
                        style={{
                          color: roundWarning
                            ? "#F39C12"
                            : roundCritical
                              ? "#FF0000"
                              : undefined,
                        }}
                      >
                        {this.game.turn}
                      </div>
                    </div>
                  </OverlayTrigger>
                </Row>
                <Row className="mr-0">
                  <div>
                    <OverlayTrigger
                      overlay={this.renderWildlingDeckPopover(
                        knowsWildlingCard,
                        nextWildlingCard?.type,
                      )}
                      trigger="click"
                      placement="auto"
                      rootClose
                    >
                      <div
                        className={classNames(
                          "clickable btn btn-sm btn-secondary p-1",
                          { "weak-box-outline": knowsWildlingCard },
                        )}
                      >
                        <img
                          src={mammothImage}
                          width={28}
                          className={classNames(
                            { "dye-warning": wildlingsWarning },
                            { "dye-critical": wildlingsCritical },
                          )}
                        />
                      </div>
                    </OverlayTrigger>
                    <div
                      className={classNames({
                        "txt-warning": wildlingsWarning,
                        "txt-critical": wildlingsCritical,
                      })}
                    >
                      {this.game.wildlingStrength}
                    </div>
                  </div>
                </Row>
                {this.game.dragonStrengthTokens.length > 0 && (
                  <Row
                    className="mx-0 mt-3"
                    onMouseEnter={() => this.highlightRegionsWithDragons()}
                    onMouseLeave={() => this.highlightedRegions.clear()}
                  >
                    <OverlayTrigger
                      overlay={this.renderDragonStrengthTooltip()}
                      placement="auto"
                    >
                      <div>
                        <img src={spikedDragonHeadImage} width={28} />
                        <div>{this.game.currentDragonStrength}</div>
                      </div>
                    </OverlayTrigger>
                  </Row>
                )}
              </Col>
            </Col>
          </Row>
          <ColumnSwapButton
            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
              this.props.onColumnSwapClick(e)
            }
          />
          {isOwnTurn && (
            <Spinner
              animation="grow"
              variant="warning"
              size="sm"
              style={{ position: "absolute", bottom: "4px", left: "4px" }}
            />
          )}
        </Card>
        <GameTabsComponent
          gameClient={this.gameClient}
          ingame={this.ingame}
          mapControls={this.mapControls}
        />
      </div>
    );
  }

  private renderRemainingWesterosCards(): OverlayChildren {
    const remainingCards = this.game.remainingWesterosCardTypes.map((deck) =>
      _.sortBy(
        deck.entries,
        (rwct) => -rwct[1],
        (rwct) => rwct[0].name,
      ),
    );
    const nextCards = this.game.nextWesterosCardTypes;

    return (
      <Popover id={"remaining-westeros-cards"} style={{ maxWidth: "100%" }}>
        <Col xs={12}>
          {this.gameSettings.cokWesterosPhase && (
            <>
              <Row className="mt-0">
                <Col>
                  <h5 className="text-center">Next Westeros Cards</h5>
                </Col>
              </Row>
              <Row>
                {nextCards.map((_, i) => (
                  <Col
                    key={"westeros-deck-" + i + "-header"}
                    className="text-center"
                  >
                    <b>Deck {i + 1}</b>
                  </Col>
                ))}
              </Row>
              <Row>
                {nextCards.map((wd, i) => (
                  <Col key={"westeros-deck-" + i + "-data"}>
                    {wd.map((wc, j) =>
                      wc ? (
                        <div
                          key={"westeros-deck-" + i + "-" + j + "-data"}
                          className="mb-1"
                        >
                          <WesterosCardComponent
                            cardType={wc}
                            westerosDeckI={i}
                            size="small"
                            tooltip
                            showTitle
                          />
                        </div>
                      ) : (
                        <div />
                      ),
                    )}
                  </Col>
                ))}
              </Row>
            </>
          )}
          <Row className={this.gameSettings.cokWesterosPhase ? "mt-4" : "mt-0"}>
            <Col>
              <h5 className="text-center">Remaining Westeros Cards</h5>
            </Col>
          </Row>
          <Row>
            {remainingCards.map((_, i) => (
              <Col
                key={"westeros-deck-" + i + "-header"}
                className="text-center"
              >
                <b>Deck {i + 1}</b>
              </Col>
            ))}
          </Row>
          <Row className="mb-2">
            {remainingCards.map((rc, i) => (
              <Col key={"westeros-deck-" + i + "-data"}>
                {rc.map(([wc, count], j) => (
                  <Row
                    key={"westeros-deck-" + i + "-" + j + "-data"}
                    className="m1 align-items-center"
                  >
                    <Col xs="auto" style={{ marginRight: "-20px" }}>
                      {count > 1 ? count : <>&nbsp;</>}
                    </Col>
                    <Col
                      className="pl-0"
                      style={{ width: "150px", maxWidth: "150px" }}
                    >
                      <WesterosCardComponent
                        cardType={wc}
                        westerosDeckI={i}
                        size="small"
                        tooltip
                        showTitle
                      />
                    </Col>
                  </Row>
                ))}
              </Col>
            ))}
          </Row>
        </Col>
      </Popover>
    );
  }

  private renderWildlingDeckPopover(
    knowsWildlingCard: boolean,
    nextWildlingCard: WildlingCardType | undefined,
  ): OverlayChildren {
    const wildlingDeck = _.sortBy(
      this.game.wildlingDeck
        .map((wc) => wc.type)
        .filter((wc) => wc != nextWildlingCard),
      (wc) => wc.name,
    );
    return (
      <Popover id="wildling-threat-tooltip">
        <Col xs={12}>
          {knowsWildlingCard && nextWildlingCard && (
            <>
              <Col xs={12} className="mt-0">
                <h5 className="text-center">Top Wilding Card</h5>
              </Col>
              <Col xs={12} className="mb-2">
                <Row className="justify-content-center">
                  <WildlingCardComponent
                    cardType={nextWildlingCard}
                    size="smedium"
                    tooltip
                  />
                </Row>
              </Col>
            </>
          )}
          <Col xs={12} className="mt-0">
            <h5 className="text-center">The Wildling Deck</h5>
          </Col>
          <Col xs={12}>
            <Row className="justify-content-center mr-0 ml-0">
              {wildlingDeck.map((wc) => (
                <Col
                  xs="auto"
                  key={`wild-deck-${wc.id}`}
                  className="justify-content-center"
                >
                  <WildlingCardComponent cardType={wc} size="small" tooltip />
                </Col>
              ))}
            </Row>
          </Col>
        </Col>
      </Popover>
    );
  }

  highlightRegionsOfHouses(): void {
    const regions = new BetterMap(
      this.ingame.world.getAllRegionsWithControllers(),
    );
    this.highlightedRegions.clear();

    regions.entries.forEach(([r, controller]) => {
      this.highlightedRegions.set(r, {
        highlight: {
          active: controller != null ? true : false,
          color: controller?.getHighlightColor() ?? "#ffffff",
          light: r.type.id == "sea",
          strong: r.type.id == "land",
        },
      });
    });
  }

  highlightRegionsWithDragons(): void {
    const regions = this.ingame.world.regions.values.filter(
      (r) =>
        r.units.size > 0 && r.units.values.some((u) => u.type.id == "dragon"),
    );
    const map = new BetterMap(regions.map((r) => [r, r.getController()]));
    this.highlightedRegions.clear();

    map.entries.forEach(([r, controller]) => {
      this.highlightedRegions.set(r, {
        highlight: {
          active: controller != null ? true : false,
          color: controller?.getHighlightColor() ?? "#ffffff",
          light: r.type.id == "sea",
          strong: r.type.id == "land",
        },
      });
    });
  }

  renderDragonStrengthTooltip(): OverlayChildren {
    const roundsWhenIncreased = this.game.dragonStrengthTokens.filter(
      (onRound) => onRound > this.game.turn,
    );
    return (
      <Tooltip id="dragon-strength-tooltip">
        <div className="m-1 text-center">
          <h5>Current Dragon Strength</h5>
          {roundsWhenIncreased.length > 0 && (
            <p>
              Will increase in round
              <br />
              {joinNaturalLanguage(roundsWhenIncreased)}
            </p>
          )}
        </div>
      </Tooltip>
    );
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    return this.highlightedRegions.entries;
  }

  componentDidMount(): void {
    this.mapControls.modifyRegionsOnMap.push(
      (this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap()),
    );
  }

  componentWillUnmount(): void {
    _.pull(
      this.mapControls.modifyRegionsOnMap,
      this.modifyRegionsOnMapCallback,
    );
  }
}
