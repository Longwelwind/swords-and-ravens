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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons";

interface AppProps {
    gameClient: GameClient;
}

@observer
export default class App extends Component<AppProps> {
    //onVisibilityChangedCallback: (() => void) | null = null;

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
        return this.isConnected && this.entireGame?.childGameState instanceof IngameGameState;
    }

    get is8pGame(): boolean {
        return this.isGameRunning && (this.entireGame?.gameSettings.playerCount ?? -1) >= 8;
    }

    render(): ReactNode {
        const minWidth = isMobile && this.isGameRunning
            ? this.is8pGame
                ? "2550px"
                : "2000px"
            : "auto";
        return <Container id="game-container" fluid={false} style={{
            paddingTop: "0.5rem",
            paddingBottom: "1rem",
            paddingRight: "3rem",
            paddingLeft: "3rem",
            maxWidth: "2800px",
            minWidth: minWidth,
            overflowX: "hidden"
        }}>
            <Row className="justify-content-center">
            {this.props.gameClient.isReconnecting
                ? <Col xs="auto" className="m-4 p-3 text-center">
                    <Alert variant="warning">
                        <h4>The connection to the server is interrupted.<br/>
                        <span className="loader">Trying to reconnect</span></h4>
                    </Alert>
                </Col>
                : this.props.gameClient.connectionState == ConnectionState.INITIALIZING
                    ? <Col xs="auto" className="m-4 p-3 text-center"><h4><span className="loader">Initializing</span></h4></Col>
                    : this.props.gameClient.connectionState == ConnectionState.CONNECTING
                        ? <Col xs="auto" className="m-4 p-3 text-center"><h4><span className="loader">Connecting</span></h4></Col>
                        :  this.props.gameClient.connectionState == ConnectionState.AUTHENTICATING
                            ? <Col xs="auto" className="m-4 p-3 text-center"><h4><span className="loader">Authenticating</span></h4></Col>
                            : this.isConnected && this.props.gameClient.entireGame
                                ? <EntireGameComponent gameClient={this.props.gameClient} entireGame={this.props.gameClient.entireGame as EntireGame} />
                                : this.props.gameClient.connectionState == ConnectionState.CLOSED
                                    ? <>
                                        <Col xs="auto" className="m-4 p-3 text-center">
                                            <Alert variant="danger">
                                                <h4>The connection to the server is lost.<br/>
                                                Please reload this page.</h4>
                                                <button className="btn btn-outline-dark mt-3"
                                                    onClick={() => { window.location.reload() }}
                                                >
                                                    <FontAwesomeIcon icon={faRotateRight} size="lg" /><h5 className="ml-2 d-inline">Reload</h5>
                                                </button>
                                            </Alert>
                                        </Col>
                                    </>
                                    : <Col xs="auto" className="m-4 p-3 text-center"><span className="loader">Error</span></Col>}
            </Row>
        </Container>;
    }

/*
    onVisibilityChanged(): void {
        if (document.visibilityState != "visible") {
            return;
        }

        window.setTimeout(() => {
            this.props.gameClient.reconnect();
        }, 500);
    }

    componentDidMount(): void {
        const visibilityChangedCallback = (): void => this.onVisibilityChanged();
        document.addEventListener("visibilitychange", visibilityChangedCallback);
        this.onVisibilityChangedCallback = visibilityChangedCallback;
    }

    componentWillUnmount(): void {
        const visibilityChangedCallback = this.onVisibilityChangedCallback;
        if (visibilityChangedCallback) {
            document.removeEventListener("visibilitychange", visibilityChangedCallback);
        }
    }
*/
}