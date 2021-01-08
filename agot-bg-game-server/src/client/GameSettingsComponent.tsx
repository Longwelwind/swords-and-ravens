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

    render(): ReactNode {
        return (
            <>
                {this.props.entireGame.childGameState instanceof LobbyGameState && (
                    <>
                        <Row>
                            <Col xs="auto">
                                <select id="game-edition" name="game-edition"
                                    value={this.gameSettings.gameEdition}
                                    disabled={!this.canChangeGameSettings}
                                    onChange={ e => this.onEditionChange(e.target.value) }>
                                    { this.createEditionItems() }
                                </select>
                            </Col>
                        </Row>

                        <Row>
                            <Col xs="auto">
                                <select id="setups" name="setups"
                                    value={this.gameSettings.setupId}
                                    disabled={!this.canChangeGameSettings}
                                    onChange={e => this.onSetupChange(e.target.value)}>
                                    {this.createSetupItems()}
                                </select>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <select id="player-count" name="playerCount"
                                    value={this.gameSettings.playerCount}
                                    disabled={!this.canChangeGameSettings}
                                    onChange={e => this.onPlayerCountChange(e.target.value)}>
                                    {this.createPlayerCountItems()}
                                </select>
                            </Col>
                            <Col xs="auto">
                                <>Players</>
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
                                                Houses will be randomized before the game starts when this option is selected.
                                            </Tooltip>}>
                                            <label htmlFor="random-houses-setting">Randomize houses</label>
                                        </OverlayTrigger>}
                                    disabled={!this.canChangeGameSettings}
                                    checked={this.gameSettings.randomHouses}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.randomHouses = !this.gameSettings.randomHouses)}
                                />
                            </Col>
                        </Row>
                    </>
                )}
                <Row>
                    <Col xs="auto">
                        <FormCheck
                            id="pbem-setting"
                            type="checkbox"
                            label={
                                <OverlayTrigger overlay={
                                    <Tooltip id="pbem-tooltip">
                                        <b>P</b>lay <b>B</b>y <b>E</b>-<b>M</b>ail<br />
                                        Players receive an e-mail when it is their turn.
                                        Those games are typically played over days or weeks.
                                    </Tooltip>}>
                                    <label htmlFor="pbem-setting">PBEM</label>
                                </OverlayTrigger>}
                            disabled={!this.canChangeGameSettings}
                            checked={this.gameSettings.pbem}
                            onChange={() => this.changeGameSettings(() => this.gameSettings.pbem = !this.gameSettings.pbem)}
                        />
                    </Col>
                </Row>
            </>
        );
    }

    createEditionItems(): ReactNode {
        const items: JSX.Element[] = [];

        this.entireGame.allGameEditionSetups.forEach(([editionId, editionSetups]) => {
            console.log('Putting edition item: ' + editionId)
            items.push(<option key={editionId} value={editionId}>{editionId}</option>);
        })

        return items;
    }

    createSetupItems(): ReactNode {
        const items: JSX.Element[] = [];

        const gameSetups = Object.entries(this.entireGame.getGameEditionSetups(this.gameSettings.gameEdition));

        gameSetups.forEach(([setupId, setupData]) => {
        // this.entireGame.allGameSetups.forEach(([setupId, setupData]) => {
            items.push(<option key={setupId} value={setupId}>{setupData.name}</option>);
        });

        return items;
    }

    createPlayerCountItems(): ReactNode {
        const items: JSX.Element[] = [];

        const playerSetups = this.entireGame.getGameSetupContainer(this.gameSettings.setupId).playerSetups;

        playerSetups.forEach(gameSetup => {
            items.push(<option key={gameSetup.playerCount} value={gameSetup.playerCount}>{gameSetup.playerCount}</option>);
        });

        return items;
    }

    onEditionChange(newVal: string): void {
        this.gameSettings.gameEdition = newVal;

        const editionSetups = this.entireGame.getGameEditionSetups(newVal);
        const setupId = Object.keys(editionSetups)[0];
        this.gameSettings.setupId = setupId;

        console.log(setupId);

        this.changeGameSettings();
    }

    onSetupChange(newVal: string): void {
        this.gameSettings.setupId = newVal;

        // On setup change set player count to it's default value which should be the highest value (last element)
        const container = this.entireGame.getGameSetupContainer(newVal);
        const playerCounts = container.playerSetups.map(playerSetup => playerSetup.playerCount);
        const defaultPlayerCount = playerCounts[playerCounts.length - 1];
        this.gameSettings.playerCount = defaultPlayerCount;

        this.changeGameSettings();
    }

    onPlayerCountChange(newVal: string): void {
        this.gameSettings.playerCount = parseInt(newVal);

        this.changeGameSettings();
    }

    /**
     * Helper function to modify gameSettings and update the game settings.
     * @param action Function that modifies gameSettings
     */
    changeGameSettings(action: () => void = () => {}): void {
        action();

        this.props.entireGame.updateGameSettings(this.gameSettings);
    }
}