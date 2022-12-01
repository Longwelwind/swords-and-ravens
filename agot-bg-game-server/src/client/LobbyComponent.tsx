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
import { Badge, OverlayTrigger, Spinner } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";
import UserLabel from "./UserLabel";
import EntireGame from "../common/EntireGame";
import HouseIconComponent from "./game-state-panel/utils/HouseIconComponent";
import { observable } from "mobx";
import DebouncedPasswordComponent from "./utils/DebouncedPasswordComponent";
import { faCheck, faLock } from "@fortawesome/free-solid-svg-icons";
import { setBoltonIconImage, setStarkIconImage } from "./houseIconImages";
import megaphoneImage from "../../public/images/icons/megaphone.svg";
import speakerOffImage from "../../public/images/icons/speaker-off.svg";
import musicalNotesImage from "../../public/images/icons/musical-notes.svg";
import getUserLinkOrLabel from "./utils/getIngameUserLinkOrLabel";
// @ts-expect-error Somehow ts complains that this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";
import _ from "lodash";


interface LobbyComponentProps {
    gameClient: GameClient;
    gameState: LobbyGameState;
}

@observer
export default class LobbyComponent extends Component<LobbyComponentProps> {
    @observable password = this.props.gameClient.isRealOwner() ? this.lobby.password : "";

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

    get readyCheckOngoing(): boolean {
        return this.lobby.readyUsers != null;
    }

    @observable chatHeight = 430;

