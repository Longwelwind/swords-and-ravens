import { t, Trans } from "./i18n";
import { observer } from "mobx-react";
import { runInAction } from "mobx";
import { Component, default as React, ReactNode } from "react";
import EntireGame from "../common/EntireGame";
import { GameSettings } from "../common/GameSettings";
import GameClient from "./GameClient";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IngameComponent from "./IngameComponent";
import LobbyComponent from "./LobbyComponent";
import CancelledComponent from "./CancelledComponent";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import faviconNormal from "../../public/images/favicon.ico";
import faviconAlert from "../../public/images/favicon-alert.ico";
import rollingDicesImage from "../../public/images/icons/rolling-dices.svg";
import cardExchangeImage from "../../public/images/icons/card-exchange.svg";
import trophyCupImage from "../../public/images/icons/trophy-cup.svg";
import perpetuumRandomImage from "../../public/images/icons/perpetuum-random.svg";
import { Card, FormCheck, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import SelectedRandomDraftGameState from "../common/ingame-game-state/draft-game-state/selected-random-draft-game-state/SelectedRandomDraftGameState";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faTriangleExclamation
} from "@fortawesome/free-solid-svg-icons";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import CombatGameState from "../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import { toast, ToastContainer } from "react-toastify";
import { cssTransition } from "react-toastify";
import ClockComponent from "./ClockComponent";
import { isMobile } from "react-device-detect";
import ReplayComponent from "./ReplayComponent";
import ConditionalWrap from "./utils/ConditionalWrap";
import classNames from "classnames";
import LanguageSelector from "./i18n/LanguageSelector";

const yourTurnToastAnimation = cssTransition({
  enter: "slide-in-elliptic-top-fwd",
  exit: "slide-out-elliptic-top-bck"
});

interface EntireGameComponentProps {
  gameClient: GameClient;
}

@observer
export default class EntireGameComponent extends Component<EntireGameComponentProps> {
  setIntervalId = -1;

  get entireGame(): EntireGame {
    if (!this.props.gameClient.entireGame) {
      throw new Error("EntireGame is null");
    }
    return this.props.gameClient.entireGame;
  }

  get ingame(): IngameGameState | null {
    return this.entireGame.ingameGameState;
  }

  get lobby(): LobbyGameState | null {
    return this.entireGame.lobbyGameState;
  }

  get showMapWhileDrafting(): boolean {
    return this.props.gameClient.showMapWhileDrafting;
  }

  set showMapWhileDrafting(value: boolean) {
    this.props.gameClient.showMapWhileDrafting = value;
  }

  get isGameEnded(): boolean {
    return (
      this.entireGame.leafState instanceof CancelledGameState ||
      this.entireGame.leafState instanceof GameEndedGameState
    );
  }

  get isInCombat(): boolean {
    return this.entireGame.hasChildGameState(CombatGameState);
  }

  get settings(): GameSettings {
    return this.entireGame.gameSettings;
  }

  render(): ReactNode {
    return (
      <>
        <Col
          xs={12}
          className={
            this.entireGame.childGameState instanceof IngameGameState
              ? "pb-0"
              : "pb-2"
          }
        >
          <Row
            className={classNames("justify-content-center align-items-center", {
              "flex-nowrap": !isMobile && this.entireGame.name.length > 90
            })}
          >
            {this.entireGame.ingameGameState?.replayManager.isReplayMode ? (
              <>
                {this.renderReplaySwitch()}
                {this.renderGameName()}
              </>
            ) : (
              <>
                {this.renderTournamentImage()}
                <ClockComponent entireGame={this.entireGame} />
                {this.renderLockedBadge()}
                {this.renderHouseIcon()}
                {this.renderGameName()}
                {this.renderGameTypeBadge()}
                {this.renderTidesOfBattleImage()}
                {this.renderPerpetuumRandomImage()}
                {this.renderHouseCardsEvolutionImage()}
                {this.renderMapSwitch()}
                {this.renderWarnings()}
                {this.renderPrivateBadge()}
              </>
            )}
            <Col xs="auto">
              <LanguageSelector />
            </Col>
          </Row>
        </Col>
        {this.entireGame.childGameState instanceof LobbyGameState ? (
          <LobbyComponent
            gameClient={this.props.gameClient}
            gameState={this.entireGame.childGameState}
          />
        ) : this.entireGame.childGameState instanceof IngameGameState &&
          this.entireGame.ingameGameState &&
          this.entireGame.ingameGameState.replayManager.isReplayMode ? (
          <ReplayComponent
            gameClient={this.props.gameClient}
            ingame={this.entireGame.childGameState}
          />
        ) : this.entireGame.childGameState instanceof IngameGameState ? (
          <IngameComponent
            gameClient={this.props.gameClient}
            gameState={this.entireGame.childGameState}
          />
        ) : (
          this.entireGame.childGameState instanceof CancelledGameState && (
            <CancelledComponent
              gameClient={this.props.gameClient}
              gameState={this.entireGame.childGameState}
            />
          )
        )}
        <ToastContainer
          autoClose={6000}
          position="top-center"
          closeOnClick={!isMobile}
          pauseOnFocusLoss
          pauseOnHover
          draggable={isMobile}
          draggablePercent={60}
          limit={3}
          theme="dark"
          style={{ width: "auto", height: "auto" }}
        />
      </>
    );
  }

