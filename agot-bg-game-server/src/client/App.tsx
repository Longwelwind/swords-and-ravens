import * as React from "react";
import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameClient, { ConnectionState } from "./GameClient";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import EntireGameComponent from "./EntireGameComponent";
import Alert from "react-bootstrap/Alert";
import User from "../server/User";
import { isMobile } from 'react-device-detect';
import EntireGame from "../common/EntireGame";
import IngameGameState from "../common/ingame-game-state/IngameGameState";


interface AppProps {
    gameClient: GameClient;
}

@observer
export default class App extends Component<AppProps> {
    get user(): User | null {
        return this.props.gameClient.authenticatedUser;
    }

    get entireGame(): EntireGame | null {
        return this.props.gameClient.entireGame;
    }

    get isConnected(): boolean {
        return this.props.gameClient.connectionState == ConnectionState.SYNCED && this.entireGame != null;
    }

    get isGameRunning(): boolean {
        return this.entireGame?.childGameState instanceof IngameGameState;
    }

    get is8pGame(): boolean {
        return this.isGameRunning && (this.entireGame?.gameSettings.playerCount ?? -1) >= 8;
    }

    get actualScreenWidth(): number {
        return Math.trunc(window.screen.width * window.devicePixelRatio);
    }

    render(): ReactNode {
        const minWidth = isMobile && this.isGameRunning ? this.is8pGame ? "2500px" : "2000px" : "auto";
        return (
            <Container fluid={false} style={{
                paddingTop: "0.5rem",
                paddingBottom: "1rem",
                paddingRight: "3rem",
                paddingLeft: "3rem",
                maxWidth: "2800px",
                minWidth: minWidth,
                overflowX: "hidden" }}>
                <Row className="justify-content-center">
                    {this.props.gameClient.connectionState == ConnectionState.INITIALIZING ? (
                        <Col xs={3}>
                            Initializing
                        </Col>
                    ) : this.props.gameClient.connectionState == ConnectionState.CONNECTING ? (
                        <Col xs={3}>
                            Connecting
                        </Col>
                    ) : this.props.gameClient.connectionState == ConnectionState.AUTHENTICATING ? (
                        <Col xs={3}>
                            Authenticating
                        </Col>
                    ) : this.isConnected ? (
                        <EntireGameComponent gameClient={this.props.gameClient} entireGame={this.props.gameClient.entireGame as EntireGame} />
                    ) : this.props.gameClient.connectionState == ConnectionState.CLOSED ? (
                        <Col xs={12} md={3}>
                            <Alert variant="danger">
                                <p>
                                    Disconnection with the server.
                                </p>
                                <p>
                                    Please refresh this page.
                                </p>
                            </Alert>
                        </Col>
                    ) : (function () { throw "Should never happen" })()}
                </Row>
            </Container>
        );
    }
}