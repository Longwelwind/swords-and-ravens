import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import GameClient from "./GameClient";
import { GameSettings } from "../common/EntireGame";
import EntireGame from "../common/EntireGame";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { allGameSetups, getGameSetupContainer } from "../common/ingame-game-state/game-data-structure/createGame";
import IngameGameState from "../common/ingame-game-state/IngameGameState";

interface GameSettingsComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
}

@observer
export default class GameSettingsComponent extends Component<GameSettingsComponentProps> {
    get entireGame(): EntireGame {
        return this.props.entireGame;
    }

    get gameSettings(): GameSettings {
        return this.entireGame.gameSettings;
    }

    get canChangeGameSettings(): boolean {
        return this.props.gameClient.isOwner();
    }

    get selectedGameSetupName(): string {
        const name = allGameSetups.get(this.props.entireGame.gameSettings.setupId).name;
        return name.substring(0, name.indexOf(" ("));
    }

    render(): ReactNode {
        return (
            <Row>
                {this.props.entireGame.childGameState instanceof IngameGameState && (
                <Col xs={12} className="mb-1 mt-1">
                    <Row className="justify-content-center">
                        {this.selectedGameSetupName}
                    </Row>
                </Col>
                )}
                <Col xs={12} className="mb-1 mt-1">
                    <Row className="justify-content-center">
                        <OverlayTrigger overlay={
                            <Tooltip id="pbem-tooltip">
                                <b>Live Game</b><br />
                                A live game can be played when all players are online.
                                They are notified by sound when it is their turn.<br /><br />
                                <b>P</b>lay <b>B</b>y <b>E</b>-<b>M</b>ail<br />
                                The asynchronous game mode. Players receive an e-mail when it is their turn.
                                Those games are typically played over days or weeks.
                            </Tooltip>}>
                            <select id="pbem-setting" name="pbem"
                                value={this.gameSettings.pbem ? "PBEM" : "Live"}
                                onChange={e => this.changeGameSettings(() => this.gameSettings.pbem = e.target.value == "PBEM")}>
                                <option key="Live" value="Live">Live Game</option>
                                <option key="PBEM" value="PBEM">Play By E-Mail</option>
                            </select>
                        </OverlayTrigger>
                    </Row>
                </Col>
                {this.props.entireGame.childGameState instanceof LobbyGameState && (
                <Col xs="auto">
                    <Row>
                        <Col xs="auto">
                            <select id="setups" name="setups"
                                value={this.gameSettings.setupId}
                                onChange={e => this.onSetupChange(e.target.value)}>
                                {this.createSetupItems()}
                            </select>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <select id="player-count" name="playerCount"
                                value={this.gameSettings.playerCount}
                                onChange={e => this.onPlayerCountChange(e.target.value)}>
                                {this.createPlayerCountItems()}
                            </select>
                        </Col>
                        <Col xs="auto">
                            <>Players</>
                        </Col>
                    </Row>
                </Col>)}
                {this.props.entireGame.childGameState instanceof LobbyGameState && (
                <Col xs="auto">
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="adwd-house-cards"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="adwd-house-cards-tooltip">
                                            The house cards will come from the Dance with Dragons expansion.
                                        </Tooltip>}>
                                        <label htmlFor="adwd-house-cards">Use <i>A Dance with Dragons</i> house cards</label>
                                    </OverlayTrigger>}
                                disabled={this.props.entireGame.gameSettings.setupId == "a-dance-with-dragons"}
                                checked={this.gameSettings.adwdHouseCards}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.adwdHouseCards = !this.gameSettings.adwdHouseCards)}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="draft-house-cards"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="draft-house-cards-tooltip">
                                            Players will draft their house cards step by step in a randomly chosen order before the game starts.
                                            Cards can be chosen from all 2nd Edition Base Game house cards and all expansions (ADwD, AFfC and MoD) house cards.
                                        </Tooltip>}>
                                        <label htmlFor="draft-house-cards">Draft house cards (BETA)</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.draftHouseCards}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.draftHouseCards = !this.gameSettings.draftHouseCards)}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="random-houses-setting"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="random-houses-tooltip">
                                            All houses will be randomized before the game starts when this option is selected.
                                        </Tooltip>}>
                                        <label htmlFor="random-houses-setting">Randomize houses</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.randomHouses}
                                onChange={() => this.onRandomHousesChange()}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="random-chosen-houses-setting"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="random-chosen-houses-tooltip">
                                            Only chosen houses will be randomized before the game starts when this option is selected.
                                            This way users can define player and vassal houses and are still able to randomize the player houses.
                                        </Tooltip>}>
                                        <label htmlFor="random-chosen-houses-setting">Randomize chosen houses</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.randomChosenHouses}
                                onChange={() => this.onRandomChosenHousesChange()}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="vassals-setting"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="vassals-tooltip">
                                            Unassigned houses will be vassals from Mother of Dragons expansion and players start with 7 Power tokens instead of 5.
                                        </Tooltip>}>
                                        <label htmlFor="vassals-setting">MoD Vassals</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.vassals}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.vassals = !this.gameSettings.vassals)}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="sea-orders-setting"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="sea-orders-tooltip">
                                            Sea order tokens from Mother of Dragons expansion will be available.
                                        </Tooltip>}>
                                        <label htmlFor="sea-orders-setting">MoD Sea Order Tokens</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.seaOrderTokens}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.seaOrderTokens = !this.gameSettings.seaOrderTokens)}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs="auto">
                            <FormCheck
                                id="westeros-phase-variant-setting"
                                type="checkbox"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="westeros-phase-variant-tooltip">
                                            Players may look at the next 3 Westeros cards from each deck at any time.
                                        </Tooltip>}>
                                        <label htmlFor="westeros-phase-variant-setting">CoK Westeros Phase Variant</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.cokWesterosPhase}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.cokWesterosPhase = !this.gameSettings.cokWesterosPhase)}
                            />
                        </Col>
                    </Row>
                </Col>)}
            </Row>
        );
    }

    createSetupItems(): ReactNode {
        const items: JSX.Element[] = [];

        allGameSetups.forEach((setupData, setupId) => {
            items.push(<option key={setupId} value={setupId}>{setupData.name}</option>);
        });

        return items;
    }

    createPlayerCountItems(): ReactNode {
        const items: JSX.Element[] = [];

        const playerSetups = getGameSetupContainer(this.gameSettings.setupId).playerSetups;

        playerSetups.forEach(gameSetup => {
            items.push(<option key={gameSetup.playerCount} value={gameSetup.playerCount}>{gameSetup.playerCount}</option>);
        });

        return items;
    }

    onSetupChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.setupId = newVal;

        // On setup change set player count to it's default value which should be the highest value (last element)
        const container = getGameSetupContainer(newVal);
        const playerCounts = container.playerSetups.map(playerSetup => playerSetup.playerCount);
        const defaultPlayerCount = playerCounts[playerCounts.length - 1];
        this.gameSettings.playerCount = defaultPlayerCount;

        this.changeGameSettings();
    }

    onPlayerCountChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.playerCount = parseInt(newVal);

        this.changeGameSettings();
    }

    onRandomChosenHousesChange(): void {
        if (!this.entireGame.gameSettings.randomChosenHouses && this.entireGame.gameSettings.randomHouses) {
            return;
        }

        this.changeGameSettings(() => this.entireGame.gameSettings.randomChosenHouses = !this.entireGame.gameSettings.randomChosenHouses)
    }

    onRandomHousesChange(): void {
        if (!this.entireGame.gameSettings.randomHouses && this.entireGame.gameSettings.randomChosenHouses) {
            return;
        }

        this.changeGameSettings(() => this.entireGame.gameSettings.randomHouses = !this.entireGame.gameSettings.randomHouses)
    }

    /**
     * Helper function to modify gameSettings and update the game settings.
     * @param action Function that modifies gameSettings
     */
    changeGameSettings(action: () => void = () => {}): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        action();

        this.props.entireGame.updateGameSettings(this.gameSettings);
    }
}