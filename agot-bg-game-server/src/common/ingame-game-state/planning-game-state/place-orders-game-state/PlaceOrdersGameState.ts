import GameState from "../../../GameState";
import IngameGameState from "../../IngameGameState";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import Order from "../../game-data-structure/Order";
import Region from "../../game-data-structure/Region";
import World from "../../game-data-structure/World";
import orders from "../../game-data-structure/orders";
import {ServerMessage} from "../../../../messages/ServerMessage";
import EntireGame from "../../../EntireGame";
import {observable} from "mobx";
import BetterMap from "../../../../utils/BetterMap";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import User from "../../../../server/User";
import PlanningGameState from "../PlanningGameState";
import { PlayerActionType } from "../../game-data-structure/GameLog";
import _ from "lodash";

const MAX_VASSAL_ORDERS = 2;

export default class PlaceOrdersGameState extends GameState<PlanningGameState> {
    // Server-side, the value of the map should never be null.
    // Client-side, the client can receive a null value if it is the order of an other player,
    // it thus represents a face-down order (this player can't see it).
    @observable placedOrders: BetterMap<Region, Order | null> = new BetterMap<Region, Order | null>();
    @observable readyHouses: House[] = [];

    /**
     * Indicates whether this PlaceOrdersGameState phase is for vassals or for non-vassals.
     * PlanningGameState will first go through a phase for non-vassals and then a phase for vassals.
     */
    @observable forVassals: boolean;

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState;
    }

    get planningGameState(): PlanningGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    get participatingHouses(): House[] {
        return this.forVassals ? this.game.houses.values.filter(h => this.ingame.isVassalHouse(h)) : this.game.houses.values.filter(h => !this.ingame.isVassalHouse(h));
    }

    firstStart(orders = new BetterMap<Region, Order>(), forVassals = false): void {
        this.placedOrders = orders;
        this.forVassals = forVassals;

        if (!this.forVassals || this.ingame.getVassalHouses().length > 0) {
            this.ingame.log({
                type: "planning-phase-began",
                forVassals: this.forVassals
            });
        }

        if (this.forVassals && this.ingame.getVassalHouses().length == 0) {
            // No vassals, we can end this state
            this.planningGameState.onPlaceOrderFinish(this.forVassals, this.placedOrders as BetterMap<Region, Order>);
            return;
        }

        // Automatically set ready for houses which can't place orders
        this.ingame.players.forEach(p => {
            const availableRegionsForOrders = this.forVassals
            ? this.ingame.getVassalsControlledByPlayer(p).reduce((count, h) => count + this.getPossibleRegionsForOrders(h).length, 0)
            : this.getPossibleRegionsForOrders(p.house).length;

            if (availableRegionsForOrders == 0) {
                this.setReady(p);
            }
        });
    }

    private setReady(player: Player): void {
        if (!this.canReady(player).status) {
            return;
        }

        if (this.forVassals) {
            this.readyHouses.push(...this.ingame.getVassalsControlledByPlayer(player));
        } else {
            this.readyHouses.push(player.house);
        }

        // This is for debug to allow bypassing canReady and a player sending "ready" more than once
        // It doesn't hurt on the live system either...
        this.readyHouses = _.uniq(this.readyHouses);

        if (!this.forVassals || this.ingame.getVassalsControlledByPlayer(player).length > 0) {
            this.ingame.log({
                type: "player-action",
                house: player.house.id,
                action: PlayerActionType.ORDERS_PLACED
            });
        }

        this.entireGame.broadcastToClients({
            type: "player-ready",
            userId: player.user.id
        });

        // Check if all players are ready
        this.checkAndProceedEndOfPlaceOrdersGameState();
    }

    private checkAndProceedEndOfPlaceOrdersGameState(): boolean {
        if (this.readyHouses.length == this.participatingHouses.length) {
            this.planningGameState.onPlaceOrderFinish(this.forVassals, this.placedOrders as BetterMap<Region, Order>);
            return true;
        }

        return false;
    }

    canUnready(player: Player): {status: boolean; reason: string} {
        if ((this.forVassals && this.ingame.getVassalsControlledByPlayer(player).some(h => !this.isReady(h)))
            || (!this.forVassals && !this.isReady(player.house))) {
            return {status: false, reason: "not-ready"};
        }

        return {status: true, reason: "player-can-unready"};
    }

    setUnready(player: Player): void {
        if (!this.canUnready(player).status) {
            return;
        }

        this.readyHouses = this.forVassals
                ? _.without(this.readyHouses, ...this.ingame.getVassalsControlledByPlayer(player))
                : _.without(this.readyHouses, player.house);

        this.entireGame.broadcastToClients({
            type: "player-unready",
            userId: player.user.id
        });
    }

    isOrderAvailable(house: House, order: Order): boolean {
        return this.getAvailableOrders(house).includes(order);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "place-order") {
            const order = message.orderId ? orders.get(message.orderId) : null;
            const region = this.world.regions.get(message.regionId);

            // Retrieve the house for which this order has been placed for.
            const house = _.find(this.getHousesToPutOrdersForPlayer(player), h => this.getPossibleRegionsForOrders(h).includes(region));

            if (house == null) {
                return;
            }

            if (order && !this.isOrderAvailable(house, order)) {
                return;
            }

            // When a player placed or removed an order he is unready
            this.setUnready(player);

            if (order) {
                this.placedOrders.set(region, order);
                player.user.send({
                    type: "order-placed",
                    order: order.id,
                    region: region.id
                });

                this.entireGame.users.values.filter(u => u != player.user).forEach(u => {
                    u.send({
                        type: "order-placed",
                        region: region.id,
                        order: null
                    });
                });
            } else if (this.placedOrders.has(region)) {
                this.placedOrders.delete(region);
                this.entireGame.broadcastToClients({
                    type: "remove-placed-order",
                    regionId: region.id
                });
            }
        } else if (message.type == "ready") {
            this.setReady(player);
        } else if (message.type == "unready") {
            this.setUnready(player);
        }
    }

    getPossibleRegionsForOrders(house: House): Region[] {
        const possibleRegions = this.game.world.getControlledRegions(house).filter(r => r.units.size > 0);

        if (!this.forVassals) {
            if (!this.ingame.isVassalHouse(house)) {
                return possibleRegions;
            } else {
                return [];
            }
        }

        if (!this.ingame.isVassalHouse(house)) {
            return [];
        }

        const regionsWithOrders = possibleRegions.filter(r => this.placedOrders.has(r));

        if (regionsWithOrders.length == MAX_VASSAL_ORDERS) {
            return regionsWithOrders;
        }

        return possibleRegions;
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPlaceOrdersGameState {
        const placedOrders = this.placedOrders.mapOver(r => r.id, (o, r) => {
            // Hide orders that doesn't belong to the player
            // If admin, send all orders.
            const controller = r.getController();
            if (admin || (player && controller != null && (controller == player.house || (this.ingame.isVassalHouse(controller) && this.ingame.isVassalControlledByPlayer(controller, player))))) {
                return o ? o.id : null;
            }
            return null;
        });

        return {
            type: "place-orders",
            placedOrders: placedOrders,
            readyHouses: this.readyHouses.map(h => h.id),
            forVassals: this.forVassals
        };
    }

    /*
     * Common
     */

    canReady(player: Player): {status: boolean; reason: string} {
        // Here we can bypass canReady for debugging
        // return {status: true, reason: "bypassed"};

        // Return false if player is already ready
        if ((this.forVassals && this.ingame.getVassalsControlledByPlayer(player).every(h => this.isReady(h)))
            || (!this.forVassals && this.isReady(player.house))) {
            return {status: false, reason: "already-ready"};
        }

        // Iterate over all the houses the player should put orders for to find
        // an error in one of the houses.
        const possibleError = this.getHousesToPutOrdersForPlayer(player).reduce((state, house) => {
            const possibleRegions = this.getPossibleRegionsForOrders(house);

            if (this.forVassals) {
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
                    return {status: false, reason: "not-all-regions-filled"};
                }
            }

            if (possibleRegions.every(r => this.placedOrders.has(r)) || this.getAvailableOrders(house).length == 0)
            {
                // All possible regions have orders
                return state;
            }

            return {status: false, reason: "not-all-regions-filled"};
        }, null);

        return possibleError ? possibleError as {status: boolean; reason: string} : {status: true, reason: ""};
    }

    /**
     * Client
     */
    assignOrder(region: Region, order: Order | null): void {
        this.entireGame.sendMessageToServer({
            type: "place-order",
            regionId: region.id,
            orderId: order ? order.id : null
        });
    }

    ready(): void {
        this.entireGame.sendMessageToServer({
            type: "ready"
        });
    }

    unready(): void {
        this.entireGame.sendMessageToServer({
            type: "unready"
        });
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "order-placed") {
            const region = this.world.regions.get(message.region);
            const order = message.order ? orders.get(message.order) : null;

            this.placedOrders.set(region, order);
        } else if (message.type == "remove-placed-order") {
            const region = this.world.regions.get(message.regionId);

            if (this.placedOrders.has(region)) {
                this.placedOrders.delete(region);
            }
        } else if (message.type == "player-ready") {
            const player = this.ingame.players.get(this.entireGame.users.get(message.userId));

            if (this.forVassals) {
                this.readyHouses.push(...this.ingame.getVassalsControlledByPlayer(player));
            } else {
                this.readyHouses.push(player.house);
            }
        } else if (message.type == "player-unready") {
            const player = this.ingame.players.get(this.entireGame.users.get(message.userId));

            this.readyHouses = this.forVassals
                ? _.without(this.readyHouses, ...this.ingame.getVassalsControlledByPlayer(player))
                : _.without(this.readyHouses, player.house);
        }
    }

    /**
     * Queries
     */

    /**
     * For a given player, returns all the houses for which `player` must place
     * orders for. Depending on `this.forVassals`, this may be simply the house of the
     * player, or the list of vassals commanded by the player.
     */
    getHousesToPutOrdersForPlayer(player: Player): House[] {
        if (!this.forVassals) {
            return [player.house];
        } else {
            return this.ingame.getVassalsControlledByPlayer(player);
        }
    }

    getNotReadyPlayers(): Player[] {
        return _.uniq(_.difference(this.participatingHouses, this.readyHouses).map(h => this.ingame.getControllerOfHouse(h)));
    }

    getWaitedUsers(): User[] {
        return this.getNotReadyPlayers().map(p => p.user);
    }

    getOrdersList(house: House): Order[] {
        return this.ingame.game.getOrdersListForHouse(house);
    }

    getAvailableOrders(house: House): Order[] {
        return this.ingame.game.getAvailableOrders(this.placedOrders, house, this.parentGameState.planningRestrictions);
    }

    isReady(house: House): boolean {
        return this.readyHouses.includes(house);
    }

    /*
     Action after vassal replacement
    */

    actionAfterVassalReplacement(newVassal: House): void {
        this.readyHouses = _.without(this.readyHouses, newVassal);
        this.checkAndProceedEndOfPlaceOrdersGameState();
    }

    static deserializeFromServer(planning: PlanningGameState, data: SerializedPlaceOrdersGameState): PlaceOrdersGameState {
        const placeOrder = new PlaceOrdersGameState(planning);

        placeOrder.placedOrders = new BetterMap(
            data.placedOrders.map(
                ([regionId, orderId]) => [
                    planning.world.regions.get(regionId),
                    orderId ? orders.get(orderId) : null
                ]
            )
        );
        placeOrder.readyHouses = data.readyHouses.map(hid => planning.ingameGameState.game.houses.get(hid));
        placeOrder.forVassals = data.forVassals;

        return placeOrder;
    }
}

export interface SerializedPlaceOrdersGameState {
    type: "place-orders";
    placedOrders: [string, number | null][];
    readyHouses: string[];
    forVassals: boolean;
}
