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
import { observable } from "mobx";

const DEFAULT_WIDTH = "1910px";
const MIN_WIDTH_FOR_RENDERING_GAME_NICELY = "1740px";

interface AppProps {
    gameClient: GameClient;
}

@observer
export default class App extends Component<AppProps> {
    @observable maxWidth: string = DEFAULT_WIDTH;

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
        return this.entireGame != null && this.entireGame.childGameState instanceof IngameGameState;
    }

    get actualScreenWidth(): string {
        return `${Math.trunc(window.screen.width * window.devicePixelRatio) - 10}px`;
    }

    render(): ReactNode {
        const responsiveLayout = this.user ? this.user.settings.responsiveLayout : false;
        let minWidth = "auto";

        const mobileDevice = isMobile;
        const isConnected = this.isConnected;
        const isGameRunning = this.isGameRunning;

        if (mobileDevice && isConnected && isGameRunning) {
            minWidth = responsiveLayout ? "auto" : DEFAULT_WIDTH;
        }

        if (!mobileDevice && isConnected && isGameRunning) {
            minWidth = MIN_WIDTH_FOR_RENDERING_GAME_NICELY;
        }

        return (
            <Container fluid={responsiveLayout} style={{ marginTop: "0.75rem", marginBottom: "2rem", maxWidth: this.maxWidth, minWidth: minWidth }}>
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

    setMaxWidth(): void {
        if (!isMobile) {
            this.maxWidth = this.actualScreenWidth;
        } else {
            this.maxWidth = DEFAULT_WIDTH;
        }
    }

    componentDidMount(): void {
        if (!isMobile) {
            window.addEventListener('resize', () => this.setMaxWidth());
        }

        this.setMaxWidth();
    }

    componentWillUnmount(): void {
        if (!isMobile) {
            window.removeEventListener('resize', () => this.setMaxWidth());
        }
    }
}