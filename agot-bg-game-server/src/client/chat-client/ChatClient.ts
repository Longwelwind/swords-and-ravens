import BetterMap from "../../utils/BetterMap";
import {observable} from "mobx";
import User from "../../server/User";
import GameClient from "../GameClient";

const CHAT_SERVER_URL = process.env.CHAT_SERVER_URL || `${window.location.protocol == 'http:' ? 'ws' : 'wss'}://${window.location.host}`;

type ChatServerMessage = Message | MessagesRetrieved;

interface Message extends MessageData{
    type: 'chat_message';
}

interface MessagesRetrieved {
    type: 'chat_messages_retrieved';
    messages: MessageData[];
}

interface MessageData {
    user_id: string;
    text: string;
    created_at: string;
}

class Channel {
    id: string;
    websocket: WebSocket;
    @observable connected: boolean = false;
    @observable messages: {user: User; text: string; createdAt: Date}[] = [];

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
            channel.websocket.send(JSON.stringify({type: 'chat_retrieve', count: 10000}))
        };
        websocket.onclose = () => channel.connected = false;
        websocket.onerror = () => channel.connected = false;
        websocket.onmessage = (data) => this.onMessage(channel, JSON.parse(data.data) as ChatServerMessage);
    }

    sendMessage(channel: Channel, text: string): void {
        if (!channel.connected) {
            return;
        }

        channel.websocket.send(JSON.stringify({type: 'chat_message', text}));
    }

    onMessage(channel: Channel, message: ChatServerMessage): void {
        console.log(message);

        if (message.type == 'chat_message') {
            this.parseMessage(channel, message);
        } else if (message.type =='chat_messages_retrieved') {
            message.messages.forEach(m => this.parseMessage(channel, m));
        }
    }

    parseMessage(channel: Channel, data: {user_id: string, text: string, created_at: string}): void {
        // `entireGame should always be non-null since channels are added once
        // the Entire game has been received from the server.
        if (this.gameClient.entireGame == null) {
            throw new Error();
        }

        const user = this.gameClient.entireGame.users.get(data.user_id);
        const text = data.text;
        const createdAt = new Date(Date.parse(data.created_at));

        channel.messages.push({user, text, createdAt});
    }
}


