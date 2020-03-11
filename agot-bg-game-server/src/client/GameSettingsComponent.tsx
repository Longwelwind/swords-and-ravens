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

interface GameSettingsComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
}

@observer
export default class GameSettingsComponent extends Component<GameSettingsComponentProps> {
    get gameSettings(): GameSettings {
        return this.props.entireGame.gameSettings;
    }

    get canChangeGameSettings(): boolean {
        return this.props.gameClient.isOwner();
    }

    render(): ReactNode {
        return (
            <>
                {this.props.entireGame.childGameState instanceof LobbyGameState && (
                    <Row>
                        <Col xs="auto">
                            <input
                                type="range"
                                className="custom-range"
                                min={3}
                                max={6}
                                value={this.gameSettings.playerCount}
                                onChange={e => this.changeGameSettings(() => this.gameSettings.playerCount = parseInt(e.target.value))}
                                disabled={!this.canChangeGameSettings}
                            />
                        </Col>
                        <Col xs="auto">
                            <div style={{marginLeft: "10px"}}>
                                {this.gameSettings.playerCount} players
                            </div>
                        </Col>
                    </Row>
                )}
                <FormCheck
                    id="pbem-setting"
                    type="checkbox"
                    label="PBEM"
                    disabled={!this.canChangeGameSettings}
                    checked={this.gameSettings.pbem}
                    onChange={() => this.changeGameSettings(() => this.gameSettings.pbem = !this.gameSettings.pbem)}
                />
            </>
        );
    }

    /**
     * Helper function to modify gameSettings and update the game settings.
     * @param action Function that modifies gameSettings
     */
    changeGameSettings(action: () => void): void {
        action();

        this.props.entireGame.updateGameSettings(this.props.entireGame.gameSettings);
    }
}