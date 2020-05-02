import EntireGame from "../common/EntireGame";

export default class AuthenticatedClient {
    userId: string;
    game: EntireGame;
    client: WebSocket;

    constructor(userId: string, game: EntireGame, client: WebSocket) {
        this.userId = userId;
        this.game = game;
        this.client = client;
    }
}