    render(): ReactNode {
        const {success: canStartGame, reason: canStartGameReason} = this.lobby.canStartGame(this.authenticatedUser);
        const {success: canCancelGame, reason: canCancelGameReason} = this.lobby.canCancel(this.authenticatedUser);

        const connectedSpectators = this.getConnectedSpectators();

        return <>
                <Col xs={10} xl={4} className="mb-3">
                    <Card>
                        <Card.Body id="lobby-houses-list" className="no-space-around">
                            <ListGroup variant="flush">
                                {this.lobby.lobbyHouses.values.map((h, i) => (
                                    <ListGroupItem key={`lobby-house_${h.id}`} style={{minHeight: "62px"}}>
                                        <Row className="align-items-center" style={{opacity: this.isHouseAvailable(h) ? 1 : 0.3}}>
                                            {!this.randomHouses && <Col xs="auto" className="no-gutters">
                                                <HouseIconComponent house={h}/>
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
                <Col xs={10} xl={8} className="mb-3">
                    <Row className="no-space-around">
                        <Col xs={connectedSpectators.length > 0 ? 8 : 12} className="no-space-around">
                            <Card>
                                <Card.Body style={{height: this.chatHeight}}>
                                    <ChatComponent gameClient={this.props.gameClient}
                                                entireGame={this.lobby.entireGame}
                                                roomId={this.lobby.entireGame.publicChatRoomId}
                                                currentlyViewed={true}
                                                getUserDisplayName={u =>
                                                    <a href={`/user/${u.id}`} target="_blank" rel="noopener noreferrer" style={{color: "white"}}><b>{u.name}</b></a>
                                                }
                                    />
                                </Card.Body>
                            </Card>
                        </Col>
                        {connectedSpectators.length > 0 && <Col className="no-space-around">
                            <Card className="ml-2">
                                <Card.Body style={{height: this.chatHeight, padding: "1rem"}}>
                                    <div className="d-flex flex-column h-100">
                                        <span>Spectators:</span>
                                        <ScrollToBottom className="mb-2 flex-fill-remaining" scrollViewClassName="overflow-x-hidden">
                                            {connectedSpectators.map(u => <div key={`specatator_${u.id}`}><b>{getUserLinkOrLabel(this.entireGame, u, null)}</b></div>)}
                                        </ScrollToBottom>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>}
                    </Row>
                </Col>
                <Col xs={11}>
                    <Row className="justify-content-center no-space-around">
                        <Card>
                            <Card.Body style={{paddingTop: "10px", paddingBottom: "10px"}}>
                                {!this.props.gameClient.isRealOwner() && this.lobby.password != "" && !this.readyCheckOngoing &&
                                    this.renderPasswordInput()
                                }
                                <Row>
                                    <GameSettingsComponent
                                        gameClient={this.props.gameClient}
                                        entireGame={this.lobby.entireGame} />
                                </Row>
                                {this.props.gameClient.isRealOwner() && !this.readyCheckOngoing &&
                                    this.renderPasswordInput()
                                }
                                <Row className="mt-3">
                                    <Col>
                                        <Button
                                            block
                                            onClick={() => this.lobby.start()}
                                            disabled={!canStartGame || this.readyCheckOngoing}
                                        >
                                            <ConditionalWrap
                                                condition={!canStartGame || this.readyCheckOngoing}
                                                wrap={children =>
                                                    <OverlayTrigger
                                                        overlay={
                                                            <Tooltip id="start-game">
                                                                {this.readyCheckOngoing ?
                                                                    "Ready check is ongoing"
                                                                : canStartGameReason == "not-enough-players" ?
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
                                                {this.lobby.settings.pbem ? <span>Start</span> : <span>Launch Ready Check to start the game</span>}
                                            </ConditionalWrap>
                                        </Button>
                                    </Col>
                                    <Col xs="auto">
                                        <Button
                                            variant="danger"
                                            onClick={() => this.cancel()}
                                            disabled={!canCancelGame || this.readyCheckOngoing}
                                        >
                                            <ConditionalWrap
                                                condition={!canCancelGame || this.readyCheckOngoing}
                                                wrap={children =>
                                                    <OverlayTrigger
                                                        overlay={
                                                            <Tooltip id="start-game">
                                                                {this.readyCheckOngoing ?
                                                                    "Ready check is ongoing"
                                                                : canCancelGameReason == "not-owner" ?
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
                                    <Col xs="auto">
                                        <button className="btn btn-outline-light btn-sm" onClick={() => this.props.gameClient.muted = !this.props.gameClient.muted}>
                                            <OverlayTrigger
                                                overlay={
                                                    <Tooltip id="mute-tooltip">
                                                        {this.props.gameClient.muted
                                                            ? "Unmute notifications"
                                                            : "Mute notifications"}
                                                    </Tooltip>
                                                }
                                            >
                                                <img src={this.props.gameClient.muted ? speakerOffImage : megaphoneImage} height={26} />
                                            </OverlayTrigger>
                                        </button>
                                    </Col>
                                    <Col xs="auto">
                                        <button className="btn btn-outline-light btn-sm" onClick={() => this.props.gameClient.musicMuted = !this.props.gameClient.musicMuted}>
                                            <OverlayTrigger
                                                overlay={
                                                    <Tooltip id="mute-tooltip">
                                                        {this.props.gameClient.musicMuted
                                                            ? "Unmute music"
                                                            : "Mute music"}
                                                    </Tooltip>
                                                }
                                            >
                                                <img src={this.props.gameClient.musicMuted ? speakerOffImage : musicalNotesImage} height={26} />
                                            </OverlayTrigger>
                                        </button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Row>
                </Col>
        </>;
    }

    renderPasswordInput(): ReactNode {
        return <Row className="mt-2">
            <Col>
                <Row className="justify-content-center">
                    <DebouncedPasswordComponent
                        password={this.password}
                        onChangeCallback={newPassword => {
                            this.password = newPassword;
                            this.lobby.sendPassword(newPassword);
                        } }
                        tooltip={<Tooltip id="game-password-tooltip">
                            {this.props.gameClient.isRealOwner()
                                ? <>You can set a password here to prevent strangers from joining your game.</>
                                : this.lobby.password != ""
                                    ? <>Enter the password here to unlock and join the game.</>
                                    : <></>}
                        </Tooltip>} />
                </Row>
            </Col>
        </Row>;
    }

    getConnectedSpectators(): User[] {
        return _.difference(this.entireGame.users.values.filter(u => u.connected), this.lobby.players.values);
    }

    renderLobbyHouseButtons(h: LobbyHouse): React.ReactNode {
        const invisible = !this.isHouseAvailable(h);

        if (this.lobby.readyUsers != null) {
            // Ready-check ongoing
            if (!this.lobby.players.has(h) || invisible) {
                return null;
            }
            return  (
                this.lobby.readyUsers.includes(this.lobby.players.get(h))
                    ? <Col xs="auto">
                        <Badge variant="success"><FontAwesomeIcon icon={faCheck} size="2x" /></Badge>
                    </Col>
                    : this.lobby.players.get(h) == this.authenticatedUser
                        ? <Col xs="auto">
                            <Button variant="outline-success" onClick={() => this.ready()} style={{verticalAlign: 6}}>Ready</Button>
                            <Spinner className="ml-3" animation="border" variant="info" />
                        </Col>
                        : <Col xs="auto">
                            <Spinner animation="border" variant="info" />
                        </Col>
            );
        }

        if (!this.props.gameClient.isRealOwner() &&
            this.lobby.password != "" &&
            this.password != this.lobby.password &&
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
                this.props.gameClient.isRealOwner() && (
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

    ready(): void {
        this.lobby.ready();
    }

    UNSAFE_componentWillUpdate(): void {
        if (this.entireGame.gameSettings.adwdHouseCards) {
            setBoltonIconImage();
            this.lobby.lobbyHouses.get("stark").name = "Bolton";
        } else {
            setStarkIconImage();
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
