import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import LobbyGameState, {LobbyHouse} from "../common/lobby-game-state/LobbyGameState";
import GameClient from "./GameClient";
import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import houseInfluenceImages from "./houseInfluenceImages";
import classNames = require("classnames");

interface LobbyComponentProps {
    gameClient: GameClient;
    gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
    render(): ReactNode {
        return (
            <Col xs={3}>
                <Row>
                    <Col>
                        <Card>
                            <ListGroup variant="flush">
                                {this.props.gameState.availableHouses.values.map(h => (
                                    <ListGroupItem key={h.id}>
                                        <Row className="align-items-center">
                                            <Col xs="auto">
                                                <div className="influence-icon"
                                                     style={{backgroundImage: `url(${houseInfluenceImages.get(h.id)})`}}>
                                                </div>
                                            </Col>
                                            <Col>
                                                <div>
                                                    <b>{h.name}</b>
                                                </div>
                                                <div className={classNames({"invisible": !this.props.gameState.players.has(h)})}>
                                                    <i>
                                                        {this.props.gameState.players.has(h) ? this.props.gameState.players.get(h).name : "XXX"}
                                                    </i>
                                                </div>
                                            </Col>
                                            {!this.props.gameState.players.has(h) ? (
                                                <Col xs="auto">
                                                    <Button onClick={() => this.choose(h)}>Choose</Button>
                                                </Col>
                                            ) : this.props.gameState.players.get(h) == this.props.gameClient.authenticatedUser && (
                                                <Col xs="auto">
                                                    <Button variant="danger" onClick={() => this.leave()}>Leave</Button>
                                                </Col>
                                            )}
                                        </Row>
                                    </ListGroupItem>
                                ))}
                            </ListGroup>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Button
                                    block
                                    onClick={() => this.props.gameState.start()}
                                    disabled={!this.props.gameState.canStartGame() || !this.props.gameClient.isOwner()}
                                >
                                    Start
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Col>
        );
    }

    choose(house: LobbyHouse): void {
        this.props.gameState.chooseHouse(house);
    }

    leave(): void {
        this.props.gameState.chooseHouse(null);
    }
}
