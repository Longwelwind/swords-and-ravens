import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import GameClient from "./GameClient";
import { GameSettings } from "../common/EntireGame";
import EntireGame from "../common/EntireGame";

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
            <FormCheck
                type="checkbox"
                label="PBEM"
                disabled={!this.canChangeGameSettings}
                onChange={() => this.changeGameSettings(() => this.gameSettings.pbem = !this.gameSettings.pbem)}
            />
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