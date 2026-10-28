import { t, Trans } from "./i18n";
import MapContribution from "./MapContribution";
import React, { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import { action, observable } from "mobx";

import {
  Col,
  Row,
  Card,
  ListGroup,
  ListGroupItem,
  OverlayTrigger,
  Tooltip,
  Spinner,
  Popover
} from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/Overlay";

import { MAX_WILDLING_STRENGTH } from "../common/ingame-game-state/game-data-structure/Game";

import classNames from "classnames";
import * as _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

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
  @observable accessor collapsed = false;

  @observable accessor highlightedRegions = new BetterMap<
    Region,
    RegionOnMapProperties
  >();

  private get ingame(): IngameGameState {
    return this.props.ingame;
  }
  private get game(): IngameGameState["game"] {
    return this.ingame.game;
  }
  private get gameClient(): GameClient {
    return this.props.gameClient;
  }
  private get mapControls(): MapControls {
    return this.props.mapControls;
  }
  private get gameSettings(): IngameGameState["entireGame"]["gameSettings"] {
    return this.ingame.entireGame.gameSettings;
  }
  private get authenticatedPlayer(): GameClient["authenticatedPlayer"] {
    return this.gameClient.authenticatedPlayer;
  }

  render(): ReactNode {
    const phases = [
      {
        name: "Westeros",
        gameState: WesterosGameState,
        component: WesterosGameStateComponent
      },
      {
        name: t("gameStateColumn.planning21cc30"),
        gameState: PlanningGameState,
        component: PlanningComponent
      },
      {
        name: t("gameStateColumn.action64cff1"),
        gameState: ActionGameState,
        component: ActionComponent
      }
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
      (c) => c.id == this.game.clientNextWildlingCardId
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
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.ingame}
          kind="hover"
          regions={this.modifyRegionsOnMap()}
        />
        <Card
          key={`leaf-state-${this.props.ingame.entireGame.leafStateId}`}
          id="game-state-panel"
          className="flex-sized-to-content mb-2"
          border={border}
          style={{
            height: this.collapsed ? 80 : undefined,
            maxHeight: this.collapsed ? 80 : "65%",
            paddingRight: "2px",
            borderWidth: "3px",
            overflowY: "scroll",
            overflowX: "hidden"
          }}
        >
          <Row id="game-state-panel-content" className="no-space-around">
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
                                "text-muted": !isPhaseActive(phases[0])
                              }
                            )}
                          >
                            <ConditionalWrap
                              condition={isPhaseActive(phases[0])}
                              wrap={(child) => <b>{child}</b>}
                            >
                              <>
                                <Trans
                                  i18nKey="gameStateColumn.phasee16825"
                                  values={{ phase: phases[0].name }}
                                />
                              </>
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
                              "text-muted": !isPhaseActive(phase)
                            })}
                          >
                            <ConditionalWrap
                              condition={isPhaseActive(phase)}
                              wrap={(child) => <b>{child}</b>}
                            >
                              <>
                                <Trans
                                  i18nKey="gameStateColumn.phasee16825"
                                  values={{ phase: phase.name }}
                                />
                              </>
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
                      gameState: this.ingame
                    },
                    _.concat(
                      phases.map(
                        (phase) =>
                          [phase.gameState, phase.component] as [
                            any,
                            typeof Component
                          ]
                      ),
                      [[DraftGameState, DraftComponent]],
                      [[GameEndedGameState, GameEndedComponent]],
                      [[CancelledGameState, IngameCancelledComponent]],
                      [[PayDebtsGameState, PayDebtsComponent]],
                      [[ClaimVassalsGameState, ClaimVassalsComponent]],
                      [
                        [
                          ChooseInitialObjectivesGameState,
                          ChooseInitialObjectivesComponent
                        ]
                      ]
                    )
                  )}
                </ListGroupItem>
              </ListGroup>
            </Col>
            <Col xs="auto" className="mx-1 px-0 py-1">
              <Col
                style={{ width: "28px", fontSize: "1.375rem" }}
                className="p-0 text-center"
              >
                <Row
                  className="mb-3 g-0"
                  onMouseEnter={() => this.highlightRegionsOfHouses()}
                  onMouseLeave={() => this.clearHighlightedRegions()}
                >
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="round-tooltip">
                        <h5>
                          <Trans
                            i18nKey="common.round"
                            values={{
                              turn: this.game.turn,
                              maxTurns: this.game.maxTurns
                            }}
                          />
                        </h5>
                      </Tooltip>
                    }
                    placement="auto"
                  >
                    <div>
                      <img
                        className={classNames(
                          { "dye-warning": roundWarning },
                          { "dye-critical": roundCritical }
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
                              : undefined
                        }}
                      >
                        {this.game.turn}
                      </div>
                    </div>
                  </OverlayTrigger>
                </Row>
                <Row className="g-0">
                  <div className="d-flex flex-column align-items-center">
                    <OverlayTrigger
                      overlay={this.renderWildlingDeckPopover(
                        knowsWildlingCard,
                        nextWildlingCard?.type
                      )}
                      trigger="click"
                      placement="auto"
                      rootClose
                    >
                      <div
                        className={classNames(
                          "clickable btn btn-sm btn-secondary p-1",
                          { "weak-box-outline": knowsWildlingCard }
                        )}
                      >
                        <img
                          src={mammothImage}
                          width={28}
                          className={classNames(
                            { "dye-warning": wildlingsWarning },
                            { "dye-critical": wildlingsCritical }
                          )}
                        />
                      </div>
                    </OverlayTrigger>
                    <div
                      className={classNames({
                        "txt-warning": wildlingsWarning,
                        "txt-critical": wildlingsCritical
                      })}
                    >
                      {this.game.wildlingStrength}
                    </div>
                  </div>
                </Row>
                {this.game.dragonStrengthTokens.length > 0 && (
                  <Row
                    className="mt-3 g-0"
                    onMouseEnter={() => this.highlightRegionsWithDragons()}
                    onMouseLeave={() => this.clearHighlightedRegions()}
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
          <button
            type="button"
            className="icon-button"
            style={{ position: "absolute", top: -4, left: 0, padding: "4px" }}
            aria-label={t(
              this.collapsed
                ? "gameStateColumn.expandPanel"
                : "gameStateColumn.collapsePanel"
            )}
            title={t(
              this.collapsed
                ? "gameStateColumn.expandPanel"
                : "gameStateColumn.collapsePanel"
            )}
            aria-expanded={!this.collapsed}
            aria-controls="game-state-panel-content"
            onClick={() => this.toggleCollapsed()}
          >
            <FontAwesomeIcon
              icon={this.collapsed ? faChevronDown : faChevronUp}
              size="2xs"
            />
          </button>
          <div style={{ position: "absolute", top: -4, left: 24 }}>
            <ColumnSwapButton onClick={this.props.onColumnSwapClick} />
          </div>
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

  @action
  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  private renderRemainingWesterosCards(): OverlayChildren {
    const remainingCards = this.game.remainingWesterosCardTypes.map((deck) =>
      _.sortBy(
        deck.entries,
        (rwct) => -rwct[1],
        (rwct) => rwct[0].name
      )
    );
    const nextCards = this.game.nextWesterosCardTypes;

    return (
      <Popover id={"remaining-westeros-cards"} style={{ maxWidth: "100%" }}>
        <Col xs={12}>
          {this.gameSettings.cokWesterosPhase && (
            <>
              <Row className="mt-0">
                <Col>
                  <h5 className="text-center">
                    {t("gameStateColumn.nextWesterosCards7700b4")}
                  </h5>
                </Col>
              </Row>
              <Row>
                {nextCards.map((_, i) => (
                  <Col
                    key={"westeros-deck-" + i + "-header"}
                    className="text-center"
                  >
                    <b>
                      <Trans
                        i18nKey="gameStateColumn.deckdede0b"
                        values={{ deckNumber: i + 1 }}
                      />
                    </b>
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
                      )
                    )}
                  </Col>
                ))}
              </Row>
            </>
          )}
          <Row className={this.gameSettings.cokWesterosPhase ? "mt-4" : "mt-0"}>
            <Col>
              <h5 className="text-center">
                {t("gameStateColumn.remainingWesterosCards47a43b")}
              </h5>
            </Col>
          </Row>
          <Row>
            {remainingCards.map((_, i) => (
              <Col
                key={"westeros-deck-" + i + "-header"}
                className="text-center"
              >
                <b>
                  <Trans
                    i18nKey="gameStateColumn.deckdede0b"
                    values={{ deckNumber: i + 1 }}
                  />
                </b>
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
                      className="ps-0"
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
    nextWildlingCard: WildlingCardType | undefined
  ): OverlayChildren {
    const wildlingDeck = _.sortBy(
      this.game.wildlingDeck
        .map((wc) => wc.type)
        .filter((wc) => wc != nextWildlingCard),
      (wc) => wc.name
    );
    return (
      <Popover id="wildling-threat-tooltip">
        <Col xs={12}>
          {knowsWildlingCard && nextWildlingCard && (
            <>
              <Col xs={12} className="mt-0">
                <h5 className="text-center">
                  {t("gameStateColumn.topWildingCard5070eb")}
                </h5>
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
            <h5 className="text-center">
              {t("gameStateColumn.theWildlingDeck090e33")}
            </h5>
          </Col>
          <Col xs={12}>
            <Row className="justify-content-center me-0 ms-0">
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

  @action
  highlightRegionsOfHouses(): void {
    const regionsWithControllers = new BetterMap(
      this.props.gameClient.allRegionsWithControllers
    );

    if (this.props.ingame.fogOfWar) {
      regionsWithControllers.keys.forEach((r) => {
        if (!this.props.gameClient.visibleRegionsSet?.has(r)) {
          regionsWithControllers.delete(r);
        }
      });
    }

    this.highlightedRegions.clear();

    regionsWithControllers.entries.forEach(([r, controller]) => {
      this.highlightedRegions.set(r, {
        highlight: {
          active: controller != null ? true : false,
          color: controller?.getHighlightColor() ?? "#ffffff",
          light: r.type.id == "sea",
          strong: r.type.id == "land"
        }
      });
    });
  }

  @action
  highlightRegionsWithDragons(): void {
    const regions = this.ingame.world.regions.values.filter(
      (r) =>
        r.units.size > 0 && r.units.values.some((u) => u.type.id == "dragon")
    );
    const map = new BetterMap(regions.map((r) => [r, r.getController()]));
    this.highlightedRegions.clear();

    map.entries.forEach(([r, controller]) => {
      this.highlightedRegions.set(r, {
        highlight: {
          active: controller != null ? true : false,
          color: controller?.getHighlightColor() ?? "#ffffff",
          light: r.type.id == "sea",
          strong: r.type.id == "land"
        }
      });
    });
  }

  renderDragonStrengthTooltip(): OverlayChildren {
    const roundsWhenIncreased = this.game.dragonStrengthTokens.filter(
      (onRound) => onRound > this.game.turn
    );
    return (
      <Tooltip id="dragon-strength-tooltip">
        <div className="m-1 text-center">
          <h5>{t("gameStateColumn.currentDragonStrengthed8478")}</h5>
          {roundsWhenIncreased.length > 0 && (
            <p>
              <Trans
                i18nKey="gameStateColumn.willIncreaseInRound7dd1c1"
                values={{ rounds: joinNaturalLanguage(roundsWhenIncreased) }}
                components={{
                  lineBreak: <br />
                }}
              />
            </p>
          )}
        </div>
      </Tooltip>
    );
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    return this.highlightedRegions.entries;
  }

  @action
  clearHighlightedRegions(): void {
    this.highlightedRegions.clear();
  }
}
