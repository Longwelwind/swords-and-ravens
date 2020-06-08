import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameClient from "../GameClient";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import React from "react";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import {observable} from "mobx";
import ChatClient, {Channel, Message} from "./ChatClient";
import EntireGame from "../../common/EntireGame";
// @ts-ignore
import ScrollToBottom from "react-scroll-to-bottom";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

interface ChatComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
    roomId: string;
    /**
     * A function that is called between each messages, and allow custom components that are
     * managed externally to be put between messages. Used, for example, for in-game vote status.
     */
    injectBetweenMessages: (previousMessage: Message | null, nextMessage: Message | null) => ReactNode;
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

    static defaultProps = {
        injectBetweenMessages: () => <></>
    };

    get chatClient(): ChatClient {
        return this.props.gameClient.chatClient;
    }

    get channel(): Channel {
        return this.chatClient.channels.get(this.props.roomId);
    }

    render(): ReactNode {
        const messages = this.channel.messages;

        return (
            <div className="d-flex flex-column h-100">
                {/* Setting a fixed height seems to be the only solution to make ScrollToBottom work */}
                <ScrollToBottom className="mb-3 chat-scroll-to-bottom" scrollViewClassName="overflow-x-hidden">
                    {/* In case there's no messages yet, inject with no messages as arguments */}
                    {messages.length == 0 && (
                        <React.Fragment key={"injected-for-all"}>
                            {this.props.injectBetweenMessages(null, null)}
                        </React.Fragment>
                    )}
                    {messages.map((m, i) => (
                        <>
                            {/* Inject before the first message */}
                            {i == 0 && (
                                <React.Fragment key={"injected-before-" + m.id}>
                                    {this.props.injectBetweenMessages(null, m)}
                                </React.Fragment>
                            )}
                            <Row noGutters={true} className="flex-nowrap" key={m.id}>
                                <Col xs="auto" style={{width: "38px"}} className="text-center">
                                    <OverlayTrigger
                                        placement="auto"
                                        overlay={<Tooltip id={"message-date-" + m.id}>{m.createdAt.toLocaleString()}</Tooltip>}
                                        popperConfig={{modifiers: {preventOverflow: {boundariesElement: "viewport"}}}}
                                    >
                                        <small className="text-muted">
                                            {('0' + m.createdAt.getHours()).slice(-2)}:{('0' + m.createdAt.getMinutes()).slice(-2)}
                                        </small>
                                    </OverlayTrigger>
                                </Col>
                                <Col xs="auto" className="mx-1">
                                    <strong>{m.user.name}</strong>
                                </Col>
                                <Col style={{overflowWrap: "anywhere"}}>
                                    {m.text}
                                </Col>
                            </Row>
                            {/* Inject between all messages and after the last */}
                            <React.Fragment key={"injected-after-" + m.id}>
                                {this.props.injectBetweenMessages(m, messages.length > i + 1 ? messages[i + 1] : null)}
                            </React.Fragment >
                        </>
                    ))}
                </ScrollToBottom>
                <div>
                    <Form>
                        <Row>
                            <Col>
                                <Form.Control type="text" maxLength={200} value={this.inputText} onChange={(e: any) => this.inputText = e.target.value} />
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
