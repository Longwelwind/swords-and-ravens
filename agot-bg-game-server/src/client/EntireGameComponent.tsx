import { observer } from "mobx-react";
import { Component, default as React, ReactNode } from "react";
import EntireGame, { GameSettings } from "../common/EntireGame";
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
import crownedSkullImage from "../../public/images/icons/crowned-skull.svg";
import { Helmet } from "react-helmet";
import {
  Alert,
  Card,
  FormCheck,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faTriangleExclamation,
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

const yourTurnToastAnimation = cssTransition({
  enter: "slide-in-elliptic-top-fwd",
  exit: "slide-out-elliptic-top-bck",
});

interface EntireGameComponentProps {
  entireGame: EntireGame;
  gameClient: GameClient;
}

@observer
export default class EntireGameComponent extends Component<EntireGameComponentProps> {
  setIntervalId = -1;

  get entireGame(): EntireGame {
    return this.props.entireGame;
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

  get isWorldDomination(): boolean {
    const settings = this.entireGame.gameSettings;
    return (
      settings.endless &&
      settings.victoryPointsCountNeededToWin === 50 &&
      (settings.playerCount < 8 || settings.loyaltyTokenCountNeededToWin === 50)
    );
  }

  get settings(): GameSettings {
    return this.entireGame.gameSettings;
  }

  render(): ReactNode {
    if (
      this.props.gameClient.authenticatedUser &&
      this.ingame?.bannedUsers.has(this.props.gameClient.authenticatedUser?.id)
    ) {
      return (
        <Col xs="auto" className="m-4 p-3 text-center">
          <Alert variant="danger">
            <h4>You have been banned from the game.</h4>
          </Alert>
        </Col>
      );
    }
    return (
      <>
        <Helmet>
          <link
            rel="icon"
            href={
              this.props.gameClient.isOwnTurn() ? faviconAlert : faviconNormal
            }
            sizes="16x16"
          />
        </Helmet>
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
              "flex-nowrap": !isMobile && this.entireGame.name.length > 90,
            })}
          >
            {this.props.entireGame.ingameGameState?.replayManager
              .isReplayMode ? (
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
                {this.renderHouseCardsEvolutionImage()}
                {this.renderMapSwitch()}
                {this.renderWarnings()}
                {this.renderPrivateBadge()}
              </>
            )}
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
                  Tides of Battle
                  {this.settings.removeTob3 && (
                    <>
                      <br />
                      <small>No 3s</small>
                    </>
                  )}
                  {this.settings.removeTobSkulls && (
                    <>
                      <br />
                      <small>No skulls</small>
                    </>
                  )}
                  {this.settings.limitTob2 && (
                    <>
                      <br />
                      <small>Only two 2s</small>
                    </>
                  )}
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

  renderHouseCardsEvolutionImage(): ReactNode {
    return (
      this.settings.houseCardsEvolution && (
        <Col xs="auto">
          <OverlayTrigger
            placement="auto"
            overlay={
              <Tooltip id="evolution-active-tooltip">
                From round <b>{this.settings.houseCardsEvolutionRound}</b>{" "}
                onwards, each house returns its alternative deck when the last
                house card has been played.
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
          <Badge variant="primary">PRIVATE</Badge>
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
                Game is locked by password
              </Tooltip>
            }
            placement="bottom"
          >
            <Badge variant="danger">
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
                  <b>P</b>lay <b>B</b>y <b>E</b>-<b>M</b>ail
                </Tooltip>
              }
              placement="bottom"
            >
              <Badge variant="primary">PBEM</Badge>
            </OverlayTrigger>
          ) : (
            <Badge variant="success">Live</Badge>
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
              <Badge variant="danger">PAUSED</Badge>
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
                  <div className="text-center">
                    {(this.settings.victoryPointsCountNeededToWin != 7 ||
                      this.settings.loyaltyTokenCountNeededToWin != 7) && (
                      <p>
                        <h6>
                          The victory conditions
                          <br />
                          have been modified!
                        </h6>
                      </p>
                    )}
                    <>
                      Required victory points:{" "}
                      <b className="text-large">
                        {this.settings.victoryPointsCountNeededToWin}
                      </b>
                    </>
                    {this.settings.playerCount >= 8 && (
                      <>
                        <br />
                        Required loyalty tokens:{" "}
                        <b className="text-large">
                          {this.settings.loyaltyTokenCountNeededToWin}
                        </b>
                      </>
                    )}
                    {this.settings.holdVictoryPointsUntilEndOfRound && (
                      <>
                        <br />
                        Players have to hold{" "}
                        {this.settings.victoryPointsCountNeededToWin} victory
                        points until the end of the round to win the game!
                      </>
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
        {this.isWorldDomination && (
          <Col xs="auto">
            <OverlayTrigger
              placement="bottom"
              overlay={
                <Tooltip id="world-domination-tooltip">
                  World Domination
                </Tooltip>
              }
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <img src={crownedSkullImage} width="30" />
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
                      <>
                        <p>
                          <h6>Dragon War</h6>
                          <small>
                            Balon Greyjoy and Aeron Damphair (DwD) have been
                            nerfed!
                          </small>
                        </p>
                      </>
                    )}
                    {this.settings.dragonRevenge && (
                      <>
                        <p>
                          <h6>Dragon Revenge</h6>
                          <small>
                            The last remaining non-dragon land unit will
                            transform into a dragon!
                          </small>
                        </p>
                      </>
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
        {this.settings.fogOfWar && (
          <Col xs="auto">
            <h4>
              <Badge variant="warning">BETA</Badge>
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
                This is a tournament game
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
      this.entireGame.hasChildGameState(DraftHouseCardsGameState) && (
        <Col xs="auto">
          <FormCheck
            id="show-hide-map-setting"
            type="switch"
            label="Show map"
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
              <Badge variant="warning">REPLAY MODE</Badge>
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
                <h2 className="d-inline ml-3" style={{ color: "white" }}>
                  It&apos;s your turn!
                </h2>
              </Card.Body>
            </Card>
          </div>,
          {
            autoClose: 2000,
            toastId: "your-turn-toast",
            pauseOnHover: false,
            theme: "light",
            transition: yourTurnToastAnimation,
          }
        );
      }
    } else {
      toast.dismiss("your-turn-toast");
    }
  }

  setNow(): void {
    this.entireGame.now = new Date();
  }

  componentDidMount(): void {
    document.title = this.entireGame.name;

    if (this.isGameEnded) {
      return;
    }

    this.entireGame.onClientGameStateChange = () =>
      this.onClientGameStateChange();
    this.entireGame.onGameStarted = () => this.onGameStarted();

    this.setIntervalId = window.setInterval(() => this.setNow(), 1000);
  }

  componentWillUnmount(): void {
    this.entireGame.onClientGameStateChange = null;
    this.entireGame.onGameStarted = null;

    if (this.setIntervalId >= 0) {
      window.clearInterval(this.setIntervalId);
      this.setIntervalId = -1;
    }
  }
}
