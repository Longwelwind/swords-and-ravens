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
import { FormCheck, OverlayTrigger, Tooltip } from "react-bootstrap";
import { preventOverflow } from "@popperjs/core";
import DraftHouseCardsGameState from "../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import { observable } from "mobx";

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
                <div style={{ marginLeft: "1rem", marginBottom: "0rem", textAlign: "center", alignItems: "center"}}>
                    <h4 style={{ display: "inline" }}>{this.props.entireGame.name} {this.getTidesOfBattleImage()} {this.getGameTypeBadge()}</h4>{this.renderMapSwitch()}
                </div>
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

    getTidesOfBattleImage(): ReactNode {
        return <OverlayTrigger
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
            <img src={rollingDicesImage} width="30" style={{ "display": this.props.entireGame.gameSettings.tidesOfBattle ? "inline" : "none", marginTop: "-6px", paddingLeft: "5px" }} />
        </OverlayTrigger>
    }

    getGameTypeBadge(): ReactNode {
        return this.props.entireGame.gameSettings.pbem
            ? <Badge variant="primary" className="mx-3">PBEM</Badge>
            : <Badge variant="success" className="mx-3">Live</Badge>;
    }

    renderBetaWarning(): ReactNode {
        return <h6 style={{display: "inline", fontWeight: "normal"}}>&nbsp;BETA!</h6>
    }

    renderMapSwitch(): ReactNode {
        return this.props.entireGame.hasChildGameState(DraftHouseCardsGameState) &&
            <FormCheck
                id="show-hide-map-setting"
                type="switch"
                label="Show map"
                style={{display: "inline", marginLeft: "10px"}}
                checked={this.showMapWhenDrafting}
                onChange={() => {
                    this.showMapWhenDrafting = !this.showMapWhenDrafting;
                    this.changeUserSettings();
                }}
            />
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
