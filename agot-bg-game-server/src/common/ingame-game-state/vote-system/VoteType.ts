import IngameGameState, { ReplacementReason } from "../IngameGameState";
import Vote from "./Vote";
import CancelledGameState from "../../cancelled-game-state/CancelledGameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import User from "../../../server/User";
import BetterMap from "../../../utils/BetterMap";
import PlaceOrdersGameState from "../planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import Region from "../game-data-structure/Region";
import Order from "../game-data-structure/Order";
import _ from "lodash";
import GameEndedGameState from "../game-ended-game-state/GameEndedGameState";

export type SerializedVoteType = SerializedCancelGame | SerializedEndGame
    | SerializedReplacePlayer | SerializedReplacePlayerByVassal | SerializedReplaceVassalByPlayer
    | SerializedPauseGame | SerializedResumeGame | SerializedExtendPlayerClocks;

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
            case "extend-all-player-clocks":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return ExtendPlayerClocks.deserializeFromServer(ingame, data);
            case "pause-game":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return PauseGame.deserializeFromServer(ingame, data);
            case "resume-game":
                // Same than above
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                return ResumeGame.deserializeFromServer(ingame, data);
        }
    }
}

export class PauseGame extends VoteType {
    verb(): string {
        return "pause the game";
    }

    executeAccepted(vote: Vote): void {
        const ingame = vote.ingame;

        ingame.paused = new Date();

        ingame.players.forEach(p => {
            if (!p.liveClockData) {
                throw new Error("LiveClockData must be present in PauseGame");
            }

            if (p.liveClockData.timerStartedAt) {
                if (!p.liveClockData.serverTimer) {
                    throw new Error("A serverTimer must be present when timerStartedAt is set");
                }

                p.liveClockData.remainingSeconds = p.totalRemainingSeconds;

                clearTimeout(p.liveClockData.serverTimer);
                p.liveClockData.serverTimer = null;
                p.liveClockData.timerStartedAt = null;

                ingame.entireGame.broadcastToClients({
                    type: "stop-player-clock",
                    remainingSeconds: p.liveClockData.remainingSeconds,
                    userId: p.user.id
                });
            }
        });

        if (!ingame.entireGame.gameSettings.private) {
            // Start a timer to auto resume
            const tenMinutesInMs = 10 * 60 * 1000;
            ingame.autoResumeTimeout = setTimeout(() => { ingame.resumeGame(); }, tenMinutesInMs);
            ingame.willBeAutoResumedAt = new Date(new Date().getTime() + tenMinutesInMs);
        }

        ingame.log({
            type: "game-paused"
        });
        ingame.entireGame.broadcastToClients({
            type: "game-paused",
            willBeAutoResumedAt: ingame.willBeAutoResumedAt ? ingame.willBeAutoResumedAt.getTime() : null
        });
    }

    serializeToClient(): SerializedPauseGame {
        return {
            type: "pause-game"
        };
    }

    static deserializeFromServer(_ingame: IngameGameState, _data: SerializedPauseGame): PauseGame {
        return new PauseGame();
    }
}

export interface SerializedPauseGame {
    type: "pause-game";
}

export class ResumeGame extends VoteType {
    verb(): string {
        return "resume the game";
    }

    executeAccepted(vote: Vote): void {
        const ingame = vote.ingame;

        // Reset a possible running resume timer
        if (ingame.autoResumeTimeout) {
            clearTimeout(ingame.autoResumeTimeout);
            ingame.autoResumeTimeout = null;
        }

        ingame.resumeGame(true);
    }

    serializeToClient(): SerializedResumeGame {
        return {
            type: "resume-game"
        };
    }

    static deserializeFromServer(_ingame: IngameGameState, _data: SerializedResumeGame): ResumeGame {
        return new ResumeGame();
    }
}

export interface SerializedResumeGame {
    type: "resume-game";
}

export class ExtendPlayerClocks extends VoteType {
    verb(): string {
        return "extend all player clocks by 15 minutes";
    }

    executeAccepted(vote: Vote): void {
        const ingame = vote.ingame;

        ingame.players.forEach(p => {
            if (!p.liveClockData) {
                throw new Error("LiveClockData must be present in ExtendPlayerClocks");
            }

            if (!p.liveClockData.timerStartedAt) {
                p.liveClockData.remainingSeconds += 15 * 60;
                ingame.entireGame.broadcastToClients({
                    type: "stop-player-clock",
                    remainingSeconds: p.liveClockData.remainingSeconds,
                    userId: p.user.id
                });
            } else {
                if (!p.liveClockData.serverTimer) {
                    throw new Error("A serverTimer must be present when timerStartedAt is set");
                }

                p.liveClockData.remainingSeconds = p.totalRemainingSeconds + 15 * 60;

                ingame.entireGame.broadcastToClients({
                    type: "stop-player-clock",
                    remainingSeconds: p.liveClockData.remainingSeconds,
                    userId: p.user.id
                });

                clearTimeout(p.liveClockData.serverTimer);
                p.liveClockData.serverTimer = setTimeout(() => { ingame.onPlayerClockTimeout(p) }, p.liveClockData.remainingSeconds * 1000);
                p.liveClockData.timerStartedAt = new Date();

                ingame.entireGame.broadcastToClients({
                    type: "start-player-clock",
                    remainingSeconds: p.liveClockData.remainingSeconds,
                    timerStartedAt: p.liveClockData.timerStartedAt.getTime(),
                    userId: p.user.id
                });
            }
        });
    }

