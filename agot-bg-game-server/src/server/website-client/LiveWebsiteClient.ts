import WebsiteClient, {StoredGameData, StoredUserData} from "./WebsiteClient";
import {Client} from "pg";


export default class LiveWebsiteClient implements WebsiteClient {
    pgClient: Client;

    constructor() {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is not set");
        }

        this.pgClient = new Client({
            connectionString: process.env.DATABASE_URL
        });
    }

    async init() {
        await this.pgClient.connect();
    }

    async getGame(gameId: string): Promise<StoredGameData | null> {
        const res = await this.pgClient.query("SELECT * FROM agotboardgame_main_game WHERE id = $1", [gameId]);

        if (res.rows.length == 0) {
            return null;
        }

        const row = res.rows[0];
        return {
            id: row.id,
            ownerId: row.owner_id,
            serializedGame: row.serialized_game,
            version: row.version
        };
    }

    async getUser(userId: string): Promise<StoredUserData | null> {
        const res = await this.pgClient.query("SELECT * FROM agotboardgame_main_user WHERE id = $1", [userId]);

        if (res.rows.length == 0) {
            return null;
        }

        const row = res.rows[0];
        return {
            id: row.id,
            name: row.username,
            token: row.game_token
        };
    }

    async saveGame(gameId: string, serializedGame: any, viewOfGame: any, players: {userId: string; data: object}[], state: string, version: string): Promise<void> {
        await this.pgClient.query("BEGIN");

        await this.pgClient.query(
            "UPDATE agotboardgame_main_game SET serialized_game = $2, view_of_game = $3, state = $4, version = $5 WHERE id = $1",
            [gameId, serializedGame, viewOfGame, state, version]
        );

        await this.pgClient.query(
            "DELETE FROM agotboardgame_main_playeringame WHERE game_id = $1",
            [gameId]
        );

        await Promise.all(
            players.map(({userId, data}) =>
                this.pgClient.query(
                    "INSERT INTO agotboardgame_main_playeringame(game_id, user_id, data) VALUES($1, $2, $3)",
                    [gameId, userId, data]
                )
            )
        );

        await this.pgClient.query("COMMIT");
    }
}
