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
import ChatComponent from "./chat-client/ChatComponent";
import GameSettingsComponent from "./GameSettingsComponent";
import User from "../server/User";
import ConditionalWrap from "./utils/ConditionalWrap";
import { OverlayTrigger } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";
import UserLabel from "./UserLabel";

interface LobbyComponentProps {
    gameClient: GameClient;
    gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
    get authenticatedUser(): User {
        return this.props.gameClient.authenticatedUser as User;
    }

    get randomHouses(): boolean {
        return this.props.gameState.entireGame.gameSettings.randomHouses;
    }

    render(): ReactNode {
        const {success: canStartGame, reason: canStartGameReason} = this.props.gameState.canStartGame(this.authenticatedUser);
        const {success: canCancelGame, reason: canCancelGameReason} = this.props.gameState.canCancel(this.authenticatedUser);

        return (
            <Col xs={12} sm={10} md={8} lg={6} xl={3}>
                <Row>
                    <Col>
                        <Card>
                            <ListGroup variant="flush">
                                {this.props.gameState.lobbyHouses.values.map((h, i) => (
                                    <ListGroupItem key={h.id} style={{opacity: this.isHouseAvailable(h) ? 1 : 0.3}}>
                                        <Row className="align-items-center">
                                            {!this.randomHouses && <Col xs="auto">
                                                <div className="influence-icon"
                                                     style={{backgroundImage: `url(${houseInfluenceImages.get(h.id)})`}}>
                                                </div>
                                            </Col>}
                                            <Col>
                                                <div>
                                                    <b>{this.randomHouses ? "Seat " + (i + 1): h.name}</b>
                                                </div>
                                                <div className={classNames({"invisible": !this.props.gameState.players.has(h)})}>
                                                    {this.props.gameState.players.has(h) ? (
                                                        <UserLabel
                                                            gameClient={this.props.gameClient}
                                                            gameState={this.props.gameState}
                                                            user={this.props.gameState.players.get(h)}
                                                        />
                                                    ) : <div className="small">XXX</div>}
                                                </div>
                                            </Col>
                                            {this.isHouseAvailable(h) && (
                                                !this.props.gameState.players.has(h) ? (
                                                    <Col xs="auto">
                                                        <Button onClick={() => this.choose(h)}>Choose</Button>
                                                    </Col>
                                                ) : this.props.gameState.players.get(h) == this.authenticatedUser ? (
                                                    <Col xs="auto">
                                                        <Button variant="danger" onClick={() => this.leave()}>Leave</Button>
                                                    </Col>
                                                ) : (
                                                    this.props.gameState.entireGame.isOwner(this.authenticatedUser) && (
                                                        <Col xs="auto">
                                                            <Button variant="danger" onClick={() => this.kick(h)}>Kick</Button>
                                                        </Col>
                                                    )
                                                )
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
                                <ChatComponent gameClient={this.props.gameClient}
                                               entireGame={this.props.gameState.entireGame}
                                               roomId={this.props.gameState.entireGame.publicChatRoomId}
                                               currentlyViewed={true}/>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Card>
                            <Card.Body>
                                <Row>
                                    <Col>
                                        <GameSettingsComponent
                                            gameClient={this.props.gameClient}
                                            entireGame={this.props.gameState.entireGame} />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col>
                                        <ConditionalWrap
                                            condition={!canStartGame}
                                            wrap={children =>
                                                <OverlayTrigger
                                                    overlay={
                                                        <Tooltip id="start-game">
                                                            {canStartGameReason == "not-owner" ?
                                                                "Only the owner of the game can start it"
                                                            : canStartGameReason == "not-enough-players" ?
                                                                "Not all houses have been taken"
                                                            : null}
                                                        </Tooltip>
                                                    }
                                                >
                                                    {children}
                                                </OverlayTrigger>
                                            }
                                        >
                                            <Button
                                                block
                                                onClick={() => this.props.gameState.start()}
                                                disabled={!canStartGame}
                                            >
                                                Start
                                            </Button>
                                        </ConditionalWrap>
                                    </Col>
                                    <Col xs="auto">
                                    <ConditionalWrap
                                            condition={!canCancelGame}
                                            wrap={children =>
                                                <OverlayTrigger
                                                    overlay={
                                                        <Tooltip id="start-game">
                                                            {canCancelGameReason == "not-owner" ?
                                                                "Only the owner of the game can cancel it"
                                                            : null}
                                                        </Tooltip>
                                                    }
                                                >
                                                    {children}
                                                </OverlayTrigger>
                                            }
                                        >
                                            <Button
                                                variant="danger"
                                                onClick={() => this.cancel()}
                                                disabled={!canCancelGame}
                                            >
                                                <FontAwesomeIcon icon={faTimes} />
                                            </Button>
                                        </ConditionalWrap>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Col>
        );
    }

    isHouseAvailable(house: LobbyHouse): boolean {
        return this.props.gameState.getAvailableHouses().includes(house);
    }

    choose(house: LobbyHouse): void {
        this.props.gameState.chooseHouse(house);
    }

    kick(house: LobbyHouse): void {
        this.props.gameState.kick(this.props.gameState.players.get(house));
    }

    cancel(): void {
        if (confirm("Are you sure you want to cancel the game?")) {
            this.props.gameState.cancel();
        }
    }

    leave(): void {
        this.props.gameState.chooseHouse(null);
    }
}
