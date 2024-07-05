import GameState from "../../../../GameState";
import IngameGameState from "../../../IngameGameState";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import Player from "../../../Player";
import Order from "../../../game-data-structure/Order";
import Region from "../../../game-data-structure/Region";
import World from "../../../game-data-structure/World";
import orders from "../../../game-data-structure/orders";
import User from "../../../../../server/User";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import {observable} from "mobx";
import BetterMap from "../../../../../utils/BetterMap";
import Game from "../../../game-data-structure/Game";
import House from "../../../game-data-structure/House";
import PlanningGameState from "../../PlanningGameState";
import _ from "lodash";
import PlaceOrdersGameState from "../../place-orders-game-state/PlaceOrdersGameState";
import PlaceOrdersForVassalsGameState from "../PlaceOrdersForVassalsGameState";

export default class ResolveSinglePlaceOrdersForVassalsGameState extends GameState<PlaceOrdersForVassalsGameState> {
    @observable house: House;

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState;
    }

    get planningGameState(): PlanningGameState {
        return this.parentGameState.parentGameState;
    }

    get placeOrdersGameState(): PlaceOrdersForVassalsGameState {
        return this.parentGameState;
    }

    get placedOrders(): BetterMap<Region, Order | null> {
        return this.planningGameState.placedOrders;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get world(): World {
        return this.game.world;
    }

    firstStart(house: House): void {
        this.house = house;
        const player = this.ingame.getControllerOfHouse(house);
        const availableRegionsForOrders = this.ingame.getVassalsControlledByPlayer(player).reduce((count, h) => count + this.placeOrdersGameState.getPossibleRegionsForOrders(h).length, 0);
        if (availableRegionsForOrders == 0) {
            this.placeOrdersGameState.submitOrders(player, true);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "place-order") {
            if (this.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const order = message.orderId ? orders.get(message.orderId) : null;
            const region = this.world.regions.get(message.regionId);

            // Retrieve the house for which this order has been placed for.
            const house = _.find(this.placeOrdersGameState.getHousesToPutOrdersForPlayer(player), h => this.placeOrdersGameState.getPossibleRegionsForOrders(h).includes(region));

            if (house == null) {
                return;
            }

            if (order && !this.placeOrdersGameState.isOrderAvailable(house, order)) {
                return;
            }

            if (order && this.game.isOrderRestricted(region, order, this.planningGameState.planningRestrictions, true)) {
                const availableOrders = this.placeOrdersGameState.getAvailableOrders(house).filter(o => o != order);
                if (availableOrders.some(o => !this.game.isOrderRestricted(region, o, this.planningGameState.planningRestrictions, true))) {
                    // Player has to use their legal orders first
                    return;
                }
            }

            if (order) {
                this.placedOrders.set(region, order);
                player.user.send({
                    type: "order-placed",
                    order: order.id,
                    region: region.id
                });

                this.ingame.sendMessageToUsersWhoCanSeeRegion({
                    type: "order-placed",
                    region: region.id,
                    order: null
                }, region, player.user);
            } else if (this.placedOrders.has(region)) {
                this.placedOrders.delete(region);
                this.ingame.sendMessageToUsersWhoCanSeeRegion({
                    type: "remove-placed-order",
                    regionId: region.id
                }, region);
            }
        } else if (message.type == "ready") {
            if (this.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            this.placeOrdersGameState.submitOrders(player);
        }
    }

    getWaitedUsers(): User[] {
        return [this.ingame.getControllerOfHouse(this.house).user];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSinglePlaceOrdersForVassalsGameState {
        return {
            type: "single-place-orders-for-vassals",
            house: this.house.id
        };
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

    submit(): void {
        this.entireGame.sendMessageToServer({
            type: "ready"
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
        } else if (message.type == "next-house") {
            this.house = this.game.houses.get(message.house);
        }
    }

    /*
     Action after vassal replacement
    */

    actionAfterVassalReplacement(newVassal: House): void {
        // Remove already placed orders of house:
        const placedOrders = this.placeOrdersGameState.getPlacedOrdersOfHouse(newVassal);
        placedOrders.forEach(([r, _o]) => {
            this.placedOrders.delete(r);
        });

        // A new vassal may want players to change their orders.
        // So we restart planning phase to force players to commit their orders again

        // Reset waitedFor data, to properly call ingame.setWaitedForPlayers() by the game-state-change
        this.ingame.resetAllWaitedForData();

        // game-state-change will notify all waited users, no need to do it explicitly
        this.planningGameState.setChildGameState(new PlaceOrdersGameState(this.planningGameState)).firstStart();
    }

    static deserializeFromServer(placeOrdersForVassals: PlaceOrdersForVassalsGameState, data: SerializedSinglePlaceOrdersForVassalsGameState): ResolveSinglePlaceOrdersForVassalsGameState {
        const singlePlaceOrder = new ResolveSinglePlaceOrdersForVassalsGameState(placeOrdersForVassals);

        singlePlaceOrder.house = placeOrdersForVassals.ingame.game.houses.get(data.house);

        return singlePlaceOrder;
    }
}

export interface SerializedSinglePlaceOrdersForVassalsGameState {
    type: "single-place-orders-for-vassals";
    house: string;
}
