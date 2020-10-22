import EntireGame from "../EntireGame";
import GameState from "../GameState";
import {ClientMessage} from "../../messages/ClientMessage";
import {ServerMessage} from "../../messages/ServerMessage";
import User from "../../server/User";
import World from "./game-data-structure/World";
import Player, {SerializedPlayer} from "./Player";
import Region from "./game-data-structure/Region";
import PlanningGameState, {SerializedPlanningGameState} from "./planning-game-state/PlanningGameState";
import ActionGameState, {SerializedActionGameState} from "./action-game-state/ActionGameState";
import Order from "./game-data-structure/Order";
import Game, {SerializedGame} from "./game-data-structure/Game";
import WesterosGameState, {SerializedWesterosGameState} from "./westeros-game-state/WesterosGameState";
import createGame from "./game-data-structure/createGame";
import BetterMap from "../../utils/BetterMap";
import House from "./game-data-structure/House";
import Unit from "./game-data-structure/Unit";
import PlanningRestriction from "./game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import GameLogManager, {SerializedGameLogManager} from "./game-data-structure/GameLogManager";
import {GameLogData} from "./game-data-structure/GameLog";
import GameEndedGameState, {SerializedGameEndedGameState} from "./game-ended-game-state/GameEndedGameState";
import UnitType from "./game-data-structure/UnitType";
import WesterosCard from "./game-data-structure/westeros-card/WesterosCard";
import Vote, { SerializedVote, VoteState } from "./vote-system/Vote";
import VoteType, { CancelGame, ReplacePlayer } from "./vote-system/VoteType";
import { v4 } from "uuid";
import CancelledGameState, { SerializedCancelledGameState } from "../cancelled-game-state/CancelledGameState";

export const NOTE_MAX_LENGTH = 5000;

export default class IngameGameState extends GameState<
    EntireGame,
    WesterosGameState | PlanningGameState | ActionGameState | CancelledGameState | GameEndedGameState
