import IngameGameState from "../IngameGameState";
import Vote from "./Vote";
import CancelledGameState from "../../cancelled-game-state/CancelledGameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import User from "../../../server/User";
import BiddingGameState from "../westeros-game-state/bidding-game-state/BiddingGameState";
import ActionGameState from "../action-game-state/ActionGameState";
import ResolveMarchOrderGameState from "../action-game-state/resolve-march-order-game-state/ResolveMarchOrderGameState";
import CombatGameState from "../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export type SerializedVoteType = SerializedCancelGame | SerializedReplacePlayer | SerializedReplacePlayerByVassal;

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
            case "replace-player-by-vassal":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return ReplacePlayerByVassal.deserializeFromServer(ingame, data);
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

export class ReplacePlayerByVassal extends VoteType {
    replaced: User;
    forHouse: House;

    constructor(replaced: User, forHouse: House) {
        super();
        this.replaced = replaced;
        this.forHouse = forHouse;
    }

    verb(): string {
        return `replace ${this.replaced.name} (${this.forHouse.name}) with a vassal`;
    }

    executeAccepted(vote: Vote): void {
        const oldPlayer = vote.ingame.players.values.find(p => p.user == this.replaced) as Player;

        // Delete the old player so the house is a vassal now
        vote.ingame.players.delete(oldPlayer.user);

        const forbiddenCommanders = [];
        // If we are in combat we can't assign the vassal to the opponent
        if (vote.ingame.childGameState instanceof ActionGameState
            && vote.ingame.childGameState.childGameState instanceof ResolveMarchOrderGameState
            && vote.ingame.childGameState.childGameState.childGameState instanceof CombatGameState) {
                const combat = vote.ingame.childGameState.childGameState.childGameState as CombatGameState;
                forbiddenCommanders.push(combat.defender);
                forbiddenCommanders.push(combat.attacker);
        }

        let newCommander: House | null = null;
        for (const house of vote.ingame.game.getPotentialWinners()) {
            if (!vote.ingame.isVassalHouse(house) && !forbiddenCommanders.includes(house)) {
                newCommander = house;
                break;
            }
        }

        if (!newCommander) {
            throw new Error("Unable to determine new commander");
        }

        // It may happen that you replace a player which commands vassals. Assign them to the potential winner.
        vote.ingame.game.vassalRelations.entries.forEach(([vassal, commander]) => {
            if (oldPlayer.house == commander) {
                vote.ingame.game.vassalRelations.set(vassal, newCommander as House);
            }
        });

        // Assign this vassal to the leading house, so the current leading house cannot march into
        // the vassal regions
        vote.ingame.game.vassalRelations.set(oldPlayer.house, newCommander);

        // Broadcast new vassal relations before deletion of player!
        vote.ingame.broadcastVassalRelations();

        vote.ingame.entireGame.broadcastToClients({
            type: "player-replaced",
            oldUser: oldPlayer.user.id
        });

        vote.ingame.log({
            type: "player-replaced",
            oldUser: this.replaced.id,
            house: this.forHouse.id
        });

        if (vote.ingame.leafState instanceof BiddingGameState &&
            vote.ingame.leafState.participatingHouses.includes(oldPlayer.house)) {
                vote.ingame.leafState.bids.set(oldPlayer.house, 0);
                vote.ingame.entireGame.broadcastToClients({
                    type: "bid-done",
                    houseId: oldPlayer.house.id,
                    // We can reveal the value here as it's clear vassals bid 0
                    value: 0
                });
                vote.ingame.leafState.checkAndProceedEndOfBidding();
        }
    }

    serializeToClient(): SerializedReplacePlayerByVassal {
        return {
            type: "replace-player-by-vassal",
            replaced: this.replaced.id,
            forHouse: this.forHouse.id
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedReplacePlayerByVassal): ReplacePlayerByVassal {
        const replaced = ingame.entireGame.users.get(data.replaced);
        const forHouse = ingame.game.houses.get(data.forHouse);

        return new ReplacePlayerByVassal(replaced, forHouse);
    }
}

export interface SerializedReplacePlayerByVassal {
    type: "replace-player-by-vassal";
    replaced: string;
    forHouse: string;
}