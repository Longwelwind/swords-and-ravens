import GameState from "../../../GameState";
import IngameGameState from "../../IngameGameState";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import Order from "../../game-data-structure/Order";
import Region from "../../game-data-structure/Region";
import World from "../../game-data-structure/World";
import {ServerMessage} from "../../../../messages/ServerMessage";
import {observable} from "mobx";
import BetterMap from "../../../../utils/BetterMap";
import House from "../../game-data-structure/House";
import PlanningGameState from "../PlanningGameState";
import { PlayerActionType } from "../../game-data-structure/GameLog";
import ResolveSinglePlaceOrdersForVassalsGameState, { SerializedSinglePlaceOrdersForVassalsGameState } from "./resolve-single-place-orders-for-vassals-game-state/ResolveSinglePlaceOrdersForVassalsGameState";

const MAX_VASSAL_ORDERS = 2;

export default class PlaceOrdersForVassalsGameState extends GameState<PlanningGameState, ResolveSinglePlaceOrdersForVassalsGameState> {
    @observable house: House;
    @observable commanders: House[] = [];

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState;
    }

    get planningGameState(): PlanningGameState {
        return this.parentGameState;
    }

    get world(): World {
        return this.ingame.game.world;
    }

    get placedOrders(): BetterMap<Region, Order | null> {
        return this.planningGameState.placedOrders;
    }

    firstStart(): void {
        this.commanders = this.ingame.game.getTurnOrder().filter(h => !this.ingame.isVassalHouse(h)
            && this.ingame.getVassalsControlledByPlayer(this.ingame.getControllerOfHouse(h)).length > 0);

        if (this.ingame.getVassalHouses().length > 0) {
            // Only if vassals are in game we want to add this log
            this.ingame.log({
                type: "planning-phase-began",
                forVassals: true
            });
        }

        this.proceedNextResolve();
    }

    submitOrders(player: Player, resolvedAutomatically = false): void {
        if (!this.canSubmit(player).status) {
            return;
        }

        this.ingame.log({
                type: "player-action",
                house: player.house.id,
                action: PlayerActionType.ORDERS_PLACED,
                forHouses: this.ingame.getVassalsControlledByPlayer(player).map(h => h.id)
            }, resolvedAutomatically);

        this.proceedNextResolve();
    }

    private proceedNextResolve(): void {
        const next = this.commanders.shift();

        if (next) {
            this.setChildGameState(new ResolveSinglePlaceOrdersForVassalsGameState(this)).firstStart(next);
            this.entireGame.broadcastToClients({
                type: "next-house",
                house: next.id
            });
            return;
        }

        this.planningGameState.onPlaceOrderForVassalsFinish();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPlaceOrdersForVassalsGameState {
        return {
            type: "place-orders-for-vassals",
            commanders: this.commanders.map(h => h.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    /*
     * Common
     */

    canSubmit(player: Player): {status: boolean; reason: string} {
        // Here we can bypass canSubmit for debugging
        // return {status: true, reason: "bypassed"};

        // Iterate over all the houses the player should put orders for to find
        // an error in one of the houses.
        const possibleError = this.getHousesToPutOrdersForPlayer(player).reduce((state, house) => {
            const orderList = this.getOrdersList(house);
            if (this.getPlacedOrdersOfHouse(house).some(([_r, o]) => !orderList.includes(o))){
                return {status: false, reason: "invalid-orders-placed"};
            }

            const possibleRegions = this.getPossibleRegionsForOrders(house);

            const regionsWithOrders = possibleRegions.filter(r => this.placedOrders.has(r));

            if (possibleRegions.length > MAX_VASSAL_ORDERS) {
                if(regionsWithOrders.length == MAX_VASSAL_ORDERS) {
                    return state;
                } else if (regionsWithOrders.length > MAX_VASSAL_ORDERS) {
                    return {status: false, reason: "too-much-orders-placed"};
                }
            }

            if (possibleRegions.every(r => this.placedOrders.has(r))) {
                return state;
            } else {
                return {status: true, reason: "not-all-regions-filled"};
            }
        }, null);

        return possibleError ? possibleError as {status: boolean; reason: string} : {status: true, reason: ""};
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    /**
     * Queries
     */

    getHousesToPutOrdersForPlayer(player: Player): House[] {
        return this.ingame.getVassalsControlledByPlayer(player);
    }

    getOrdersList(house: House): Order[] {
        return this.ingame.game.getOrdersListForHouse(house);
    }

    getAvailableOrders(house: House): Order[] {
        return this.ingame.game.getAvailableOrders(this.placedOrders, house);
    }

    isOrderAvailable(house: House, order: Order): boolean {
        return this.getAvailableOrders(house).includes(order);
    }

    getPlacedOrdersOfHouse(house: House): [Region, Order][] {
        const possibleRegions = this.world.regions.values.filter(r => r.units.size > 0 && r.getController() == house);

        return possibleRegions.filter(r => this.placedOrders.tryGet(r, null) != null).map(r => [r, this.placedOrders.get(r) as Order]);
    }

    getPossibleRegionsForOrders(house: House): Region[] {
        const possibleRegions = this.world.regions.values.filter(r => r.units.size > 0 && r.getController() == house);

        if (!this.ingame.isVassalHouse(house)) {
            return [];
        }

        const regionsWithOrders = possibleRegions.filter(r => this.placedOrders.has(r));

        if (regionsWithOrders.length == MAX_VASSAL_ORDERS) {
            return regionsWithOrders;
        }

        return possibleRegions;
    }

    static deserializeFromServer(planning: PlanningGameState, data: SerializedPlaceOrdersForVassalsGameState): PlaceOrdersForVassalsGameState {
        const placeOrder = new PlaceOrdersForVassalsGameState(planning);

        placeOrder.commanders = data.commanders.map(hid => planning.ingame.game.houses.get(hid));
        placeOrder.childGameState = ResolveSinglePlaceOrdersForVassalsGameState.deserializeFromServer(placeOrder, data.childGameState);

        return placeOrder;
    }
}

export interface SerializedPlaceOrdersForVassalsGameState {
    type: "place-orders-for-vassals";
    commanders: string[];
    childGameState: SerializedSinglePlaceOrdersForVassalsGameState;
}
