import GameState from "../../../../GameState";
import UseRavenGameState from "../UseRavenGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import IngameGameState from "../../../IngameGameState";
import EntireGame from "../../../../EntireGame";
import House from "../../../game-data-structure/House";
import orders from "../../../game-data-structure/orders";
import ActionGameState from "../../ActionGameState";
import Region from "../../../game-data-structure/Region";
import Order from "../../../game-data-structure/Order";
import BetterMap from "../../../../../utils/BetterMap";
import User from "../../../../../server/User";

export default class ReplaceOrderGameState extends GameState<UseRavenGameState> {
    get useRavenGameState(): UseRavenGameState {
        return this.parentGameState;
    }

    get actionGameState(): ActionGameState {
        return this.useRavenGameState.actionGameState;
    }

    get ingameGameState(): IngameGameState {
        return this.useRavenGameState.ingameGameState;
    }

    get entireGame(): EntireGame {
        return this.useRavenGameState.entireGame;
    }

    get ravenHolder(): House {
        return this.useRavenGameState.ravenHolder;
    }

    firstStart(): void {
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "replace-order") {
            if (player.house != this.ravenHolder) {
                return;
            }

            const order = orders.get(message.orderId);
            const region = this.ingameGameState.game.world.regions.get(message.regionId);

            if (region.getController() != player.house) {
                return;
            }


            if (!this.actionGameState.ordersOnBoard.has(region)) {
                return
            }

            const replacedOrder = this.actionGameState.ordersOnBoard.get(region);

            if (!this.getAvailableOrders(replacedOrder).includes(order)) {
                return;
            }

            this.actionGameState.ordersOnBoard.set(region, order);

            this.entireGame.broadcastToClients({
                type: "raven-order-replaced",
                regionId: region.id,
                orderId: order.id
            });

            this.ingameGameState.log({
                type: "raven-holder-replace-order",
                ravenHolder: this.ravenHolder.id,
                region: region.id,
                originalOrder: replacedOrder.id,
                newOrder: order.id
            });

            this.useRavenGameState.onReplaceOrderGameStateEnd();
        } else if (message.type == "skip-replace-order") {
            if (player.house != this.ravenHolder) {
                return;
            }

            this.ingameGameState.log({
                type: "raven-not-used",
                ravenHolder: this.ravenHolder.id
            })

            this.useRavenGameState.onReplaceOrderGameStateEnd();
        }
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingameGameState.getControllerOfHouse(this.ravenHolder).user];
    }

    getAvailableOrders(replacedOrder: Order): Order[] {
        const placedOrders = new BetterMap(
            this.actionGameState.getOrdersOfHouse(this.ravenHolder).filter(([_r, o]) => replacedOrder != o)
        );

        return this.ingameGameState.game.getAvailableOrders(placedOrders, this.ravenHolder, this.actionGameState.planningRestrictions);
    }

    replaceOrder(region: Region, order: Order): void {
        this.entireGame.sendMessageToServer({
            type: "replace-order",
            regionId: region.id,
            orderId: order.id
        });
    }

    skip(): void {
        this.entireGame.sendMessageToServer({
            type: "skip-replace-order"
        });
    }

    seeTopWildlingCardInstead(): void {
        this.entireGame.sendMessageToServer({
            type: "choose-see-top-wildling-card"
        })
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "raven-order-replaced") {
            const region = this.ingameGameState.game.world.regions.get(message.regionId);
            const order = orders.get(message.orderId);

            this.actionGameState.ordersOnBoard.set(region, order);
        }
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedReplaceOrderGameState {
        return {
            type: "replace-order"
        };
    }

    static deserializeFromServer(useRavenGameState: UseRavenGameState, _data: SerializedReplaceOrderGameState): ReplaceOrderGameState {
        return new ReplaceOrderGameState(useRavenGameState);
    }
}

export interface SerializedReplaceOrderGameState {
    type: "replace-order";
}
