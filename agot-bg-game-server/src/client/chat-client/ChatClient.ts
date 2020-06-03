import BetterMap from "../../utils/BetterMap";
import {observable} from "mobx";
import User from "../../server/User";
import GameClient from "../GameClient";
import _ from "lodash";

const CHAT_SERVER_URL = process.env.CHAT_SERVER_URL || `${window.location.protocol == 'http:' ? 'ws' : 'wss'}://${window.location.host}`;

type ChatServerMessage = NewMessage | MessagesRetrieved;

interface NewMessage extends MessageData {
    type: 'chat_message';
}

interface MessagesRetrieved {
    type: 'chat_messages_retrieved';
    messages: MessageData[];
    last_viewed_message: string;
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
    onMessage: (() => void) | null;

    get areThereNewMessage(): boolean {
        if (this.messages.length == 0) {
            return false;
        }

        // @ts-ignore
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
            channel.websocket.send(JSON.stringify({type: 'chat_retrieve', count: 100}))
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
        // @ts-ignore
        const lastMessage = _.last(channel.messages);
        // Check if the last message viewed is already the last message
        if (lastMessage == null || lastMessage.id == channel.lastViewedMessageId) {
            return;
        }
        channel.lastViewedMessageId = lastMessage.id;
        console.log('Marking as viewed');

        // eslint-disable-next-line @typescript-eslint/camelcase
        channel.websocket.send(JSON.stringify({type: 'chat_view_message', message_id: channel.lastViewedMessageId}));
    }

    sendMessage(channel: Channel, text: string): void {
        if (!channel.connected) {
            return;
        }
        if (text == null || text.match(/^\s*$/)){
            return;
        }
        console.log('Message sent');
        channel.websocket.send(JSON.stringify({type: 'chat_message', text}));
    }

    onMessage(channel: Channel, message: ChatServerMessage): void {
        console.log(message);

        if (message.type == 'chat_message') {
            this.parseMessage(channel, message);

            if (channel.onMessage) {
                channel.onMessage();
            }
        } else if (message.type =='chat_messages_retrieved') {
            message.messages.forEach(m => this.parseMessage(channel, m));
            channel.lastViewedMessageId = message.last_viewed_message;

            if (channel.onMessage) {
                channel.onMessage();
            }
        }
    }

    parseMessage(channel: Channel, data: MessageData): void {
        // `entireGame should always be non-null since channels are added once
        // the Entire game has been received from the server.
        if (this.gameClient.entireGame == null) {
            throw new Error();
        }

        const id = data.id;
        const user = this.gameClient.entireGame.users.get(data.user_id);
        const text = data.text;
        const createdAt = new Date(Date.parse(data.created_at));

        channel.messages.push({id, user, text, createdAt});
    }
}


