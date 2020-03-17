import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameClient from "./GameClient";
import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import ChatComponent from "./chat-client/ChatComponent";
import CancelledGameState from "../common/cancelled-game-state/CancelledGameState";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


interface CancelledComponentProps {
    gameClient: GameClient;
    gameState: CancelledGameState;
}

@observer
export default class CancelledComponent extends Component<CancelledComponentProps> {
    render(): ReactNode {
        return (
            <Col xs={12} sm={10} md={8} lg={6} xl={3}>
                <Row>
                    <Col>
                        <Card border="danger" bg="danger">
                            <Card.Body className="text-center">
                                <FontAwesomeIcon icon={faTimes} size="3x"/><br/>
                                This game has been cancelled
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Card>
                            <Card.Body>
                                <ChatComponent gameClient={this.props.gameClient}
                                               entireGame={this.props.gameState.entireGame}
                                               roomId={this.props.gameState.entireGame.publicChatRoomId}
                                               currentlyViewed={true}/>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Col>
        );
    }
}
