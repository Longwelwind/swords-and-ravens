import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import EntireGame from "../common/EntireGame";
import GameClient from "./GameClient";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IngameComponent from "./IngameComponent";
import LobbyComponent from "./LobbyComponent";
import CancelledComponent from "./CancelledComponent";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import notificationSound from "../../public/sounds/notification.ogg";
import faviconNormal from "../../public/images/favicon.ico";
import faviconAlert from "../../public/images/favicon-alert.ico";
import rollingDicesImage from "../../public/images/icons/rolling-dices.svg";
import cardExchangeImage from "../../public/images/icons/card-exchange.svg";
import trophyCupImage from "../../public/images/icons/trophy-cup.svg";
import {Helmet} from "react-helmet";
import { Card, FormCheck, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import { observable } from "mobx";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import GameEndedGameState from "../common/ingame-game-state/game-ended-game-state/GameEndedGameState";
import introSound from "../../public/sounds/game-of-thrones-intro.ogg";
import CombatGameState from "../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import { toast, ToastContainer } from "react-toastify";
import { cssTransition } from "react-toastify";
import ClockComponent from "./ClockComponent";
import { isMobile } from 'react-device-detect';

const yourTurnToastAnimation = cssTransition({
    enter: "slide-in-elliptic-top-fwd",
    exit: "slide-out-elliptic-top-bck"
});

interface EntireGameComponentProps {
    entireGame: EntireGame;
    gameClient: GameClient;
}

@observer
export default class EntireGameComponent extends Component<EntireGameComponentProps> {
    @observable showMapWhenDrafting = false;
    @observable playWelcomeSound = false;

    get ingame(): IngameGameState | null {
        return this.props.entireGame.ingameGameState;
    }

    get lobby(): LobbyGameState | null {
        return this.props.entireGame.lobbyGameState;
    }

    get isGameEnded(): boolean {
        return this.props.entireGame.leafState instanceof CancelledGameState ||
            this.props.entireGame.leafState instanceof GameEndedGameState;
    }

    get isInCombat (): boolean {
        return this.props.entireGame.hasChildGameState(CombatGameState);
    }

    render(): ReactNode {
        return <>
            <Helmet>
                <link rel="icon" href={this.props.gameClient.isOwnTurn() ? faviconAlert : faviconNormal} sizes="16x16" />
            </Helmet>
            <Col xs={12} className={this.props.entireGame.childGameState instanceof IngameGameState ? "pb-0" : "pb-2"}>
                <Row className="justify-content-center align-items-center">
                    {(this.ingame?.replayWorldState?.length ?? 0) > 0
                        ? <>{this.renderReplaySwitch()}
                            <Col xs="auto" className="px-3">
                                <h4>{this.props.entireGame.name}</h4>
                            </Col>
                        </>
                        : <>{this.renderTournamentImage()}
                            <ClockComponent entireGame={this.props.entireGame} />
                            {this.renderLockedBadge()}
                            {this.renderHouseIcon()}
                            <Col xs="auto" className="px-3">
                                <h4>{this.props.entireGame.name}</h4>
                            </Col>
                            {this.renderGameTypeBadge()}
                            {this.renderTidesOfBattleImage()}
                            {this.renderHouseCardsEvolutionImage()}
                            {this.renderMapSwitch()}
                            {this.renderWarnings()}
                            {this.renderPrivateBadge()}
                        </>}
                </Row>
            </Col>
            {
                this.props.entireGame.childGameState instanceof LobbyGameState ? (
                    <LobbyComponent gameClient={this.props.gameClient} gameState={this.props.entireGame.childGameState} />
                ) : this.props.entireGame.childGameState instanceof IngameGameState ? (
                    <IngameComponent gameClient={this.props.gameClient} gameState={this.props.entireGame.childGameState} />
                ) : this.props.entireGame.childGameState instanceof CancelledGameState && (
                    <CancelledComponent gameClient={this.props.gameClient} gameState={this.props.entireGame.childGameState} />
                )
            }
            {this.playWelcomeSound && !this.props.gameClient.musicMuted &&
                <audio id="welcome-sound" src={introSound} autoPlay onEnded={() => this.playWelcomeSound = false} />
            }
            <ToastContainer
                autoClose={7500}
                position="top-center"
                closeOnClick={!isMobile}
                pauseOnFocusLoss
                pauseOnHover
                draggable={isMobile}
                draggablePercent={60}
                limit={3}
                theme="dark"
                style={{width: "auto", height: "auto"}}
            />
        </>;
    }

    renderTidesOfBattleImage(): ReactNode {
        return this.props.entireGame.gameSettings.tidesOfBattle &&
            <Col xs="auto">
                <OverlayTrigger
                    placement="auto"
                    overlay={
                        <Tooltip id="tob-active-tooltip">
                            <Col className="text-center">
                                Tides of Battle
                                {this.props.entireGame.gameSettings.removeTob3 && <>
                                    <br/><small>No 3s</small>
                                </>}
                                {this.props.entireGame.gameSettings.removeTobSkulls && <>
                                    <br/><small>No skulls</small>
                                </>}
                                {this.props.entireGame.gameSettings.limitTob2 && <>
                                    <br/><small>Only two 2s</small>
                                </>}
                            </Col>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <img src={rollingDicesImage} width="30" />
                </OverlayTrigger>
            </Col>;
    }

    renderHouseCardsEvolutionImage(): ReactNode {
        return this.props.entireGame.gameSettings.houseCardsEvolution &&
            <Col xs="auto">
                <OverlayTrigger
                    placement="auto"
                    overlay={
                        <Tooltip id="evolution-active-tooltip">
                            From round <b>5</b> onwards, each house returns its alternative deck when the last house card has been played.
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <img src={cardExchangeImage} width="30" />
                </OverlayTrigger>
            </Col>;
    }

    renderPrivateBadge(): ReactNode {
        return !this.props.entireGame.gameSettings.private ? <></> :
            <Col xs="auto">
                <h4>
                    <Badge variant="primary">PRIVATE</Badge>
                </h4>
            </Col>;
    }

    renderLockedBadge(): ReactNode {
        return this.lobby?.password
            ? <Col xs="auto">
                <h4>
                    <OverlayTrigger overlay={<Tooltip id="locked-badge-tooltip">Game is locked by password</Tooltip>}
                        placement="bottom"
                    >
                        <Badge variant="danger"><FontAwesomeIcon icon={faLock} size="sm"/></Badge>
                    </OverlayTrigger>
                </h4>
            </Col>
            : <></>;
    }

    renderGameTypeBadge(): ReactNode {
        return <Col xs="auto">
            <h4>
                {this.props.entireGame.gameSettings.pbem
                    ? <OverlayTrigger overlay={<Tooltip id="pbem-badge-tooltip"><b>P</b>lay <b>B</b>y <b>E</b>-<b>M</b>ail</Tooltip>}
                        placement="bottom"
                    >
                        <Badge variant="primary">PBEM</Badge>
                    </OverlayTrigger>
                    : <Badge variant="success">Live</Badge>}
            </h4>
        </Col>;
    }

    renderWarnings(): ReactNode {
        return <>
            {this.props.entireGame.ingameGameState?.paused &&
            <Col xs="auto">
                <h4><Badge variant="danger">PAUSED</Badge></h4>
            </Col>}
            {(this.props.entireGame.gameSettings.victoryPointsCountNeededToWin != 7 || this.props.entireGame.gameSettings.loyaltyTokenCountNeededToWin != 7) &&
            <Col xs="auto">
                <OverlayTrigger
                    placement="auto"
                    overlay={
                        <Tooltip id="vp-counts-modified-tooltip">
                            <Col className="text-center">
                                {this.props.entireGame.gameSettings.victoryPointsCountNeededToWin != 7 && <>
                                    The number of victory points needed to win has been modified
                                    to <b>{this.props.entireGame.gameSettings.victoryPointsCountNeededToWin}</b>!<br/>
                                </>}
                                {this.props.entireGame.gameSettings.loyaltyTokenCountNeededToWin != 7 && <>
                                    The number of loyalty tokens needed to win has been modified
                                    to <b>{this.props.entireGame.gameSettings.loyaltyTokenCountNeededToWin}</b>!
                                </>}
                            </Col>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <h4><Badge variant="primary"><FontAwesomeIcon icon={faTriangleExclamation} /></Badge></h4>
                </OverlayTrigger>
            </Col>}
            {false &&
            <Col xs="auto">
                <h4><Badge variant="warning">BETA</Badge></h4>
            </Col>}
        </>;
    }

    renderTournamentImage(): ReactNode {
        return this.props.entireGame.gameSettings.tournamentMode &&
            <Col xs="auto">
                <OverlayTrigger
                    placement="auto"
                    overlay={
                        <Tooltip id="tournament-game-tooltip">
                            This is a tournament game
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <img src={trophyCupImage} width="30" />
                </OverlayTrigger>
            </Col>;
    }

    renderHouseIcon(): ReactNode {
        // Hack for ADWD Bolton as the Ingame c'tor is not called here yet:
        const house = this.props.gameClient.authenticatedPlayer?.house;
        if (house && this.props.entireGame.gameSettings.adwdHouseCards && house.id == "stark") {
            house.name = "Bolton";
        }
        return house &&
            <Col xs="auto">
                <div style={{marginTop: "-4px"}}>
                    <HouseIconComponent house={house} small={true}/>
                </div>
            </Col>;
    }

    renderMapSwitch(): ReactNode {
        return this.props.entireGame.hasChildGameState(DraftHouseCardsGameState) &&
            <Col xs="auto">
                <FormCheck
                    id="show-hide-map-setting"
                    type="switch"
                    label="Show map"
                    style={{ marginTop: "-6px" }}
                    checked={this.showMapWhenDrafting}
                    onChange={() => {
                        this.showMapWhenDrafting = !this.showMapWhenDrafting;
                        this.changeUserSettings();
                    }}
                />
            </Col>;
    }

    renderReplaySwitch(): ReactNode {
        return <Col xs="auto">
            <FormCheck
                id="replay-mode-switch"
                type="switch"
                label={<label htmlFor="replay-mode-switch"><Badge variant="warning">REPLAY MODE</Badge></label>}
                style={{ marginTop: "-6px" }}
                checked={(this.props.entireGame.ingameGameState?.replayWorldState?.length ?? 0) > 0}
                onChange={() => {
                    if (this.props.entireGame.ingameGameState) {
                        this.props.entireGame.ingameGameState.replayWorldState = null;
                    }
                }}
            />
        </Col>;
    }

    changeUserSettings(): void {
        if (!this.props.gameClient.authenticatedUser) {
            return;
        }
        const user = this.props.gameClient.authenticatedUser;
        user.settings.showMapWhenDrafting = this.showMapWhenDrafting;
        user.syncSettings();
    }

    componentDidMount(): void {
        document.title = this.props.entireGame.name;

        if (this.isGameEnded) {
            return;
        }

        this.props.entireGame.onClientGameStateChange = () => this.onClientGameStateChange();
        this.props.entireGame.onGameStarted = () => this.onGameStarted();

        if (this.props.gameClient.authenticatedUser) {
            this.showMapWhenDrafting = this.props.gameClient.authenticatedUser.settings.showMapWhenDrafting;
        }

        /* if (!this.isInCombat) {
            this.playWelcomeSound = true;
        } */
    }

    onGameStarted(): void {
        const audio = document.getElementById("welcome-sound") as HTMLAudioElement;
        // Make sure it's not playing right now
        if (audio && !audio.paused) {
            return;
        }

        if (!this.props.gameClient.musicMuted) {
            const intro = new Audio(introSound);
            intro.play();
        }
    }

    onClientGameStateChange(): void {
        if (this.props.gameClient.isOwnTurn()) {
            if (!this.props.gameClient.muted) {
                const audio = new Audio(notificationSound);
                audio.play();
            }

            const player = this.props.gameClient.authenticatedPlayer;
            if (player) {
                 // must be truthy but so what
                toast(<div>
                    <Card>
                        <Card.Body className="d-flex align-items-center">
                            <HouseIconComponent house={player.house} size={100}></HouseIconComponent>
                            <h2 className="d-inline ml-3" style={{ color: "white" }}>It&apos;s your turn!</h2>
                        </Card.Body>
                    </Card>
                </div>, {
                    autoClose: 3000,
                    toastId: "your-turn-toast",
                    pauseOnHover: false,
                    theme: "light",
                    transition: yourTurnToastAnimation
                });
            }
        } else {
            toast.dismiss("your-turn-toast");
        }
    }

    componentWillUnmount(): void {
        this.props.entireGame.onClientGameStateChange = null;
        this.props.entireGame.onGameStarted = null;
    }
}
