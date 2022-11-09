import * as React from "react";
import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameClient, { ConnectionState } from "./GameClient";
import Container from "react-bootstrap/Container";
import { Modal, ProgressBar } from "react-bootstrap";
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

    get isConnecting(): boolean {
        return this.props.gameClient.connectionState == ConnectionState.INITIALIZING ||
            this.props.gameClient.connectionState == ConnectionState.AUTHENTICATING ||
            this.props.gameClient.connectionState == ConnectionState.CONNECTING ;
    }
  
    get isReconnecting(): boolean {
        return this.props.gameClient.previousReconnectAttempts > 0;
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

    render(): ReactNode {
        const minWidth = isMobile && this.isGameRunning ? this.is8pGame ? "2550px" : "2000px" : "auto";
        return <>
            <Container fluid={false} style={{
                paddingTop: "0.5rem",
                paddingBottom: "1rem",
                paddingRight: "3rem",
                paddingLeft: "3rem",
                maxWidth: "2800px",
                minWidth: minWidth,
                overflowX: "hidden"
            }}>
                <Row className="justify-content-center">
                    {this.isConnected  && this.props.gameClient.entireGame ? (
                        <EntireGameComponent gameClient={this.props.gameClient} entireGame={this.props.gameClient.entireGame as EntireGame} />
                    ) : this.props.gameClient.connectionState == ConnectionState.CLOSED && (
                        <Col xs="auto" className="m-4 p-3">
                            <Alert variant="danger" className="text-center">
                                <h4>The connection to the server is lost.<br/>
                                Please reload this page.</h4>
                            </Alert>
                        </Col>
                    )}
                </Row>
            </Container>
            <Modal
                    show={this.isConnecting || this.isReconnecting}
                    animation={true}
                    backdrop="static"
                    keyboard={false}
                >
                    <Modal.Body>
                        {this.renderConnectingModalBody()}
                    </Modal.Body>
                </Modal>
        </>;
    }

    renderConnectingModalBody(): ReactNode {
        return <Row className="justify-content-center text-center">
            {this.isReconnecting &&
                <Col xs="12">
                    <Alert variant="warning" className="mb-0">
                        <h5>The connection to the server is interrupted.<br/>
                        We&apos;re trying to reconnect!</h5>
                    </Alert>
                </Col>
            }
            <Col xs="12" className="text-large">
                {this.props.gameClient.connectionState == ConnectionState.INITIALIZING 
                    ? "Initializing ..."
                    : this.props.gameClient.connectionState == ConnectionState.CONNECTING
                        ? "Connecting ..."
                        :  this.props.gameClient.connectionState == ConnectionState.AUTHENTICATING
                            ? "Authenticating ..." 
                            : <div className="invisible">Initializing ...</div>}
            </Col>
            <Col>
                <ProgressBar animated variant="warning" now={100} />
            </Col>
        </Row>;
    }
}