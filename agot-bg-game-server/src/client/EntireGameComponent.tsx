import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import EntireGame from "../common/EntireGame";
import GameClient from "./GameClient";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import IngameComponent from "./IngameComponent";
import LobbyComponent from "./LobbyComponent";

interface EntireGameComponentProps {
    entireGame: EntireGame;
    gameClient: GameClient;
}

@observer
export default class EntireGameComponent extends Component<EntireGameComponentProps> {
    render(): ReactNode {
        return (
            this.props.entireGame.childGameState instanceof LobbyGameState ? (
                <LobbyComponent gameClient={this.props.gameClient} gameState={this.props.entireGame.childGameState}/>
            ) : this.props.entireGame.childGameState instanceof IngameGameState && (
                <IngameComponent gameClient={this.props.gameClient} gameState={this.props.entireGame.childGameState}/>
            )
        );
    }
}
