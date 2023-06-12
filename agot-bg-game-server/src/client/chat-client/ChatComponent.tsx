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
// @ts-expect-error Somehow ts complains that this module cannot be found while it is
import ScrollToBottom from "react-scroll-to-bottom";
import { Alert, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
import User from "../../server/User";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile, faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import notificationSound from "../../../public/sounds/raven_call.ogg";
import EmojiPicker, { EmojiStyle, SuggestionMode, Theme } from 'emoji-picker-react';
import { isMobile } from "react-device-detect";
import classNames from "classnames";
import moment from "moment";
import ConditionalWrap from "../utils/ConditionalWrap";
import getElapsedSeconds, { getTimeDeltaInSeconds } from "../../utils/getElapsedSeconds";

interface ChatComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
    roomId: string;
    /**
     * A function that is called between each messages, and allow custom components that are
     * managed externally to be put between messages. Used, for example, for in-game vote status.
     */
    injectBetweenMessages: (previousMessage: Message | null, nextMessage: Message | null) => ReactNode;

    getUserDisplayName: (user: User) => ReactNode;
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
    @observable noMoreMessages = false;
    @observable selectedMessageId: string | null = null;
    @observable containerWidth: number | undefined = 600;

    onResizeCallback: (() => void) | null = null;
    audioPlayed = false;
    debounceTimeout?: number;

    static defaultProps = {
        injectBetweenMessages: (): any => <></>,
        getUserDisplayName: (u: User): any => <>{u.name}</>
    };

    get chatClient(): ChatClient {
        return this.props.gameClient.chatClient;
    }

    get channel(): Channel {
        return this.chatClient.channels.get(this.props.roomId);
    }

    render(): ReactNode {
        const messages = this.channel.messages;
        /* const messages = [{
            createdAt: new Date(),
            id: "1",
            text: "Hello 😬 my friend :smile:",
            user: this.props.entireGame.users.values[0]
        },
        {
            createdAt: new Date(),
            id: "2",
            text: "😬",
            user: this.props.entireGame.users.values[0]
        },
        {
            createdAt: new Date(),
            id: "3",
            text: "😶‍🌫️🥳👨‍👩‍👧‍👦7️⃣🇩🇪",
            user: this.props.entireGame.users.values[0]
        },
        {
            createdAt: new Date(),
            id: "4",
            text: "😶‍🌫️Party!!!🥳👨‍👩‍👧‍👦7️⃣🇩🇪",
            user: this.props.entireGame.users.values[0]
        }];

        for(let i=0; i<5; i++) {
            const length = messages.length;
            for(let j=0; j<length; j++) {
                messages.push(messages[j]);
            }
        } */
        return (
            <div id={`chat-container-${this.props.roomId}`} className="d-flex flex-column h-100">
                {/* Setting a fixed height seems to be the only solution to make ScrollToBottom work */}
                <ScrollToBottom className="mb-2 flex-fill-remaining" scrollViewClassName="overflow-x-auto" style={{height: 300}}>
                    {/* In case there's no messages yet, inject with no messages as arguments */}
                    {messages.length == 0 && (
                        <React.Fragment key={"injected-for-all"}>
                            {this.props.injectBetweenMessages(null, null)}
                        </React.Fragment>
                    )}
                    {messages.map((m, i) => {
                        const onlyEmojis = this.containsOnlyEmojis(m.text);
                        const divideOwnAndForeignMessages: boolean = this.containerWidth != null && this.containerWidth > 550;
                        return <>
                            {/* Inject before the first message */}
                            {i == 0 && (
                                <React.Fragment key={"injected-before-" + m.id}>
                                    {this.props.injectBetweenMessages(null, m)}
                                </React.Fragment>
                            )}
                            <Row key={m.id} className={classNames(
                                "mb-1 mt-0 mx-0 p-0",
                                {
                                    "align-items-center": onlyEmojis
                                })}
                            >
                                {this.renderMessage(divideOwnAndForeignMessages, i, messages, m, onlyEmojis)}
                            </Row>
                            {/* Inject between all messages and after the last */}
                            <React.Fragment key={"injected-after-" + m.id}>
                                {this.props.injectBetweenMessages(m, messages.length > i + 1 ? messages[i + 1] : null)}
                            </React.Fragment >
                        </>
                    })}
                    <button type="button"
                        className="close"
                        style={{position: "absolute", right: 12, top: 0, display: this.noMoreMessages ? "none" : "inline"}}
                        onClick={(e: any) => { e.currentTarget.blur(); this.loadMoreMessages(); e.preventDefault(); }}
                    >
                        <OverlayTrigger
                            overlay={
                                <Tooltip id="mute-tooltip">
                                    {this.noMoreMessages ? <>There are no more messages</> : <>Load more messages</>}
                                </Tooltip>
                            }
                        >
                            <FontAwesomeIcon icon={faSyncAlt} size="2xs"/>
                        </OverlayTrigger>
                    </button>
                </ScrollToBottom>
                {!this.channel.connected ?
                    <div className="flex-nowrap justify-content-center">
                        <Alert variant="warning" className="text-center">
                            This chat is not connected. Please wait until the connection is established or reload the page.
                        </Alert>
                    </div>
                    : <Form>
                        <Row className="d-flex align-items-center">
                            <Col>
                                <Form.Control
                                    size="lg"
                                    id={`chat-client-input-${this.channel.id}`}
                                    type="text"
                                    maxLength={200}
                                    value={this.inputText}
                                    onChange={(e: any) => this.inputText = e.target.value}
                                />
                            </Col>
                            <Col xs="auto">
                                <OverlayTrigger
                                    overlay={<Popover id="emoji-picker" style={{maxWidth: "100%", maxHeight: "100%", borderStyle: "none"}}>
                                        <EmojiPicker
                                            theme={Theme.DARK}
                                            autoFocusSearch={!isMobile}
                                            emojiStyle={isMobile ? EmojiStyle.NATIVE : EmojiStyle.APPLE}
                                            suggestedEmojisMode={SuggestionMode.FREQUENT}
                                            lazyLoadEmojis={true}
                                            onEmojiClick={(emoji) => {
                                                const input = document.getElementById(`chat-client-input-${this.channel.id}`) as HTMLInputElement;
                                                const position = input.selectionStart ?? this.inputText.length;
                                                this.inputText = [this.inputText.slice(0, position),
                                                    emoji.emoji,
                                                    this.inputText.slice(position)
                                                ].join('');
                                            }}
                                        />
                                    </Popover>}
                                    placement="auto"
                                    trigger="click"
                                    rootClose
                                >
                                    <div  className="btn btn-outline-light">
                                        <FontAwesomeIcon icon={faFaceSmile} size="2x"/>
                                    </div>
                                </OverlayTrigger>
                            </Col>
                            <Col xs="auto">
                                <Button type="submit" size="lg" onClick={(e: any) => { e.currentTarget.blur(); this.send(); e.preventDefault();} }>Send</Button>
                            </Col>
                        </Row>
                    </Form>
                }
            </div>
        );
    }

    private renderMessage(divideOwnAndForeignMessages: boolean, currentMsgIndex: number, messages: Message[], currentMessage: Message, onlyEmojis: boolean): ReactNode {
        if (!divideOwnAndForeignMessages) {
            return <Col className={classNames(
                {
                    "own-message": this.props.gameClient.authenticatedUser == currentMessage.user,
                    "foreign-message": this.props.gameClient.authenticatedUser != currentMessage.user
                })}>
                <div className={currentMsgIndex > 0 && messages[currentMsgIndex - 1].user == currentMessage.user && getTimeDeltaInSeconds(currentMessage.createdAt, messages[currentMsgIndex - 1].createdAt) <= 180 ? "d-none" : ""}>
                    {this.props.getUserDisplayName(currentMessage.user)}{this.getMoment(currentMessage)}
                </div>
                <OverlayTrigger
                    overlay={<Tooltip id={"current-message-date-" + currentMessage.id}>{currentMessage.createdAt.toLocaleString()}</Tooltip>}
                    placement="auto"
                    popperConfig={{modifiers: [preventOverflow]}}
                    delay={{hide: 0, show: 400}}
                >
                    <div className={onlyEmojis ? "make-emojis-large" : ""}
                        style={{ minWidth: 200, overflowWrap: "anywhere" }}
                    >
                        {currentMessage.text}
                    </div>
                </OverlayTrigger>
            </Col>;
        } else {
            return <>
                <Col xs="12" className={classNames("p-0 m-0", {
                    "px-2": this.props.gameClient.authenticatedUser == currentMessage.user,
                    "d-none": currentMsgIndex > 0 && messages[currentMsgIndex - 1].user == currentMessage.user && getTimeDeltaInSeconds(currentMessage.createdAt, messages[currentMsgIndex - 1].createdAt) <= 90
                })}>
                    <div style={{width: "fit-content"}} className={classNames("p-1 pl-2", {
                        "float-right": this.props.gameClient.authenticatedUser == currentMessage.user,
                        "own-message": this.props.gameClient.authenticatedUser == currentMessage.user,
                        "foreign-message": this.props.gameClient.authenticatedUser != currentMessage.user
                    })}>
                        {this.props.getUserDisplayName(currentMessage.user)}{this.getMoment(currentMessage)}
                    </div>
                </Col>
                {this.props.gameClient.authenticatedUser == currentMessage.user && <Col xs="4"/>}
                <OverlayTrigger
                    overlay={<Tooltip id={"current-message-date-" + currentMessage.id}>{currentMessage.createdAt.toLocaleString()}</Tooltip>}
                    placement="auto"
                    popperConfig={{modifiers: [preventOverflow]}}
                    delay={{hide: 0, show: 400}}
                >
                    <Col xs="8"className={classNames("px-0", {
                        "px-2": this.props.gameClient.authenticatedUser == currentMessage.user,
                    })}
                    >
                        <div style={{width: "fit-content", overflowWrap: "anywhere"}} className={classNames("p-1 px-2", {
                            "make-emojis-large": onlyEmojis,
                            "float-right": this.props.gameClient.authenticatedUser == currentMessage.user,
                            "own-message": this.props.gameClient.authenticatedUser == currentMessage.user,
                            "foreign-message": this.props.gameClient.authenticatedUser != currentMessage.user
                        })}>
                            {currentMessage.text}
                        </div>
                    </Col>
                </OverlayTrigger>
            </>;
        }
    }

    getMoment(message: Message): ReactNode {
        const elapsed = getElapsedSeconds(message.createdAt);
        const S_PER_DAY = 60 * 60 * 24;
        const S_PER_H = 60 * 60;

        const diffDays = Math.round(elapsed / S_PER_DAY);
        const diffH = Math.round(elapsed / S_PER_H);

        const result = diffH <= 12
            ? moment(message.createdAt).fromNow()
            : diffDays <= 5
                ? moment(message.createdAt).calendar()
                : message.createdAt.toLocaleString();

        return <ConditionalWrap
            condition={diffH <= 12 || diffDays <= 5}
            wrap={children => <OverlayTrigger
                overlay={<Tooltip id={"message-date-" + message.id}>{message.createdAt.toLocaleString()}</Tooltip>}
                placement="auto"
                popperConfig={{modifiers: [preventOverflow]}}
                delay={{hide: 0, show: 400}}
            >
                {children}
            </OverlayTrigger>}
        >
            <small className="text-muted mx-2">{result}</small>
        </ConditionalWrap>;
    }

    send(): void {
        if (this.inputText.length == 0) {
            return;
        }

        this.chatClient.sendMessage(this.channel, this.inputText);
        this.inputText = "";
    }

    loadMoreMessages(): void {
        if (!this.chatClient.loadMoreMessages(this.channel)) {
            this.noMoreMessages = true;
        }
    }

    containsOnlyEmojis(str: string): boolean {
        const stringToTest = str.replace(/ /g,'');
        const emojiRegex = /^(?:(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u{200D}\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*)|[\u{1f900}-\u{1f9ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])+$/u;
        return emojiRegex.test(stringToTest) && Number.isNaN(Number(stringToTest));
    }

    onResize(): void {
        const width = document.getElementById(`chat-container-${this.props.roomId}`)?.getBoundingClientRect()?.width;
        if (width && width > 0) {
            this.containerWidth = width;
        }
    }

    debouncedOnResize(): void {
        if (this.debounceTimeout) {
            window.clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = window.setTimeout(() => {
            this.onResize();
            this.debounceTimeout = undefined;
        }, 100);
    }

    componentDidMount(): void {
        this.channel.onMessage = (singleMessageRetrieved, noMoreMessages) => this.onMessage(singleMessageRetrieved, noMoreMessages);
        this.onResize();
        const resizeCallback = (): void => this.debouncedOnResize();
        window.addEventListener('resize', resizeCallback);
        this.onResizeCallback = resizeCallback;
    }

    componentWillUnmount(): void {
        this.channel.onMessage = null;

        const resizeCallback = this.onResizeCallback;
        if (resizeCallback) {
            window.removeEventListener('resize', resizeCallback);
        }

        this.onResizeCallback = null;
    }

    componentDidUpdate(prevProps: Readonly<ChatComponentProps>, _prevState: Readonly<Record<string, unknown>>): void {
        if (this.props.currentlyViewed) {
            this.chatClient.markAsViewed(this.channel);
            this.audioPlayed = false;
        }

        if (!prevProps.currentlyViewed && this.props.currentlyViewed) {
            this.onResize();
        }
    }

    onMessage(singleMessageRetrieved: boolean, noMoreMessages: boolean): void {
        if (this.props.currentlyViewed) {
            this.chatClient.markAsViewed(this.channel);
            this.audioPlayed = false;
        } else if (singleMessageRetrieved && !this.audioPlayed && !this.props.gameClient.muted) {
            const audio = new Audio(notificationSound);
            audio.play();
            this.audioPlayed = true;
        }

        if (noMoreMessages) {
            this.noMoreMessages = true;
        }
    }
}
