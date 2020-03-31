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

const MAX_POWER_TOKENS = 20;

export default class IngameGameState extends GameState<
    EntireGame,
    WesterosGameState | PlanningGameState | ActionGameState | GameEndedGameState
> {
    players: BetterMap<User, Player> = new BetterMap<User, Player>();
    game: Game;
    gameLogManager: GameLogManager = new GameLogManager(this);

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
        if (this.players.has(user)) {
            const player = this.players.get(user);

            this.childGameState.onPlayerMessage(player, message);
        }
    }

    getControllerOfHouse(house: House): Player {
        const player = this.players.values.find(p => p.house == house);

        if (player == null) {
            throw new Error();
        }

        return player;
    }

    changePowerTokens(house: House, delta: number): number {
        const originalValue = house.powerTokens;

        const powerTokensOnBoardCount = this.game.countPowerTokensOnBoard(house);
        const maxPowerTokenCount = MAX_POWER_TOKENS - powerTokensOnBoardCount;

        house.powerTokens += delta;
        house.powerTokens = Math.max(0, Math.min(house.powerTokens, maxPowerTokenCount));

        this.entireGame.broadcastToClients({
            type: "change-power-token",
            houseId: house.id,
            powerTokenCount: house.powerTokens
        });

        return originalValue - house.powerTokens;
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
        } else
        if (message.type == "change-valyrian-steel-blade-use") {
            this.game.valyrianSteelBladeUsed = message.used;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    serializeToClient(user: User | null): SerializedIngameGameState {
        // If user == null, then the game state needs to be serialized
        // in an "admin" version (i.e. containing all data).
        // Otherwise, provide a serialized version that hides data
        // based on which user is requesting the data.
        const admin = user == null;
        const player: Player | null = user
            ? (this.players.has(user)
                ? this.players.get(user)
                : null)
            : null;

        return {
            type: "ingame",
            players: this.players.values.map(p => p.serializeToClient()),
            game: this.game.serializeToClient(admin),
            gameLogManager: this.gameLogManager.serializeToClient(),
            childGameState: this.childGameState.serializeToClient(admin, player),
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedIngameGameState): IngameGameState {
        const ingameGameState = new IngameGameState(entireGame);

        ingameGameState.game = Game.deserializeFromServer(data.game);
        ingameGameState.players = new BetterMap(
            data.players.map(p => [entireGame.users.get(p.userId), Player.deserializeFromServer(ingameGameState, p)])
        );
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
        }
    }
}

export interface SerializedIngameGameState {
    type: "ingame";
    players: SerializedPlayer[];
    game: SerializedGame;
    gameLogManager: SerializedGameLogManager;
    childGameState: SerializedPlanningGameState | SerializedActionGameState | SerializedWesterosGameState
        | SerializedGameEndedGameState;
}
