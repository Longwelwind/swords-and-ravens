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
import Region from "../../game-data-structure/Region";
import RaidOrderType from "../../game-data-structure/order-types/RaidOrderType";
import groupBy from "../../../../utils/groupBy";

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
        if (this.canBeFastTracked()) {
            this.fastTrackResolution();

            return;
        }

        const houseToResolve = this.getNextHouseToResolveRaidOrder(lastHouseToResolve);

        if (houseToResolve == null) {
            // All raid orders have been executed
            // go the to the next phase
            this.actionGameState.onResolveRaidOrderGameStateFinish();
            return;
        }

        this.setChildGameState(new ResolveSingleRaidOrderGameState(this)).firstStart(houseToResolve);
    }

    fastTrackResolution(): void {
        const allRaidRegions = this.actionGameState.getAllRegionsWithRaidOrder();

        this.ingameGameState.log({
            type: "raid-resolution-fast-track",
            removedOrders: groupBy(allRaidRegions, (region) => {
                const controller = region.getController();

                // This should never happen
                if (controller == null) {
                    throw Error("Region controller is null")
                }

                return controller.id;
            })
                .mapOver(k => k, regions => regions.map(r => [r.id, this.actionGameState.ordersOnBoard.get(r).type.starred]))
        });

        allRaidRegions.forEach((region) => {
            this.actionGameState.ordersOnBoard.delete(region);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: region.id,
                order: null
            })
        });

        this.actionGameState.onResolveRaidOrderGameStateFinish();
        return;
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

    canBeFastTracked(): boolean {
        const allRegionsWithRaids = this.actionGameState.getAllRegionsWithRaidOrder();

        // Fast-track when all raid orders can remove only other raid orders
        return allRegionsWithRaids.every((region) => {
            const order = this.actionGameState.ordersOnBoard.get(region);

            // This shouldn't happen
            if (!(order.type instanceof RaidOrderType)) {
                throw Error("non-raid order passed the filter!");
            }

            const raidableRegions = this.getRaidableRegions(region, order.type);

            return raidableRegions.every((r) => this.actionGameState.ordersOnBoard.get(r).type instanceof RaidOrderType)
        })
    }

    getRaidableRegions(orderRegion: Region, raid: RaidOrderType): Region[] {
        return this.world.getNeighbouringRegions(orderRegion)
            .filter(r => r.getController() != orderRegion.getController())
            .filter(r => this.actionGameState.ordersOnBoard.has(r))
            .filter(r => raid.isValidRaidableOrder(this.actionGameState.ordersOnBoard.get(r)))
            .filter(r => r.type.kind == orderRegion.type.kind || orderRegion.type.canAdditionalyRaid == r.type.kind);
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
