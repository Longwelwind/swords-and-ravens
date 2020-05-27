import IngameGameState from "../IngameGameState";
import Vote from "./Vote";
import CancelledGameState from "../../cancelled-game-state/CancelledGameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import User from "../../../server/User";

export type SerializedVoteType = SerializedCancelGame | SerializedReplacePlayer;

export default abstract class VoteType {
    abstract serializeToClient(): SerializedVoteType;
    abstract verb(): string;
    abstract executeAccepted(vote: Vote): void;

    static deserializeFromServer(ingame: IngameGameState, data: SerializedVoteType): VoteType {
        switch (data.type) {
            case "cancel-game":
                // eslint complains because CancelGame is defined later in the file while
                // it's used in a static function here.
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return CancelGame.deserializeFromServer(ingame, data);
            case "replace-player":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return ReplacePlayer.deserializeFromServer(ingame, data);
        }
    }
}

export class CancelGame extends VoteType {
    verb(): string {
        return "cancel the game";
    }

    executeAccepted(vote: Vote): void {
        vote.ingame.setChildGameState(new CancelledGameState(vote.ingame    )).firstStart();
    }

    serializeToClient(): SerializedCancelGame {
        return {
            type: "cancel-game"
        };
    }

    static deserializeFromServer(_ingame: IngameGameState, _data: SerializedCancelGame): CancelGame {
        return new CancelGame();
    }
}

export interface SerializedCancelGame {
    type: "cancel-game";
}

export class ReplacePlayer extends VoteType {
    replacer: User;
    replaced: User;
    forHouse: House;

    constructor(replacer: User, replaced: User, forHouse: House) {
        super();
        this.replacer = replacer;
        this.replaced = replaced;
        this.forHouse = forHouse;
    }

    verb(): string {
        return `replace ${this.replaced.name} (${this.forHouse.name})`;
    }

    executeAccepted(vote: Vote): void {
        // Create a new player to replace the old one
        const oldPlayer = vote.ingame.players.values.find(p => p.house == this.forHouse) as Player;
        const newPlayer = new Player(this.replacer, this.forHouse);

        vote.ingame.players.delete(oldPlayer.user);
        vote.ingame.players.set(newPlayer.user, newPlayer);

        vote.ingame.entireGame.broadcastToClients({
            type: "player-replaced",
            oldUser: oldPlayer.user.id,
            newUser: newPlayer.user.id
        });

        vote.ingame.log({
            type: "player-replaced",
            oldUser: this.replaced.id,
            newUser: this.replacer.id,
            house: this.forHouse.id
        });
    }

    serializeToClient(): SerializedReplacePlayer {
        return {
            type: "replace-player",
            replacer: this.replacer.id,
            replaced: this.replaced.id,
            forHouse: this.forHouse.id
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedReplacePlayer): ReplacePlayer {
        const replacer = ingame.entireGame.users.get(data.replacer);
        const replaced = ingame.entireGame.users.get(data.replaced);
        const forHouse = ingame.game.houses.get(data.forHouse);

        return new ReplacePlayer(replacer, replaced, forHouse);
    }
}

export interface SerializedReplacePlayer {
    type: "replace-player";
    replacer: string;
    replaced: string;
    forHouse: string;
}