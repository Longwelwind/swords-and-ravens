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
import classNames from "classnames";
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
import DebouncedPasswordComponent from "./utils/DebouncedPasswordComponent";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { setBoltonInfluenceImage, setStarkInfluenceImage } from "./houseInfluenceImages";

interface LobbyComponentProps {
    gameClient: GameClient;
    gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
    @observable password = this.props.gameClient.isRealOwner() ? this.props.gameState.password : "";

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
                <Col xs={10} xl={4} className="mb-3">
                    <Card>
                        <Card.Body id="lobby-houses-list" className="no-space-around">
                            <ListGroup variant="flush">
                                {this.lobby.lobbyHouses.values.map((h, i) => (
                                    <ListGroupItem key={h.id} style={{minHeight: "62px"}}>
                                        <Row className="align-items-center" style={{opacity: this.isHouseAvailable(h) ? 1 : 0.3}}>
                                            {!this.randomHouses && <Col xs="auto" className="no-gutters">
                                                <SimpleInfluenceIconComponent house={h}/>
                                            </Col>}
                                            <Col className="no-gutters">
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
                                            {this.renderLobbyHouseButtons(h)}
                                        </Row>
                                    </ListGroupItem>
                                ))}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={10} xl={6} className="mb-3">
                    <Card>
                        <Card.Body style={{height: this.chatHeight}}>
                            <ChatComponent gameClient={this.props.gameClient}
                                        entireGame={this.lobby.entireGame}
                                        roomId={this.lobby.entireGame.publicChatRoomId}
                                        currentlyViewed={true}/>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={11}>
                    <Row className="justify-content-center no-space-around">
                        <Card>
                            <Card.Body style={{paddingTop: "10px", paddingBottom: "10px"}}>
                                <Row>
                                    <GameSettingsComponent
                                        gameClient={this.props.gameClient}
                                        entireGame={this.lobby.entireGame} />
                                </Row>
                                {(this.props.gameClient.isRealOwner() || this.props.gameState.password != "") &&
                                <Row className="mt-2">
                                    <Col>
                                        <Row className="justify-content-center">
                                            <DebouncedPasswordComponent
                                                password={this.password}
                                                onChangeCallback={newPassword => {
                                                    this.password = newPassword;
                                                    this.props.gameState.sendPassword(newPassword);
                                                }}
                                            />
                                        </Row>
                                    </Col>
                                </Row>}
                                <Row className="mt-3">
                                    <Col>
                                        <Button
                                            block
                                            onClick={() => this.lobby.start()}
                                            disabled={!canStartGame}
                                        >
                                            <ConditionalWrap
                                                condition={!canStartGame}
                                                wrap={children =>
                                                    <OverlayTrigger
                                                        overlay={
                                                            <Tooltip id="start-game">
                                                                {canStartGameReason == "not-enough-players" ?
                                                                    "More players must join to be able to start the game."
                                                                : canStartGameReason == "targaryen-must-be-a-player-controlled-house" ?
                                                                    "House Targaryen must be chosen by a player"
                                                                : canStartGameReason == "not-owner" ?
                                                                    "Only the owner of the game can start it"
                                                                : null}
                                                            </Tooltip>
                                                        }
                                                    >
                                                        {children}
                                                    </OverlayTrigger>
                                                }
                                            >
                                                <span>Start</span>
                                            </ConditionalWrap>
                                        </Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button
                                            variant="danger"
                                            onClick={() => this.cancel()}
                                            disabled={!canCancelGame}
                                        >
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
                                                <FontAwesomeIcon icon={faTimes} />
                                            </ConditionalWrap>
                                        </Button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Row>
                </Col>
        </>;
    }

    renderLobbyHouseButtons(h: LobbyHouse): React.ReactNode {
        const invisible = !this.isHouseAvailable(h);

        if (!this.props.gameClient.isRealOwner() &&
            this.props.gameState.password != "" &&
            this.password != this.props.gameState.password &&
            // If user is already seated, allow them to "Leave"
            (!this.lobby.players.has(h) || this.lobby.players.get(h) != this.authenticatedUser)) {
            return <Col xs="auto" className={invisible ? "invisible" : ""}>
                <FontAwesomeIcon icon={faLock} size="2x"/>
            </Col>;
        }

        return  (
            !this.lobby.players.has(h) ? (
                <Col xs="auto" className={invisible ? "invisible" : ""}>
                    <Button onClick={() => this.choose(h)}>Choose</Button>
                </Col>
            ) : this.lobby.players.get(h) == this.authenticatedUser ? (
                <Col xs="auto" className={invisible ? "invisible" : ""}>
                    <Button variant="danger" onClick={() => this.leave()}>Leave</Button>
                </Col>
            ) : (
                this.props.gameClient.isOwner() && (
                    <Col xs="auto" className={invisible ? "invisible" : ""}>
                        <Button variant="danger" onClick={() => this.kick(h)}>Kick</Button>
                    </Col>
                )
            )
        );
    }

    isHouseAvailable(house: LobbyHouse): boolean {
        return this.lobby.getAvailableHouses().includes(house);
    }

    choose(house: LobbyHouse): void {
        this.lobby.chooseHouse(house, this.password);
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
        this.lobby.chooseHouse(null, this.password);
    }

    UNSAFE_componentWillUpdate(): void {
        if (this.entireGame.gameSettings.adwdHouseCards) {
            setBoltonInfluenceImage();
            this.lobby.lobbyHouses.get("stark").name = "Bolton";
        } else {
            setStarkInfluenceImage();
            this.lobby.lobbyHouses.get("stark").name = "Stark";
        }
    }

    componentDidMount(): void {
        this.setChatHeight();
    }

    setChatHeight(): void {
        this.chatHeight = document.getElementById("lobby-houses-list")?.getBoundingClientRect()?.height ?? 496;
    }
}
