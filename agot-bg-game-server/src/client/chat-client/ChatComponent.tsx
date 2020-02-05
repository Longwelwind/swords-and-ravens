import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameClient from "../GameClient";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import React from "react";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import {observable} from "mobx";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import ChatClient from "./ChatClient";
import EntireGame from "../../common/EntireGame";

interface ChatComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
    roomId: string;
}

@observer
export default class ChatComponent extends Component<ChatComponentProps> {
    @observable inputText = "";

    get chatClient(): ChatClient {
        return this.props.gameClient.chatClient;
    }

    render(): ReactNode {
        return (
            <div className="d-flex flex-column h-100">
                <div className="flex-grow-1 mb-3 overflow-auto">
                    {this.chatClient.channels.get(this.props.roomId).messages.slice().reverse().map(m => (
                        <Row noGutters={true} className="flex-nowrap">
                            <Col xs="auto" style={{width: "38px"}} className="text-center">
                                <small
                                    className="text-muted">{('0' + m.createdAt.getHours()).slice(-2)}:{('0' + m.createdAt.getMinutes()).slice(-2)}</small>
                            </Col>
                            <Col xs="auto" className="mx-1">
                                <strong>{m.user.name}</strong>
                            </Col>
                            <Col xs="auto" style={{overflowWrap: "break-word"}}>
                                {m.text}
                            </Col>
                        </Row>
                    ))}
                </div>
                <div>
                    <Form>
                        <Row>
                            <Col>
                                <Form.Control type="text" value={this.inputText} onChange={(e: any) => this.inputText = e.target.value} />
                            </Col>
                            <Col xs="auto">
                                <Button type="submit" onClick={(e: any) => {this.send(); e.preventDefault()}}>Send</Button>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </div>
        );
    }

    send(): void {
        if (this.inputText.length == 0) {
            return;
        }

        this.chatClient.sendMessage(this.chatClient.channels.get(this.props.roomId), this.inputText);
        this.inputText = "";
    }
}