    serializeToClient(): SerializedExtendPlayerClocks {
        return {
            type: "extend-all-player-clocks"
        };
    }

    static deserializeFromServer(_ingame: IngameGameState, _data: SerializedExtendPlayerClocks): ExtendPlayerClocks {
        return new ExtendPlayerClocks();
    }
}

export interface SerializedExtendPlayerClocks {
    type: "extend-all-player-clocks";
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
        if (!this.replaced.connected && !vote.ingame.entireGame.gameSettings.onlyLive && vote.ingame.players.size >= 5) {
            // Let the player to be replaced automatically vote with accept when he is offline
            // to make it easier to replace quitters. But only do it if there are more than 4 players
            // left in game because with 4 players only and one auto vote, just one other vote would be required
            vote.votes.set(this.forHouse, true);
            vote.checkVoteFinished();
        }
    }

    verb(): string {
        return `replace ${this.replaced.name} (${this.forHouse.name})`;
    }

    executeAccepted(vote: Vote): void {
        vote.ingame.cancelPendingReplaceVotes();

        // Create a new player to replace the old one
        const oldPlayer = vote.ingame.players.values.find(p => p.house == this.forHouse) as Player;
        vote.ingame.endPlayerClock(oldPlayer);

        const newPlayer = new Player(this.replacer, this.forHouse);
        vote.ingame.applyAverageOfRemainingClocksToNewPlayer(newPlayer, oldPlayer);

        if (vote.ingame.entireGame.gameSettings.faceless) {
            newPlayer.user.facelessName = vote.ingame.getFreeFacelessName() ?? newPlayer.user.facelessName;
            vote.ingame.entireGame.hideOrRevealUserNames(false);
        }

        if (!vote.ingame.oldPlayerIds.includes(oldPlayer.user.id)) {
            vote.ingame.oldPlayerIds.push(oldPlayer.user.id);
        }

        if (!vote.ingame.replacerIds.includes(newPlayer.user.id)) {
            vote.ingame.replacerIds.push(newPlayer.user.id);
        }

        vote.ingame.players.delete(oldPlayer.user);
        vote.ingame.players.set(newPlayer.user, newPlayer);

        vote.ingame.entireGame.broadcastToClients({
            type: "player-replaced",
            oldUser: oldPlayer.user.id,
            newUser: newPlayer.user.id,
            liveClockRemainingSeconds: newPlayer.liveClockData?.remainingSeconds
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

    onVoteCreated(vote: Vote): void {
        if (!this.replaced.connected && !vote.ingame.entireGame.gameSettings.onlyLive && vote.ingame.players.size >= 5) {
            // Let the player to be replaced automatically vote with accept when he is offline
            // to make it easier to replace quitters. But only do it if there are more than 4 players
            // left in game because with 4 players only and one auto vote, just one other vote would be required
            vote.votes.set(this.forHouse, true);
            vote.checkVoteFinished();
        }
    }

    verb(): string {
        return `replace ${this.replaced.name} (${this.forHouse.name}) with a vassal`;
    }

    executeAccepted(vote: Vote): void {
        const ingame = vote.ingame;
        const oldPlayer = ingame.players.values.find(p => p.user == this.replaced) as Player;
        ingame.endPlayerClock(oldPlayer);

        if (ingame.players.size == 2) {
            // Replacing a vassal now could lead to an invalid state.
            // E.G. PayDebtsGameState will fail because there is no-one left to do the destroy units choice
            // When we are in combat, replacing vassal will fail, as there is no house left to assign the new vassal
            // Therefore we go to GameEnded first and then replace the last house with a vassal:

            const winner = _.without(ingame.players.values, oldPlayer)[0].house;
            ingame.setChildGameState(new GameEndedGameState(ingame)).firstStart(winner);
            ingame.entireGame.checkGameStateChanged();
        }

        ingame.replacePlayerByVassal(oldPlayer, ReplacementReason.VOTE);
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
        vote.ingame.cancelPendingReplaceVotes();

        // Create a new player to replace the vassal
        const newPlayer = new Player(this.replacer, this.forHouse);
        vote.ingame.applyAverageOfRemainingClocksToNewPlayer(newPlayer, null);

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
            user: newPlayer.user.id,
            liveClockRemainingSeconds: newPlayer.liveClockData?.remainingSeconds
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

            // Reset waitedFor data, to properly call ingame.setWaitedForPlayers() by the game-state-change
            vote.ingame.resetAllWaitedForData();

            // game-state-change will notify all waited users, no need to do it explicitly
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