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
import EntireGame from "../common/EntireGame";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";
import { observable } from "mobx";

interface LobbyComponentProps {
    gameClient: GameClient;
    gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
    get authenticatedUser(): User {
        return this.props.gameClient.authenticatedUser as User;
    }

    get entireGame(): EntireGame {
        return this.lobby.entireGame;
    }

    get randomHouses(): boolean {
        return this.entireGame.gameSettings.randomHouses;
    }

    get lobby(): LobbyGameState {
        return this.props.gameState;
    }

    @observable chatHeight = 430;

    render(): ReactNode {
        const {success: canStartGame, reason: canStartGameReason} = this.lobby.canStartGame(this.authenticatedUser);
        const {success: canCancelGame, reason: canCancelGameReason} = this.lobby.canCancel(this.authenticatedUser);

        return <>
                <Col xs={10} lg={4} className="mb-3">
                    <Card id="lobby-houses-list">
                        <ListGroup variant="flush">
                            {this.lobby.lobbyHouses.values.map((h, i) => (
                                <ListGroupItem key={h.id} style={{opacity: this.isHouseAvailable(h) ? 1 : 0.3}}>
                                    <Row className="align-items-center">
                                        {!this.randomHouses && <Col xs="auto">
                                            <SimpleInfluenceIconComponent house={h}/>
                                        </Col>}
                                        <Col>
                                            <div>
                                                <b>{this.randomHouses ? "Seat " + (i + 1): h.name}</b>
                                            </div>
                                            <div className={classNames({"invisible": !this.lobby.players.has(h)})}>
                                                {this.lobby.players.has(h) && <UserLabel
                                                            gameClient={this.props.gameClient}
                                                            gameState={this.lobby}
                                                            user={this.lobby.players.get(h)}/>}
                                            </div>
                                        </Col>
                                        {this.isHouseAvailable(h) && (
                                            !this.lobby.players.has(h) ? (
                                                <Col xs="auto">
                                                    <Button onClick={() => this.choose(h)}>Choose</Button>
                                                </Col>
                                            ) : this.lobby.players.get(h) == this.authenticatedUser ? (
                                                <Col xs="auto">
                                                    <Button variant="danger" onClick={() => this.leave()}>Leave</Button>
                                                </Col>
                                            ) : (
                                                this.lobby.entireGame.isOwner(this.authenticatedUser) && (
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
                <Col xs={10} lg={6} className="mb-3">
                    <Card>
                        <Card.Body style={{height: this.chatHeight}}>
                            <ChatComponent gameClient={this.props.gameClient}
                                        entireGame={this.lobby.entireGame}
                                        roomId={this.lobby.entireGame.publicChatRoomId}
                                        currentlyViewed={true}/>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={10} lg={5}>
                    <Card>
                        <Card.Body>
                            <Row>
                                <Col>
                                    <GameSettingsComponent
                                        gameClient={this.props.gameClient}
                                        entireGame={this.lobby.entireGame} />
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
                                            onClick={() => this.lobby.start()}
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
        </>;
    }

    isHouseAvailable(house: LobbyHouse): boolean {
        return this.lobby.getAvailableHouses().includes(house);
    }

    choose(house: LobbyHouse): void {
        this.lobby.chooseHouse(house);
    }

    kick(house: LobbyHouse): void {
        this.lobby.kick(this.lobby.players.get(house));
    }

    cancel(): void {
        if (confirm("Are you sure you want to cancel the game?")) {
            this.lobby.cancel();
        }
    }

    leave(): void {
        this.lobby.chooseHouse(null);
    }

    componentDidMount(): void {
        window.addEventListener('resize', () => this.setChatHeight());
        this.setChatHeight();
    }

    componentWillUnmount(): void {
        window.removeEventListener('resize', () => this.setChatHeight());
    }

    setChatHeight(): void {
        const lobbyHousesList = document.getElementById("lobby-houses-list");
        const boundingClientRect = lobbyHousesList ? lobbyHousesList.getBoundingClientRect() : null;
        this.chatHeight = boundingClientRect ? boundingClientRect.height : 430;
    }
}
