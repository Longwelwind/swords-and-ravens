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
import {Helmet} from "react-helmet";
import { FormCheck, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import { observable } from "mobx";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamation } from "@fortawesome/free-solid-svg-icons";

interface EntireGameComponentProps {
    entireGame: EntireGame;
    gameClient: GameClient;
}

@observer
export default class EntireGameComponent extends Component<EntireGameComponentProps> {
    @observable showMapWhenDrafting = false;

    render(): ReactNode {
        return <>
            <Helmet>
                <link rel="icon" href={this.props.gameClient.isOwnTurn() ? faviconAlert : faviconNormal} sizes="16x16" />
            </Helmet>
            <Col xs={12} className={this.props.entireGame.childGameState instanceof IngameGameState ? "pb-0" : "pb-2"}>
                <Row className="justify-content-center align-items-center">
                    {this.renderHouseIcon()}
                    <Col xs="auto">
                        <h4>{this.props.entireGame.name}</h4>
                    </Col>
                    {this.renderTidesOfBattleImage()}
                    {this.renderGameTypeBadge()}
                    {this.renderMapSwitch()}
                    {this.renderWarnings()}
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

    renderGameTypeBadge(): ReactNode {
        return <Col xs="auto">
            <h4>
                {this.props.entireGame.gameSettings.pbem
                    ? <Badge variant="primary">PBEM</Badge>
                    : <Badge variant="success">Live</Badge>}
            </h4>
        </Col>;
    }

    renderWarnings(): ReactNode {
        return <>
            {this.props.entireGame.gameSettings.reduceVictoryPointsCountNeededToWinTo6 &&
            <Col xs="auto">
                <OverlayTrigger
                    placement="auto"
                    overlay={
                        <Tooltip id="vp-counts-reduced-tooltip">
                            <Col className="text-center">
                                The number of victory points required for winning is reduced to <b>6</b> instead of 7!
                            </Col>
                        </Tooltip>}
                    popperConfig={{ modifiers: [preventOverflow] }}
                >
                    <h4><Badge variant="warning"><FontAwesomeIcon icon={faExclamation} size="sm"/></Badge></h4>
                </OverlayTrigger>
            </Col>}
            {this.props.entireGame.gameSettings.asosHouseCards &&
            <Col xs="auto">
                <h4><Badge variant="warning">BETA</Badge></h4>
            </Col>}
        </>;
    }

    renderHouseIcon(): ReactNode {
        return this.props.gameClient.authenticatedPlayer &&
            <Col xs="auto">
                <div style={{marginTop: "-4px"}}>
                    <SimpleInfluenceIconComponent house={this.props.gameClient.authenticatedPlayer.house} small={true}/>
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
        this.props.entireGame.onClientGameStateChange = () => this.onClientGameStateChange();

        if (this.props.gameClient.authenticatedUser) {
            this.showMapWhenDrafting = this.props.gameClient.authenticatedUser.settings.showMapWhenDrafting;
        }
    }

    onClientGameStateChange(): void {
        if (this.props.gameClient.isOwnTurn() && !this.props.gameClient.muted) {
            const audio = new Audio(notificationSound);
            audio.play();
        }
    }

    componentWillUnmount(): void {
        this.props.entireGame.onClientGameStateChange = null;
    }
}
