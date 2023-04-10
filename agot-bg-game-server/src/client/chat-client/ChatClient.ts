import BetterMap from "../../utils/BetterMap";
import {observable} from "mobx";
import User from "../../server/User";
import GameClient from "../GameClient";
import _ from "lodash";

const CHAT_SERVER_URL = process.env.CHAT_SERVER_URL || `${window.location.protocol == 'http:' ? 'ws' : 'wss'}://${window.location.host}`;

type ChatServerMessage = NewMessage | MessagesRetrieved | MoreMessagesRetrieved;

interface NewMessage extends MessageData {
    type: 'chat_message';
}

interface MessagesRetrieved {
    type: 'chat_messages_retrieved';
    messages: MessageData[];
    last_viewed_message: string;
}

interface MoreMessagesRetrieved {
    type: 'more_chat_messages_retrieved';
    messages: MessageData[];
}

interface MessageData {
    id: string;
    user_id: string;
    text: string;
    created_at: string;
}

export interface Message {
    id: string;
    user: User;
    text: string;
    createdAt: Date;
}

export class Channel {
    id: string;
    websocket: WebSocket;
    @observable connected = false;
    @observable messages: Message[] = [];
    @observable lastViewedMessageId: string;
    onMessage: ((singleMessageRetrieved: boolean, noMoreMessages: boolean) => void) | null;

    get areThereUnreadMessages(): boolean {
        if (this.messages.length == 0) {
            return false;
        }

        // @ts-expect-error As we checked for messages length before _.last will never return undefined
        return _.last(this.messages).id != this.lastViewedMessageId;
    }

    constructor(id: string, websocket: WebSocket) {
        this.id = id;
        this.websocket = websocket;
    }
}

export default class ChatClient {
    gameClient: GameClient;
    // key = channel id
    @observable channels: BetterMap<string, Channel> = new BetterMap<string, Channel>();

    constructor(gameClient: GameClient) {
        this.gameClient = gameClient;
    }

    addChannel(id: string): void {
        const websocket = new WebSocket(`${CHAT_SERVER_URL}/ws/chat/room/${id}`);
        const channel = new Channel(id, websocket);
        this.channels.set(id, channel);

        websocket.onopen = () => {
            channel.connected = true;
            // Ask for the first 15 messages with a delay of 100ms to decrease pressure
            window.setTimeout(() => {
                channel.websocket.send(JSON.stringify({type: 'chat_retrieve', count: 15, first_message_id: null, faceless: this.gameClient.entireGame?.gameSettings.faceless ?? false }))
            }, 100);
        };
        websocket.onclose = () => channel.connected = false;
        websocket.onerror = () => channel.connected = false;
        websocket.onmessage = (data) => this.onMessage(channel, JSON.parse(data.data) as ChatServerMessage);
    }

    /**
     * Marks the channel as viewed by setting the last viewed message to the last message of the channel.
     * @param channel Channel to mark as viewed
     */
    markAsViewed(channel: Channel): void {
        const lastMessage = _.last(channel.messages);
        // Check if the last message viewed is already the last message
        if (lastMessage == null || lastMessage.id == channel.lastViewedMessageId) {
            return;
        }

        channel.lastViewedMessageId = lastMessage.id;

        channel.websocket.send(JSON.stringify({type: 'chat_view_message', message_id: channel.lastViewedMessageId}));
    }

    sendMessage(channel: Channel, text: string): void {
        if (!channel.connected) {
            return;
        }

        const authenticatedUser = this.gameClient.authenticatedUser;

        // Only authenticated users can send messages
        if (!authenticatedUser || !this.gameClient.entireGame || !this.gameClient.entireGame.users.has(authenticatedUser.id)) {
            return;
        }

        if (text == null || text.match(/^\s*$/)) {
            return;
        }
        const fromHouse = this.gameClient.entireGame.ingameGameState?.players.tryGet(authenticatedUser, null)?.house.name ?? "Unknown";
        channel.websocket.send(JSON.stringify({type: 'chat_message', text, gameId: this.gameClient.entireGame.id, fromHouse: fromHouse, faceless: this.gameClient.entireGame.gameSettings.faceless }));
    }

    onMessage(channel: Channel, message: ChatServerMessage): void {
        // console.log(message);

        if (message.type == 'chat_message') {
            const msg = this.parseMessage(message);
            if (msg) {
                channel.messages.push(msg);
                if (channel.onMessage) {
                    channel.onMessage(true, false);
                }
            }
        } else if (message.type =='chat_messages_retrieved') {
            const msgs = message.messages.map(m => this.parseMessage(m)).filter(m => m != null) as Message[];
            if (msgs.length > 0) {
                this.addMultipleMessages(channel, msgs);
                channel.lastViewedMessageId = message.last_viewed_message;

                if (channel.onMessage) {
                    channel.onMessage(false, false);
                }
            }
        } else if (message.type == "more_chat_messages_retrieved") {
            const msgs = message.messages.map(m => this.parseMessage(m)).filter(m => m != null) as Message[];
            if (msgs.length > 0) {
                this.addMultipleMessages(channel, msgs, true);
            } else if (msgs.length == 0 && channel.onMessage) {
                // For more messages retrieved we dont need to update last_viewed_message or mark as viewed
                channel.onMessage(false, true)
            }
        }
    }

    loadMoreMessages(channel: Channel): boolean {
        if (!channel.connected) {
            return false;
        }

        const authenticatedUser = this.gameClient.authenticatedUser;

        // Only authenticated users can load more messages
        if (!authenticatedUser || !this.gameClient.entireGame
            || !this.gameClient.entireGame.users.has(authenticatedUser.id) || channel.messages.length == 0) {
            return false;
        }

        channel.websocket.send(JSON.stringify({type: 'chat_retrieve', count: 50, first_message_id: channel.messages[0].id, faceless: this.gameClient.entireGame.gameSettings.faceless }));
        return true;
    }

    addMultipleMessages(channel: Channel, messages: Message[], retrievedMore = false): void {
        if (retrievedMore) {
            channel.messages.unshift(...messages.reverse());
        } else {
            channel.messages.push(...messages);
        }
    }

    parseMessage(data: MessageData): Message | null {
        // `entireGame should always be non-null since channels are added once
        // the Entire game has been received from the server.
        if (this.gameClient.entireGame == null) {
            throw new Error();
        }

        if (!this.gameClient.entireGame.users.has(data.user_id)) {
            return null;
        }

        return {
            id: data.id,
            user: this.gameClient.entireGame.users.get(data.user_id),
            text: data.text,
            createdAt: new Date(Date.parse(data.created_at))
        };
    }
}


