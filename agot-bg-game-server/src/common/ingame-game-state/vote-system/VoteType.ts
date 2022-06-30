import IngameGameState from "../IngameGameState";
import Vote, { VoteState } from "./Vote";
import CancelledGameState from "../../cancelled-game-state/CancelledGameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import User from "../../../server/User";
import CombatGameState from "../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import WildlingCardEffectInTurnOrderGameState from "../westeros-game-state/wildlings-attack-game-state/WildlingCardEffectInTurnOrderGameState";
import GameState from "../../../common/GameState";
import BetterMap from "../../../utils/BetterMap";
import HouseCardResolutionGameState from "../action-game-state/resolve-march-order-game-state/combat-game-state/house-card-resolution-game-state/HouseCardResolutionGameState";
import PlaceOrdersGameState from "../planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import Region from "../game-data-structure/Region";
import Order from "../game-data-structure/Order";

export type SerializedVoteType = SerializedCancelGame | SerializedEndGame
    | SerializedReplacePlayer | SerializedReplacePlayerByVassal | SerializedReplaceVassalByPlayer;

export default abstract class VoteType {
    abstract serializeToClient(): SerializedVoteType;
    abstract verb(): string;
    abstract executeAccepted(vote: Vote): void;

    getPositiveCountToPass(vote: Vote): number {
        return Math.floor(vote.participatingHouses.length * 2 / 3);
    }

    onVoteCreated(_vote: Vote): void {
    }

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
            case "replace-vassal-by-player":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return ReplaceVassalByPlayer.deserializeFromServer(ingame, data);
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

    getPositiveCountToPass(vote: Vote): number {
        const calculated = super.getPositiveCountToPass(vote);
        return vote.ingame.entireGame.gameSettings.onlyLive ? Math.min(calculated, 3) : calculated;
    }

    onVoteCreated(vote: Vote): void {
        if (!this.replaced.connected && !vote.ingame.entireGame.gameSettings.onlyLive) {
            vote.votes.set(this.forHouse, true);
            vote.checkVoteFinished();
        }
    }

    verb(): string {
        return `replace ${this.replaced.name} (${this.forHouse.name})`;
    }