> {
    players: BetterMap<User, Player> = new BetterMap<User, Player>();
    game: Game;
    gameLogManager: GameLogManager = new GameLogManager(this);
    votes: BetterMap<string, Vote> = new BetterMap();

    get entireGame(): EntireGame {
        return this.parentGameState;
    }

    get world(): World {
        return this.game.world;
    }

    get sortedByLeadingPlayers(): Player[] {
        return this.game.getPotentialWinners().map(h => this.getControllerOfHouse(h));
    }

    constructor(entireGame: EntireGame) {
        super(entireGame);
    }

    beginGame(futurePlayers: BetterMap<string, User>): void {
        this.game = createGame(this.entireGame, futurePlayers.keys);
        this.players = new BetterMap(futurePlayers.map((house, user) => [user, new Player(user, this.game.houses.get(house))]));

        this.beginNewTurn();
    }

    log(data: GameLogData): void {
        this.gameLogManager.log(data);
    }

    onActionGameStateFinish(): void {
        this.beginNewTurn();
    }

    onWesterosGameStateFinish(planningRestrictions: PlanningRestriction[]): void {
        this.proceedPlanningGameState(planningRestrictions);
    }

    broadcastCustom(f: (player: Player | null) => ServerMessage): void {
        this.entireGame.broadcastCustomToClients(u => {
            const player = this.players.has(u) ? this.players.get(u) : null;

            return f(player);
        });
    }

    proceedPlanningGameState(planningRestrictions: PlanningRestriction[] = []): void {
        this.setChildGameState(new PlanningGameState(this)).firstStart(planningRestrictions);
    }

    proceedToActionGameState(placedOrders: BetterMap<Region, Order>, planningRestrictions: PlanningRestriction[]): void {
        // this.placedOrders is of type Map<Region, Order | null> but ActionGameState.firstStart
        // accepts Map<Region, Order>. Server-side, there should never be null values in the map,
        // so it can be converted safely.
        this.setChildGameState(new ActionGameState(this)).firstStart(placedOrders, planningRestrictions);
    }

    beginNewTurn(): void {
        if (this.game.turn == this.game.maxTurns) {
            const winner = this.game.getPotentialWinner();
            this.setChildGameState(new GameEndedGameState(this)).firstStart(winner);
            return;
        }

        this.game.turn++;
        this.log({type: "turn-begin", turn: this.game.turn});

        this.game.valyrianSteelBladeUsed = false;

        // Unwound each units
        this.world.regions.forEach(r => r.units.forEach(u => u.wounded = false));

        this.entireGame.broadcastToClients({
            type: "new-turn"
        });

        if (this.game.turn > 1) {
            this.setChildGameState(new WesterosGameState(this)).firstStart();
        } else {
            // No Westeros phase during the first turn
            this.proceedPlanningGameState();
        }
    }

    onClientMessage(user: User, message: ClientMessage): void {
        if (message.type == "cancel-vote") {
            const vote = this.votes.get(message.vote);

            vote.cancelVote();
        } else if (message.type == "launch-replace-player-vote") {
            const player = this.players.get(this.entireGame.users.get(message.player));

            if (!this.canLaunchReplacePlayerVote(user, player).result) {
                return;
            }

            this.createVote(user, new ReplacePlayer(user, player.user, player.house));
        } else if (this.players.has(user)) {
            const player = this.players.get(user);

            this.onPlayerMessage(player, message);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "vote") {
            const vote = this.votes.get(message.vote);

            if (vote.state != VoteState.ONGOING) {
                return;
            }

            vote.votes.set(player.house, message.choice);

            this.entireGame.broadcastToClients({
                type: "vote-done",
                vote: vote.id,
                voter: player.house.id,
                choice: message.choice
            });

            vote.checkVoteFinished();
        } else if (message.type == "launch-cancel-game-vote") {
            this.createVote(
                player.user,
                new CancelGame()
            );
        } else if (message.type == "update-note") {
            player.note = message.note.substring(0, NOTE_MAX_LENGTH);
        } else {
            this.childGameState.onPlayerMessage(player, message);
        }
    }

    createVote(initiator: User, type: VoteType): Vote {
        const vote = new Vote(this, v4(), initiator, type);

        this.votes.set(vote.id, vote);

        this.entireGame.broadcastToClients({
            type: "vote-started",
            vote: vote.serializeToClient()
        });

        return vote;
    }

    getControllerOfHouse(house: House): Player {
        const player = this.players.values.find(p => p.house == house);

        if (player == null) {
            throw new Error(`Couldn't find a player controlling house "${house.id}"`);
        }

        return player;
    }

    changePowerTokens(house: House, delta: number): number {
        const originalValue = house.powerTokens;

        const powerTokensOnBoardCount = this.game.countPowerTokensOnBoard(house);
        const maxPowerTokenCount = this.game.maxPowerTokens - powerTokensOnBoardCount;

        house.powerTokens += delta;
        house.powerTokens = Math.max(0, Math.min(house.powerTokens, maxPowerTokenCount));

        this.entireGame.broadcastToClients({
            type: "change-power-token",
            houseId: house.id,
            powerTokenCount: house.powerTokens
        });

        return house.powerTokens - originalValue;
    }

    transformUnits(region: Region, units: Unit[], targetType: UnitType): Unit[] {
        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: region.id,
            unitIds: units.map(u => u.id)
        });

        const transformed = units.map(unit => {
            unit.region.units.delete(unit.id);

            const newUnit = this.game.createUnit(unit.region, targetType, unit.allegiance);
            newUnit.region.units.set(newUnit.id, newUnit);

            newUnit.wounded = unit.wounded;

            return newUnit;
        });

        this.entireGame.broadcastToClients({
            type: "add-units",
            units: [[region.id, transformed.map(u => u.serializeToClient())]]
        });

        return transformed;
    }

    checkVictoryConditions(): boolean {
        if (this.game.areVictoryConditionsFulfilled()) {
            // Game is finished
            const winner = this.game.getPotentialWinner();

            this.log({
                type: "winner-declared",
                winner: winner.id
            });

            this.setChildGameState(new GameEndedGameState(this)).firstStart(winner);

            return true;
        } else {
            return false;
        }
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "supply-adjusted") {
            const supplies: [House, number][] = message.supplies.map(([houseId, supply]) => [this.game.houses.get(houseId), supply]);

            supplies.forEach(([house, supply]) => house.supplyLevel = supply);
        } else if (message.type == "change-control-power-token") {
            const region = this.world.regions.get(message.regionId);
            const house = message.houseId ? this.game.houses.get(message.houseId) : null;

            region.controlPowerToken = house;
        } else if (message.type == "change-wildling-strength") {
            this.game.wildlingStrength = message.wildlingStrength;
        } else if (message.type == "add-units") {
            message.units.forEach(([regionId, dataUnits]) => {
                const region = this.world.regions.get(regionId);

                dataUnits.forEach(dataUnit => {
                    const unit = Unit.deserializeFromServer(this.game, dataUnit);
                    unit.region = region;

                    region.units.set(unit.id, unit);
                });
            });
        } else if (message.type == "change-garrison") {
            const region = this.world.regions.get(message.region);

            region.garrison = message.newGarrison;
        } else if (message.type == "remove-units") {
            const region = this.world.regions.get(message.regionId);

            const units = message.unitIds.map(uid => region.units.get(uid));

            units.forEach(unit => region.units.delete(unit.id));
        } else if (message.type == "change-state-house-card") {
            const house = this.game.houses.get(message.houseId);
            const cards = message.cardIds.map(cid => house.houseCards.get(cid));

            cards.forEach(hc => hc.state = message.state);
        } else if (message.type == "move-units") {
            const from = this.world.regions.get(message.from);
            const to = this.world.regions.get(message.to);
            const units = message.units.map(uid => from.units.get(uid));

            units.forEach(u => {
                from.units.delete(u.id);
                to.units.set(u.id, u);
                u.region = to;
            });
        } else if (message.type == "change-power-token") {
            const house = this.game.houses.get(message.houseId);

            house.powerTokens = message.powerTokenCount;
        } else if (message.type == "new-turn") {
            this.game.turn++;
            this.game.valyrianSteelBladeUsed = false;
            this.world.regions.forEach(r => r.units.forEach(u => u.wounded = false));
        } else if (message.type == "add-game-log") {
            this.gameLogManager.logs.push({data: message.data, time: new Date(message.time * 1000)});
        } else if (message.type == "change-tracker") {
            const newOrder = message.tracker.map(hid => this.game.houses.get(hid));

            if (message.trackerI == 0) {
                this.game.ironThroneTrack = newOrder;
            } else if (message.trackerI == 1) {
                this.game.fiefdomsTrack = newOrder;
            } else if (message.trackerI == 2) {
                this.game.kingsCourtTrack = newOrder;
            }
        } else if (message.type == "change-valyrian-steel-blade-use") {
            this.game.valyrianSteelBladeUsed = message.used;
        } else if (message.type == "update-westeros-decks") {
            this.game.westerosDecks = message.westerosDecks.map(wd => wd.map(wc => WesterosCard.deserializeFromServer(wc)));
        } else if (message.type == "hide-top-wildling-card") {
            this.game.houses.forEach(h => h.knowsNextWildlingCard = false);
            this.game.clientNextWildlingCardId = null;
        } else if (message.type == "reveal-top-wildling-card") {
            this.game.houses.get(message.houseId).knowsNextWildlingCard = true;
            this.game.clientNextWildlingCardId = message.cardId;
        } else if (message.type == "vote-started") {
            const vote = Vote.deserializeFromServer(this, message.vote);
            this.votes.set(vote.id, vote);
        } else if (message.type == "vote-cancelled") {
            const vote = this.votes.get(message.vote);
            vote.cancelled = true;
        } else if (message.type == "vote-done") {
            const vote = this.votes.get(message.vote);
            const voter = this.game.houses.get(message.voter);

            vote.votes.set(voter, message.choice);
        } else if (message.type == "player-replaced") {
            const oldPlayer = this.players.get(this.entireGame.users.get(message.oldUser));
            const newUser = this.entireGame.users.get(message.newUser);

            const newPlayer = new Player(newUser, oldPlayer.house);

            this.players.set(newUser, newPlayer);
            this.players.delete(oldPlayer.user);
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    getSpectators(): User[] {
        return this.entireGame.users.values.filter(u => !this.players.keys.includes(u));
    }

    launchCancelGameVote(): void {
        if (window.confirm('Do you want to launch a vote to cancel the game?')) {
            this.entireGame.sendMessageToServer({
                type: "launch-cancel-game-vote"
            });
        }
    }

    canLaunchCancelGameVote(): {result: boolean; reason: string} {
        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof CancelGame);

        if (existingVotes.length > 0) {
            return {result: false, reason: "already-existing"};
        }

        if (this.childGameState instanceof CancelledGameState) {
            return {result: false, reason: "already-cancelled"};
        }

        if (this.childGameState instanceof GameEndedGameState) {
            return {result: false, reason: "already-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchReplacePlayerVote(fromUser: User, _forPlayer: Player): {result: boolean; reason: string} {
        if (this.players.keys.includes(fromUser)) {
            return {result: false, reason: "already-playing"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof ReplacePlayer);
        if (existingVotes.length > 0) {
            return {result: false, reason: "ongoing-vote"};
        }

        if (this.childGameState instanceof CancelledGameState) {
            return {result: false, reason: "game-cancelled"};
        }

        if (this.childGameState instanceof GameEndedGameState) {
            return {result: false, reason: "game-ended"};
        }

        return {result: true, reason: ""};
    }

    launchReplacePlayerVote(player: Player): void {
        this.entireGame.sendMessageToServer({
            type: "launch-replace-player-vote",
            player: player.user.id
        });
    }

    updateNote(note: string): void {
        this.entireGame.sendMessageToServer({
            type: "update-note",
            note: note
        });
    }

    serializeToClient(admin: boolean, user: User | null): SerializedIngameGameState {
        // If user == null, then the game state needs to be serialized
        // in an "admin" version (i.e. containing all data).
        // Otherwise, provide a serialized version that hides data
        // based on which user is requesting the data.
        const player: Player | null = user
            ? (this.players.has(user)
                ? this.players.get(user)
                : null)
            : null;

        return {
            type: "ingame",
            players: this.players.values.map(p => p.serializeToClient(admin, player)),
            game: this.game.serializeToClient(admin, player != null && player.house.knowsNextWildlingCard),
            gameLogManager: this.gameLogManager.serializeToClient(),
            votes: this.votes.values.map(v => v.serializeToClient()),
            childGameState: this.childGameState.serializeToClient(admin, player),
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedIngameGameState): IngameGameState {
        const ingameGameState = new IngameGameState(entireGame);

        ingameGameState.game = Game.deserializeFromServer(data.game);
        ingameGameState.players = new BetterMap(
            data.players.map(p => [entireGame.users.get(p.userId), Player.deserializeFromServer(ingameGameState, p)])
        );
        ingameGameState.votes = new BetterMap(data.votes.map(sv => [sv.id, Vote.deserializeFromServer(ingameGameState, sv)]));
        ingameGameState.gameLogManager = GameLogManager.deserializeFromServer(ingameGameState, data.gameLogManager);
        ingameGameState.childGameState = ingameGameState.deserializeChildGameState(data.childGameState);

        return ingameGameState;
    }

    deserializeChildGameState(data: SerializedIngameGameState["childGameState"]): IngameGameState["childGameState"] {
        switch (data.type) {
            case "westeros":
                return WesterosGameState.deserializeFromServer(this, data);
            case "planning":
                return PlanningGameState.deserializeFromServer(this, data);
            case "action":
                return ActionGameState.deserializeFromServer(this, data);
            case "game-ended":
                return GameEndedGameState.deserializeFromServer(this, data);
            case "cancelled":
                return CancelledGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedIngameGameState {
    type: "ingame";
    players: SerializedPlayer[];
    game: SerializedGame;
    votes: SerializedVote[];
    gameLogManager: SerializedGameLogManager;
    childGameState: SerializedPlanningGameState | SerializedActionGameState | SerializedWesterosGameState
        | SerializedGameEndedGameState | SerializedCancelledGameState;
}
