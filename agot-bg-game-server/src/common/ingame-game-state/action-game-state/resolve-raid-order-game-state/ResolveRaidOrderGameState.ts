import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import ResolveSingleRaidOrderGameState, {SerializedResolveSingleRaidOrderGameState} from "./resolve-single-raid-order-game-state/ResolveSingleRaidOrderGameState";
import IngameGameState from "../../IngameGameState";
import EntireGame from "../../../EntireGame";
import Game from "../../game-data-structure/Game";
import World from "../../game-data-structure/World";
import House from "../../game-data-structure/House";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import RaidOrderType from "../../game-data-structure/order-types/RaidOrderType";
import Region from "../../game-data-structure/Region";

export default class ResolveRaidOrderGameState extends GameState<ActionGameState, ResolveSingleRaidOrderGameState> {
    get actionGameState(): ActionGameState {
        return this.parentGameState;
    }

    get ingameGameState(): IngameGameState {
        return this.actionGameState.ingameGameState;
    }

    get entireGame(): EntireGame {
        return this.actionGameState.entireGame;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    firstStart(): void {
        this.proceedNextResolveSingleRaidOrder(null);
    }

    getRaidableRegions(orderRegion: Region): Region[] {
        const order = this.getRaidOrder(orderRegion);

        if (!order) {
            return [];
        }

        // getController() can safely be casted here as a region with an order always has a controller
        const orderRegionController = orderRegion.getController() as House;

        return this.world.getNeighbouringRegions(orderRegion)
            .filter(r => r.getController() != orderRegionController)
            .filter(r => this.actionGameState.ordersOnBoard.has(r))
            .filter(r => order.isValidRaidableOrder(this.actionGameState.ordersOnBoard.get(r)))
            .filter(r => r.type.kind == orderRegion.type.kind || orderRegion.type.canAdditionalyRaid == r.type.kind);
    }

    private canRegionWithRaidOrderBeRaidedByEnemiesRaidOrder(region: Region): boolean {
        const order = this.getRaidOrder(region);

        if (!order) {
            throw new Error("A raid order has to be present in the given region!");
        }

        // getController() can be safely cast here as a region with an order must have a controller
        const controller = region.getController() as House;

        // Get neighbouring regions with enemy raid orders
        const adjectRegionsWithRaidOrders = this.world.getNeighbouringRegions(region)
                                                .filter(r => r.getController() != controller)
                                                .filter(r => this.getRaidOrder(r) != null);

        return adjectRegionsWithRaidOrders.some(r => this.getRaidableRegions(r).includes(region));
    }

    private getRaidOrder(region: Region): RaidOrderType | null {
        const order = this.actionGameState.ordersOnBoard.tryGet(region, null);

        if (order && (order.type instanceof RaidOrderType)) {
            return order.type;
        }

        return null;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onResolveSingleRaidOrderGameStateEnd(house: House): void {
        // Check if an other raid order can be resolved
        this.proceedNextResolveSingleRaidOrder(house);
    }

    proceedNextResolveSingleRaidOrder(lastHouseToResolve: House | null = null): void {
        const houseToResolve = this.getNextHouseToResolveRaidOrder(lastHouseToResolve);

        if (houseToResolve == null) {
            // All raid orders have been executed
            // go the to the next phase
            this.actionGameState.onResolveRaidOrderGameStateFinish();
            return;
        }

        const allRaidOrderRegions = this.actionGameState.getRegionsWithRaidOrderOfHouse(houseToResolve);

        if(allRaidOrderRegions.length == 0) {
            throw new Error("At that point at least one region with a raid order must be present!");
        }

        // Before asking the player to resolve a Raid order,
        // check if they only have unusuable raid orders which can't be raided themselves.
        // In that case, fast-track the process and simply resolve one of those.
        if (allRaidOrderRegions.every(r => this.getRaidableRegions(r).length == 0 && !this.canRegionWithRaidOrderBeRaidedByEnemiesRaidOrder(r))) {
            const regionWhereRaidOrderCanBeRemoved = allRaidOrderRegions[0];

            this.ingameGameState.log({
                type: "raid-done",
                raider: (regionWhereRaidOrderCanBeRemoved.getController() as House).id, // can safely casted here as region has an order and therefore it mus be controlled
                raiderRegion: regionWhereRaidOrderCanBeRemoved.id,
                raidedRegion: null,
                raidee: null,
                orderRaided: null
            });

            this.actionGameState.ordersOnBoard.delete(regionWhereRaidOrderCanBeRemoved);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: regionWhereRaidOrderCanBeRemoved.id,
                order: null
            });

            this.proceedNextResolveSingleRaidOrder(houseToResolve);
        } else {
            this.setChildGameState(new ResolveSingleRaidOrderGameState(this)).firstStart(houseToResolve);
        }
    }

    getNextHouseToResolveRaidOrder(lastHouseToResolve: House | null): House | null {
        let currentHouseToCheck = lastHouseToResolve ? this.game.getNextInTurnOrder(lastHouseToResolve) : this.game.getTurnOrder()[0];

        // Check each house in order to find one that has an available March order.
        // Check at most once for each house
        for (let i = 0;i < this.game.houses.size;i++) {
            const regions = this.actionGameState.getRegionsWithRaidOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }

            currentHouseToCheck = this.game.getNextInTurnOrder(currentHouseToCheck);
        }

        // If no house has any raid order available, return null
        return null;
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveRaidOrderGameState {
        return {
            type: "resolve-raid-order",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(actionGameState: ActionGameState, data: SerializedResolveRaidOrderGameState): ResolveRaidOrderGameState {
        const resolveRaidOrder = new ResolveRaidOrderGameState(actionGameState);

        resolveRaidOrder.childGameState = resolveRaidOrder.deserializeChildGameState(data.childGameState);

        return resolveRaidOrder;
    }

    deserializeChildGameState(data: SerializedResolveRaidOrderGameState["childGameState"]): ResolveSingleRaidOrderGameState {
        return ResolveSingleRaidOrderGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedResolveRaidOrderGameState {
    type: "resolve-raid-order";
    childGameState: SerializedResolveSingleRaidOrderGameState;
}
