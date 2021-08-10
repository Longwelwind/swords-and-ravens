import IngameGameState from "../IngameGameState";
import Vote from "./Vote";
import CancelledGameState from "../../cancelled-game-state/CancelledGameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import User from "../../../server/User";
import CombatGameState from "../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import WildlingCardEffectInTurnOrderGameState from "../westeros-game-state/wildlings-attack-game-state/WildlingCardEffectInTurnOrderGameState";
import GameState from "../../../common/GameState";
import BetterMap from "../../../utils/BetterMap";

export type SerializedVoteType = SerializedCancelGame | SerializedEndGame | SerializedReplacePlayer | SerializedReplacePlayerByVassal;

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
            case "end-game":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return EndGame.deserializeFromServer(ingame, data);
        }
    }
}

export class CancelGame extends VoteType {
    verb(): string {
        return "cancel the game";
    }

    executeAccepted(vote: Vote): void {
        vote.ingame.setChildGameState(new CancelledGameState(vote.ingame)).firstStart();
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

export class EndGame extends VoteType {
    verb(): string {
        return "end the game after the current round";
    }

    executeAccepted(vote: Vote): void {
        vote.ingame.game.maxTurns = vote.ingame.game.turn;
        vote.ingame.entireGame.broadcastToClients({
            type: "update-max-turns",
            maxTurns: vote.ingame.game.maxTurns
        });
    }

    serializeToClient(): SerializedEndGame {
        return {
            type: "end-game"
        };
    }

    static deserializeFromServer(_ingame: IngameGameState, _data: SerializedEndGame): EndGame {
        return new EndGame();
    }
}

export interface SerializedEndGame {
    type: "end-game";
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

        // If we are waiting for the newPlayer, notify them about their turn
        if (vote.ingame.leafState.getWaitedUsers().includes(newPlayer.user)) {
            vote.ingame.entireGame.notifyWaitedUsers([newPlayer.user]);
        }
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
        const newVassalHouse = oldPlayer.house;

        const forbiddenCommanders: House[] = [];
        // If we are in combat we can't assign the vassal to the opponent
        const anyCombat = vote.ingame.getFirstChildGameState(CombatGameState);
        if (anyCombat) {
            const combat = anyCombat as CombatGameState;
            if (combat.isCommandingHouseInCombat(newVassalHouse)) {
                const commandedHouse = combat.getCommandedHouseInCombat(newVassalHouse);
                const enemy = combat.getEnemy(commandedHouse);

                forbiddenCommanders.push(vote.ingame.getControllerOfHouse(enemy).house);
            }
        }

        // Delete the old player so the house is a vassal now
        vote.ingame.players.delete(oldPlayer.user);

        // Find new commander beginning with the potential winner so he cannot simply march into the vassals regions now
        let newCommander: House | null = null;
        for (const house of vote.ingame.game.getPotentialWinners().filter(h => !vote.ingame.isVassalHouse(h))) {
            if (!forbiddenCommanders.includes(house)) {
                newCommander = house;
                break;
            }
        }

        if (!newCommander) {
            throw new Error("Unable to determine new commander");
        }

        // It may happen that you replace a player which commands vassals. Assign them to the potential winner.
        vote.ingame.game.vassalRelations.entries.forEach(([vassal, commander]) => {
            if (newVassalHouse == commander) {
                vote.ingame.game.vassalRelations.set(vassal, newCommander as House);
            }
        });

        // Assign new commander to replaced house
        vote.ingame.game.vassalRelations.set(newVassalHouse, newCommander);

        // Broadcast new vassal relations before deletion of player!
        vote.ingame.broadcastVassalRelations();

        vote.ingame.entireGame.broadcastToClients({
            type: "player-replaced",
            oldUser: oldPlayer.user.id
        });

        vote.ingame.log({
            type: "player-replaced",
            oldUser: this.replaced.id,
            house: newVassalHouse.id
        });

        // Remove house cards from new vassal house so abilities like Qyburn cannot use this cards anymore
        newVassalHouse.houseCards.forEach(hc => vote.ingame.game.deletedHouseCards.set(hc.id, hc));
        newVassalHouse.houseCards = new BetterMap();

        vote.ingame.entireGame.broadcastToClients({
            type: "update-deleted-house-cards",
            houseCards: vote.ingame.game.deletedHouseCards.values.map(hc => hc.serializeToClient())
        });

        vote.ingame.entireGame.broadcastToClients({
            type: "update-house-cards",
            house: newVassalHouse.id,
            houseCards: []
        });

        // Perform action of current state
        vote.ingame.leafState.actionAfterVassalReplacement(newVassalHouse);

        // In case the new vassal should execute a wildlings effect, skip it
        if (vote.ingame.hasChildGameState(WildlingCardEffectInTurnOrderGameState)) {
            const wildlingEffect = vote.ingame.getChildGameState(WildlingCardEffectInTurnOrderGameState) as WildlingCardEffectInTurnOrderGameState<GameState<any, any>>;
            const leaf = vote.ingame.leafState as any;
            if (leaf.house && leaf.house == newVassalHouse) {
                wildlingEffect.proceedNextHouse(newVassalHouse);
            }
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