  private renderGameName(): ReactNode {
    if (this.entireGame.name.length < 90 || isMobile) {
      return (
        <Col xs="auto" className="px-3">
          <h4>{this.entireGame.name}</h4>
        </Col>
      );
    }

    return (
      <Col xs="auto" className="px-3">
        <ConditionalWrap
          condition={this.entireGame.name.length >= 90}
          wrap={(children) => (
            <OverlayTrigger
              overlay={
                <Tooltip id="game-name-tooltip">
                  <Col>
                    <h4>{this.entireGame.name}</h4>
                  </Col>
                </Tooltip>
              }
              placement="auto"
            >
              {children}
            </OverlayTrigger>
          )}
        >
          <h4 className="might-overflow" style={{ maxWidth: "90ch" }}>
            {this.entireGame.name}
          </h4>
        </ConditionalWrap>
      </Col>
    );
  }

  renderTidesOfBattleImage(): ReactNode {
    return (
      this.settings.tidesOfBattle && (
        <Col xs="auto">
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id="tob-active-tooltip">
                <div className="text-center">
                  <Trans
                    i18nKey="entireGame.tidesOfBattleaa351e"
                    components={{
                      value0: (
                        <>
                          {this.settings.removeTob3 && (
                            <>
                              <br />
                              <small>{t("entireGame.no3sa390e1")}</small>
                            </>
                          )}
                        </>
                      ),
                      value1: (
                        <>
                          {this.settings.removeTobSkulls && (
                            <>
                              <br />
                              <small>{t("entireGame.noSkulls94c957")}</small>
                            </>
                          )}
                        </>
                      ),
                      value2: (
                        <>
                          {this.settings.limitTob2 && (
                            <>
                              <br />
                              <small>{t("entireGame.onlyTwo2sfe35c3")}</small>
                            </>
                          )}
                        </>
                      )
                    }}
                  />
                </div>
              </Tooltip>
            }
            popperConfig={{ modifiers: [preventOverflow] }}
          >
            <img src={rollingDicesImage} width="30" />
          </OverlayTrigger>
        </Col>
      )
    );
  }

  renderPerpetuumRandomImage(): ReactNode {
    return (
      this.settings.perpetuumRandom && (
        <Col xs="auto">
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id="perpetuum-random-tooltip" className="tooltip-w-100">
                <div className="p-2 text-center">
                  <h6>Perpetuum Random</h6>
                  <small>
                    <Trans
                      i18nKey="entireGame.whenAPlayerPlaysTheirLastHouseCardThey0829f1"
                      components={{ element0: <br /> }}
                    />
                  </small>
                </div>
              </Tooltip>
            }
            popperConfig={{ modifiers: [preventOverflow] }}
          >
            <img src={perpetuumRandomImage} width="30" />
          </OverlayTrigger>
        </Col>
      )
    );
  }

  renderHouseCardsEvolutionImage(): ReactNode {
    return (
      this.settings.houseCardsEvolution && (
        <Col xs="auto">
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id="evolution-active-tooltip">
                <Trans
                  i18nKey="entireGame.fromRoundOnwardsEachHouseReceivesItsAlternativeDeck0f2244"
                  components={{
                    element0: <b />,
                    value1: <>{this.settings.houseCardsEvolutionRound}</>
                  }}
                />
              </Tooltip>
            }
            popperConfig={{ modifiers: [preventOverflow] }}
          >
            <img src={cardExchangeImage} width="30" />
          </OverlayTrigger>
        </Col>
      )
    );
  }

  renderPrivateBadge(): ReactNode {
    return !this.settings.private ? (
      <></>
    ) : (
      <Col xs="auto">
        <h4>
          <Badge bg="primary">{t("entireGame.private7109ec")}</Badge>
        </h4>
      </Col>
    );
  }

  renderLockedBadge(): ReactNode {
    return this.lobby?.password ? (
      <Col xs="auto">
        <h4>
          <OverlayTrigger
            overlay={
              <Tooltip id="locked-badge-tooltip">
                {t("entireGame.thisGameIsPasswordProtectedb43e52")}
              </Tooltip>
            }
            placement="bottom"
          >
            <Badge bg="danger">
              <FontAwesomeIcon icon={faLock} size="sm" />
            </Badge>
          </OverlayTrigger>
        </h4>
      </Col>
    ) : (
      <></>
    );
  }

  renderGameTypeBadge(): ReactNode {
    return (
      <Col xs="auto">
        <h4>
          {this.settings.pbem ? (
            <OverlayTrigger
              overlay={
                <Tooltip id="pbem-badge-tooltip">
                  <Trans
                    i18nKey="entireGame.pLayBYEMAil7dae07"
                    components={{
                      element0: <b />,
                      element1: <b />,
                      element2: <b />,
                      element3: <b />
                    }}
                  />
                </Tooltip>
              }
              placement="bottom"
            >
              <Badge bg="primary">PBEM</Badge>
            </OverlayTrigger>
          ) : (
            <Badge bg="success">{t("common.live")}</Badge>
          )}
        </h4>
      </Col>
    );
  }

  renderWarnings(): ReactNode {
    return (
      <>
        {this.entireGame.ingameGameState?.paused && (
          <Col xs="auto">
            <h4>
              <Badge bg="danger">{t("entireGame.paused5b5f8d")}</Badge>
            </h4>
          </Col>
        )}
        {(this.settings.victoryPointsCountNeededToWin != 7 ||
          this.settings.loyaltyTokenCountNeededToWin != 7 ||
          this.settings.holdVictoryPointsUntilEndOfRound) && (
          <Col xs="auto">
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip
                  id="vp-counts-modified-tooltip"
                  className="tooltip-w-100"
                >
                  <div className="text-center p-2">
                    {(this.settings.victoryPointsCountNeededToWin != 7 ||
                      this.settings.loyaltyTokenCountNeededToWin != 7) && (
                      <div>
                        <h6>
                          <Trans
                            i18nKey="entireGame.theVictoryConditionsHaveBeenModifiedf88c2a"
                            components={{ element0: <br /> }}
                          />
                        </h6>
                      </div>
                    )}
                    <div className="text-small">
                      <Trans
                        i18nKey="entireGame.requiredVictoryPoints72bc5d"
                        components={{
                          element0: <b className="text-large" />,
                          value1: (
                            <>{this.settings.victoryPointsCountNeededToWin}</>
                          )
                        }}
                      />
                    </div>
                    {this.settings.playerCount >= 8 && (
                      <div className="text-small">
                        <Trans
                          i18nKey="entireGame.requiredLoyaltyTokens2f3768"
                          components={{
                            element0: <b className="text-large" />,
                            value1: (
                              <>{this.settings.loyaltyTokenCountNeededToWin}</>
                            )
                          }}
                        />
                      </div>
                    )}
                    {this.settings.holdVictoryPointsUntilEndOfRound && (
                      <div className="text-small mt-3">
                        <Trans
                          i18nKey="entireGame.playersMustHoldVictoryPointsUntilTheEndOf20b204"
                          components={{
                            value0: (
                              <>{this.settings.victoryPointsCountNeededToWin}</>
                            ),
                            element1: <br />
                          }}
                        />
                      </div>
                    )}
                  </div>
                </Tooltip>
              }
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <h4>
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </h4>
            </OverlayTrigger>
          </Col>
        )}
        {(this.settings.dragonWar || this.settings.dragonRevenge) && (
          <Col xs="auto">
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip id="dragon-mode-tooltip" className="tooltip-w-100">
                  <div className="text-center">
                    {this.settings.dragonWar && (
                      <div className="p-2">
                        <h6>{t("common.dragonWar")}</h6>
                        <small>
                          {t(
                            "entireGame.balonGreyjoyAndAeronDamphairDwdHaveBeenNerfed229ea7"
                          )}
                        </small>
                      </div>
                    )}
                    {this.settings.dragonRevenge && (
                      <div className="p-2">
                        <h6>{t("common.dragonRevenge")}</h6>
                        <small>
                          {t(
                            "entireGame.theLastRemainingNonDragonLandUnitOfA775972"
                          )}
                        </small>
                      </div>
                    )}
                  </div>
                </Tooltip>
              }
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <h4>🐉</h4>
            </OverlayTrigger>
          </Col>
        )}
        {false && (
          <Col xs="auto">
            <h4>
              <Badge bg="warning">BETA</Badge>
            </h4>
          </Col>
        )}
      </>
    );
  }

  renderTournamentImage(): ReactNode {
    return (
      this.settings.tournamentMode && (
        <Col xs="auto">
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id="tournament-game-tooltip">
                {t("entireGame.thisIsATournamentGamef4045b")}
              </Tooltip>
            }
            popperConfig={{ modifiers: [preventOverflow] }}
          >
            <img src={trophyCupImage} width="30" />
          </OverlayTrigger>
        </Col>
      )
    );
  }

  renderHouseIcon(): ReactNode {
    // Hack for ADWD Bolton as the Ingame c'tor is not called here yet:
    const house = this.props.gameClient.authenticatedPlayer?.house;
    if (house && this.settings.adwdHouseCards && house.id == "stark") {
      house.name = "Bolton";
    }
    return (
      house && (
        <Col xs="auto">
          <div style={{ marginTop: "-4px" }}>
            <HouseIconComponent house={house} small={true} />
          </div>
        </Col>
      )
    );
  }

  renderMapSwitch(): ReactNode {
    return (
      (this.entireGame.hasChildGameState(DraftHouseCardsGameState) ||
        this.entireGame.hasChildGameState(SelectedRandomDraftGameState)) && (
        <Col xs="auto">
          <FormCheck
            id="show-hide-map-setting"
            type="switch"
            label={t("entireGame.showMap9166a7")}
            style={{ marginTop: "-6px" }}
            checked={this.showMapWhileDrafting}
            onChange={() => {
              this.showMapWhileDrafting = !this.showMapWhileDrafting;
            }}
          />
        </Col>
      )
    );
  }

  renderReplaySwitch(): ReactNode {
    return (
      <Col xs="auto">
        <FormCheck
          id="replay-mode-switch"
          type="switch"
          label={
            <label htmlFor="replay-mode-switch">
              <Badge bg="warning">{t("entireGame.replayMode4231bb")}</Badge>
            </label>
          }
          style={{ marginTop: "-6px" }}
          checked={this.entireGame.ingameGameState?.replayManager.isReplayMode}
          onChange={() => {
            if (this.entireGame.ingameGameState)
              this.entireGame.ingameGameState.replayManager.reset();
          }}
        />
      </Col>
    );
  }

  changeUserSettings(): void {
    if (!this.props.gameClient.authenticatedUser) {
      return;
    }
    const user = this.props.gameClient.authenticatedUser;
    user.syncSettings();
  }

  onGameStarted(): void {
    this.props.gameClient.sfxManager.playGotTheme();
  }

  updateFavicon(): void {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.href = this.props.gameClient.isOwnTurn()
      ? faviconAlert
      : faviconNormal;
    favicon.sizes.add("16x16");

    const currentFavicon =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (currentFavicon) {
      currentFavicon.replaceWith(favicon);
    } else {
      document.head.appendChild(favicon);
    }
  }

  onClientGameStateChange(): void {
    if (this.props.gameClient.isOwnTurn()) {
      this.props.gameClient.sfxManager.playNotificationSound();

      const player = this.props.gameClient.authenticatedPlayer;
      if (player) {
        // must be truthy but so what
        toast(
          <div>
            <Card>
              <Card.Body className="d-flex align-items-center">
                <HouseIconComponent
                  house={player.house}
                  size={100}
                ></HouseIconComponent>
                <h2 className="d-inline ms-3" style={{ color: "white" }}>
                  {t("entireGame.itSYourTurnae6a42")}
                </h2>
              </Card.Body>
            </Card>
          </div>,
          {
            autoClose: 2000,
            toastId: "your-turn-toast",
            pauseOnHover: false,
            theme: "light",
            transition: yourTurnToastAnimation
          }
        );
      }
    } else {
      toast.dismiss("your-turn-toast");
    }
  }

  setNow(): void {
    // Correct for client/server clock skew so countdowns against server-issued deadlines stay accurate
    runInAction(() => {
      this.entireGame.now = new Date(
        Date.now() + this.entireGame.clockOffsetMs
      );
    });
  }

  componentDidMount(): void {
    document.title = this.entireGame.name;
    this.updateFavicon();
    this.props.gameClient.onOwnTurnChange = () => this.updateFavicon();

    if (this.isGameEnded) {
      return;
    }

    this.entireGame.onClientGameStateChange = () =>
      this.onClientGameStateChange();
    this.entireGame.onGameStarted = () => this.onGameStarted();

    this.setIntervalId = window.setInterval(() => this.setNow(), 1000);
  }

  componentWillUnmount(): void {
    this.props.gameClient.onOwnTurnChange = null;
    this.entireGame.onClientGameStateChange = null;
    this.entireGame.onGameStarted = null;

    if (this.setIntervalId >= 0) {
      window.clearInterval(this.setIntervalId);
      this.setIntervalId = -1;
    }
  }
}
