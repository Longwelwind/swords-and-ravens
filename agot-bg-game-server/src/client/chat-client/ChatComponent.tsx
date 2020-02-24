import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameClient from "../GameClient";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import React from "react";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import {observable} from "mobx";
import ChatClient, {Channel} from "./ChatClient";
import EntireGame from "../../common/EntireGame";
// @ts-ignore
import ScrollToBottom from "react-scroll-to-bottom";

interface ChatComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
    roomId: string;
    /**
     * This property indicates whether this component can be viewed by the user.
     * If the component is inside a Tab component, it can hidden if an other Tab is opened.
     * This property allows the component to mark know whether or not the new messages are seen by the user
     * and thus if they can be marked as seen.
     */
    currentlyViewed: boolean;
}

@observer
export default class ChatComponent extends Component<ChatComponentProps> {
    @observable inputText = "";

    get chatClient(): ChatClient {
        return this.props.gameClient.chatClient;
    }

    get channel(): Channel {
        return this.chatClient.channels.get(this.props.roomId);
    }

    render(): ReactNode {
        return (
            <div className="d-flex flex-column h-100">
                {/* Setting a fixed height seems to be the only solution to make ScrollToBottom work */}
                <ScrollToBottom className="mb-3 chat-scroll-to-bottom">
                    {this.channel.messages.slice().reverse().map(m => (
                        <Row noGutters={true} className="flex-nowrap">
                            <Col xs="auto" style={{width: "38px"}} className="text-center">
                                <small
                                    className="text-muted">{('0' + m.createdAt.getHours()).slice(-2)}:{('0' + m.createdAt.getMinutes()).slice(-2)}</small>
                            </Col>
                            <Col xs="auto" className="mx-1">
                                <strong>{m.user.name}</strong>
                            </Col>
                            <Col style={{overflowWrap: "anywhere"}}>
                                {m.text}
                            </Col>
                        </Row>
                    ))}
                </ScrollToBottom>
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

    componentDidMount(): void {
        this.channel.onMessage = () => this.onMessage();
    }

    componentWillUnmount(): void {
        this.channel.onMessage = null;
    }

    componentDidUpdate(_prevProps: Readonly<ChatComponentProps>, _prevState: Readonly<{}>, _snapshot?: any): void {
        if (this.props.currentlyViewed) {
            this.chatClient.markAsViewed(this.channel);
        }
    }

    onMessage(): void {
        console.log(this.props.currentlyViewed);
        if (this.props.currentlyViewed) {
            this.chatClient.markAsViewed(this.channel);
        }
    }
}
