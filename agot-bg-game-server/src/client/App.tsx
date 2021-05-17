import * as React from "react";
import {Component, ReactNode} from "react";
import {observer} from "mobx-react";
import GameClient, {ConnectionState} from "./GameClient";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import EntireGameComponent from "./EntireGameComponent";
import Alert from "react-bootstrap/Alert";
import User from "../server/User";
import {isMobile} from 'react-device-detect';
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
        return this.props.gameClient.connectionState == ConnectionState.SYNCED &&  this.entireGame != null;
    }

    get isGameRunning(): boolean {
        return this.entireGame != null && this.entireGame.childGameState instanceof IngameGameState;
    }

    render(): ReactNode {
        const responsiveLayout = this.user ? this.user.settings.responsiveLayout : false;
        let minWidth = "auto";

        const mobileDevice = isMobile;
        const isConnected = this.isConnected;
        const isGameRunning = this.isGameRunning;

        if (mobileDevice && isConnected && isGameRunning) {
            minWidth = responsiveLayout ? "auto" : "1910px";
        }

        if (!mobileDevice && isConnected && isGameRunning) {
            minWidth = "1650px";
        }

        return (
            <Container fluid={responsiveLayout} style={{marginTop: "0.75rem", marginBottom: "2rem", maxWidth: "1910px", minWidth: minWidth}}>
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
                    ) : (function() { throw "Should never happen" })()}
                </Row>
            </Container>
        );
    }
}
