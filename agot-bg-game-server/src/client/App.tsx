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

interface AppProps {
    gameClient: GameClient;
}

@observer
export default class App extends Component<AppProps> {
    get authenticatedUser(): User | null {
        return this.props.gameClient.authenticatedUser;
    }
    render(): ReactNode {
        const responsiveLayout = this.authenticatedUser ? this.authenticatedUser.settings.responsiveLayout : false;
        const minWidth = responsiveLayout ? "auto" : "1920px";
        return (
            <Container fluid={responsiveLayout} style={{marginTop: "1rem", marginBottom: "4.5rem", maxWidth: "1920px", minWidth: minWidth}}>
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
                    ) : this.props.gameClient.connectionState == ConnectionState.SYNCED && this.props.gameClient.entireGame ? (
                        <EntireGameComponent gameClient={this.props.gameClient} entireGame={this.props.gameClient.entireGame} />
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