    executeAccepted(vote: Vote): void {
        // Create a new player to replace the old one
        const oldPlayer = vote.ingame.players.values.find(p => p.house == this.forHouse) as Player;
        const newPlayer = new Player(this.replacer, this.forHouse);

        if (vote.ingame.entireGame.gameSettings.faceless) {
            newPlayer.user.facelessName = vote.ingame.getFreeFacelessName() ?? newPlayer.user.facelessName;
            vote.ingame.entireGame.hideOrRevealUserNames(false);
        }

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

        // Re-transmit the whole game, so newPlayer receives possible secrets like objectives in FFC
        newPlayer.user.send({
            type: "authenticate-response",
            game: vote.ingame.entireGame.serializeToClient(newPlayer.user),
            userId: newPlayer.user.id
        });

        // If we are waiting for newPlayer, notify him about his turn
        if (vote.ingame.leafState.getWaitedUsers().includes(newPlayer.user)) {
            newPlayer.setWaitedFor();
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

    getPositiveCountToPass(vote: Vote): number {
        const calculated = super.getPositiveCountToPass(vote);
        return vote.ingame.entireGame.gameSettings.onlyLive ? Math.min(calculated, 3) : calculated;
    }

    onVoteCreated(vote: Vote): void {
        if (!this.replaced.connected && !vote.ingame.entireGame.gameSettings.onlyLive) {
            vote.votes.set(this.forHouse, true);
            vote.checkVoteFinished();
        }
    }

    verb(): string {
        return `replace ${this.replaced.name} (${this.forHouse.name}) with a vassal`;
    }

    executeAccepted(vote: Vote): void {
        const oldPlayer = vote.ingame.players.values.find(p => p.user == this.replaced) as Player;
        const newVassalHouse = oldPlayer.house;

        // In case the new vassal house is needed for another vote, vote with Reject
        const missingVotes = vote.ingame.votes.values.filter(v => v.state == VoteState.ONGOING && v.participatingHouses.includes(newVassalHouse) && !v.votes.has(newVassalHouse));
        missingVotes.forEach(v => {
            v.votes.set(newVassalHouse, false);
            vote.ingame.entireGame.broadcastToClients({
                type: "vote-done",
                choice: false,
                vote: v.id,
                voter: newVassalHouse.id
            });

            // We don't need to call v.checkVoteFinished() here as we vote with Reject and therefore never call executeAccepted()
        });

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

        newVassalHouse.hasBeenReplacedByVassal = true;

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
        vote.ingame.game.oldPlayerHouseCards.set(newVassalHouse, newVassalHouse.houseCards);

        // Only clear house cards now, when game is not in HouseCardResolutionGameState as some abilities like Viserys
        // require a hand and will result in SelectHouseCardGameState with 0 cards for selection
        if (!vote.ingame.hasChildGameState(HouseCardResolutionGameState)) {
            newVassalHouse.houseCards = new BetterMap();
        }

        vote.ingame.entireGame.broadcastToClients({
            type: "update-old-player-house-cards",
            houseCards: vote.ingame.game.oldPlayerHouseCards.entries.map(([h, hcs]) => [h.id, hcs.values.map(hc => hc.serializeToClient())])
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

        const newCommanderPlayer = vote.ingame.players.values.find(p => p.house == newCommander);
        // If we are waiting for the new commander, notify them about their turn
        if (newCommanderPlayer && vote.ingame.leafState.getWaitedUsers().includes(newCommanderPlayer.user)) {
            vote.ingame.entireGame.notifyWaitedUsers([newCommanderPlayer.user]);
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

export class ReplaceVassalByPlayer extends VoteType {
    replacer: User;
    forHouse: House;

    constructor(replacer: User, forHouse: House) {
        super();
        this.replacer = replacer
        this.forHouse = forHouse;
    }

    getPositiveCountToPass(vote: Vote): number {
        const calculated = super.getPositiveCountToPass(vote);
        return vote.ingame.entireGame.gameSettings.onlyLive ? Math.min(calculated, 3) : calculated;
    }

    verb(): string {
        return `replace vassal house ${this.forHouse.name}`;
    }

    executeAccepted(vote: Vote): void {
        // Create a new player to replace the vassal
        const newPlayer = new Player(this.replacer, this.forHouse);

        if (vote.ingame.entireGame.gameSettings.faceless) {
            newPlayer.user.facelessName = vote.ingame.getFreeFacelessName() ?? newPlayer.user.facelessName;
            vote.ingame.entireGame.hideOrRevealUserNames(false);
        }

        this.forHouse.hasBeenReplacedByVassal = false;

        vote.ingame.players.set(newPlayer.user, newPlayer);

        // Remove house from vassal relations
        vote.ingame.game.vassalRelations.delete(this.forHouse)

        // Broadcast new vassal relations
        vote.ingame.broadcastVassalRelations();

        vote.ingame.entireGame.broadcastToClients({
            type: "vassal-replaced",
            house: this.forHouse.id,
            user: newPlayer.user.id
        });

        vote.ingame.log({
            type: "vassal-replaced",
            house: this.forHouse.id,
            user: this.replacer.id
        });

        // Reset original house cards
        this.forHouse.houseCards = vote.ingame.game.oldPlayerHouseCards.get(this.forHouse);
        vote.ingame.game.oldPlayerHouseCards.delete(this.forHouse);

        vote.ingame.entireGame.broadcastToClients({
            type: "update-old-player-house-cards",
            houseCards: vote.ingame.game.oldPlayerHouseCards.entries.map(([h, hcs]) => [h.id, hcs.values.map(hc => hc.serializeToClient())])
        });

        vote.ingame.entireGame.broadcastToClients({
            type: "update-house-cards",
            house: this.forHouse.id,
            houseCards: this.forHouse.houseCards.values.map(hc => hc.serializeToClient())
        });

        const placeOrders = vote.ingame.leafState instanceof PlaceOrdersGameState ? vote.ingame.leafState : null;
        if (placeOrders && placeOrders.forVassals) {
            const planning = placeOrders.parentGameState;
            const placedPlayerOrders = placeOrders.placedOrders.entries.filter(([r, o]) => {
                const ctrl = r.getController();
                // Server-side the order is never null but it doesn't hurt to check before we cast to <Region, Order>
                return o != null && ctrl && !vote.ingame.isVassalHouse(ctrl) && ctrl != this.forHouse;
            }) as [Region, Order][];
            planning.setChildGameState(new PlaceOrdersGameState(planning)).firstStart(new BetterMap(placedPlayerOrders));
        } else if (vote.ingame.leafState.getWaitedUsers().includes(newPlayer.user)) {
            // If we are waiting for the newPlayer, notify them about their turn
            newPlayer.setWaitedFor();
            vote.ingame.entireGame.notifyWaitedUsers([newPlayer.user]);
        }

        // Re-transmit the whole game, so newPlayer receives possible secrets like objectives in FFC
        newPlayer.user.send({
            type: "authenticate-response",
            game: vote.ingame.entireGame.serializeToClient(newPlayer.user),
            userId: newPlayer.user.id
        });
    }

    serializeToClient(): SerializedReplaceVassalByPlayer {
        return {
            type: "replace-vassal-by-player",
            replacer: this.replacer.id,
            forHouse: this.forHouse.id
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedReplaceVassalByPlayer): ReplaceVassalByPlayer {
        const replacer = ingame.entireGame.users.get(data.replacer);
        const forHouse = ingame.game.houses.get(data.forHouse);

        return new ReplaceVassalByPlayer(replacer, forHouse);
    }
}

export interface SerializedReplaceVassalByPlayer {
    type: "replace-vassal-by-player";
    replacer: string;
    forHouse: string;
}