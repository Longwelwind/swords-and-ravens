import GameState from "../../../GameState";
import IngameGameState from "../../IngameGameState";
import { ClientMessage } from "../../../../messages/ClientMessage";
import Player from "../../Player";
import Order from "../../game-data-structure/Order";
import Region from "../../game-data-structure/Region";
import World from "../../game-data-structure/World";
import orders from "../../game-data-structure/orders";
import { ServerMessage } from "../../../../messages/ServerMessage";
import EntireGame from "../../../EntireGame";
import { observable } from "mobx";
import BetterMap from "../../../../utils/BetterMap";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import User from "../../../../server/User";
import PlanningGameState from "../PlanningGameState";
import { PlayerActionType } from "../../game-data-structure/GameLog";
import _ from "lodash";

export default class PlaceOrdersGameState extends GameState<PlanningGameState> {
  @observable readyHouses: House[] = [];

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
    return this.game.nonVassalHouses;
  }

  get placedOrders(): BetterMap<Region, Order | null> {
    return this.planningGameState.placedOrders;
  }

  firstStart(): void {
    this.ingame.log({
      type: "planning-phase-began",
      forVassals: false,
    });

    // Automatically set ready for houses which can't place orders
    this.ingame.players.forEach((p) => {
      const availableRegionsForOrders = this.getPossibleRegionsForOrders(
        p.house
      ).length;

      if (availableRegionsForOrders == 0) {
        this.setReady(p, true);
      }
    });
  }

  private setReady(player: Player, resolvedAutomatically = false): void {
    if (!this.canReady(player).status) {
      return;
    }

    this.readyHouses.push(player.house);

    // This is for debug to allow bypassing canReady and a player sending "ready" more than once
    // It doesn't hurt on the live system either...
    this.readyHouses = _.uniq(this.readyHouses);

    this.ingame.log(
      {
        type: "player-action",
        house: player.house.id,
        action: PlayerActionType.ORDERS_PLACED,
      },
      resolvedAutomatically
    );

    this.entireGame.broadcastToClients({
      type: "player-ready",
      userId: player.user.id,
    });

    // Check if all players are ready
    this.checkAndProceedEndOfPlaceOrdersGameState();
  }

  private checkAndProceedEndOfPlaceOrdersGameState(): boolean {
    if (this.readyHouses.length == this.participatingHouses.length) {
      this.planningGameState.onPlaceOrderFinish();
      return true;
    }

    return false;
  }

  canUnready(player: Player): { status: boolean; reason: string } {
    if (!this.isReady(player.house)) {
      return { status: false, reason: "not-ready" };
    }

    return { status: true, reason: "player-can-unready" };
  }

  setUnready(player: Player): void {
    if (!this.canUnready(player).status) {
      return;
    }

    this.readyHouses = _.without(this.readyHouses, player.house);

    this.entireGame.broadcastToClients({
      type: "player-unready",
      userId: player.user.id,
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
      const house = _.find(this.getHousesToPutOrdersForPlayer(player), (h) =>
        this.getPossibleRegionsForOrders(h).includes(region)
      );

      if (house == null) {
        return;
      }

      if (order && !this.isOrderAvailable(house, order)) {
        return;
      }

      if (
        order &&
        this.game.isOrderRestricted(
          region,
          order,
          this.planningGameState.planningRestrictions,
          true
        )
      ) {
        const availableOrders = this.getAvailableOrders(house).filter(
          (o) => o != order
        );
        if (
          availableOrders.some(
            (o) =>
              !this.game.isOrderRestricted(
                region,
                o,
                this.planningGameState.planningRestrictions,
                true
              )
          )
        ) {
          // Player has to use their legal orders first
          return;
        }
      }

      // When a player placed or removed an order he is unready
      this.setUnready(player);

      if (order) {
        this.placedOrders.set(region, order);
        player.user.send({
          type: "order-placed",
          order: order.id,
          region: region.id,
        });

        this.ingame.sendMessageToUsersWhoCanSeeRegion(
          {
            type: "order-placed",
            region: region.id,
            order: null,
          },
          region,
          player.user
        );
      } else if (this.placedOrders.has(region)) {
        this.placedOrders.delete(region);
        this.ingame.sendMessageToUsersWhoCanSeeRegion(
          {
            type: "remove-placed-order",
            regionId: region.id,
          },
          region
        );
      }
    } else if (message.type == "ready") {
      this.setReady(player);
    } else if (message.type == "unready") {
      this.setUnready(player);
    }
  }

  getPlacedOrdersOfHouse(house: House): [Region, Order][] {
    const possibleRegions = this.game.world.regions.values.filter(
      (r) => r.units.size > 0 && r.getController() == house
    );

    return possibleRegions
      .filter((r) => this.placedOrders.tryGet(r, null) != null)
      .map((r) => [r, this.placedOrders.get(r) as Order]);
  }

  getPossibleRegionsForOrders(house: House): Region[] {
    const possibleRegions = this.game.world.regions.values.filter(
      (r) => r.units.size > 0 && r.getController() == house
    );

    if (!this.ingame.isVassalHouse(house)) {
      return possibleRegions;
    } else {
      return [];
    }
  }

  serializeToClient(
    _admin: boolean,
    _player: Player | null
  ): SerializedPlaceOrdersGameState {
    return {
      type: "place-orders",
      readyHouses: this.readyHouses.map((h) => h.id),
    };
  }

  /*
   * Common
   */

  canReady(player: Player): { status: boolean; reason: string } {
    // Here we can bypass canReady for debugging
    // return {status: true, reason: "bypassed"};

    // Return false if player is already ready
    if (this.isReady(player.house)) {
      return { status: false, reason: "already-ready" };
    }

    // Iterate over all the houses the player should put orders for to find
    // an error in one of the houses.
    const possibleError = this.getHousesToPutOrdersForPlayer(player).reduce(
      (state, house) => {
        const orderList = this.getOrdersList(house);
        if (
          this.getPlacedOrdersOfHouse(house).some(
            ([_r, o]) => !orderList.includes(o)
          )
        ) {
          return { status: false, reason: "invalid-orders-placed" };
        }

        const possibleRegions = this.getPossibleRegionsForOrders(house);

        if (
          possibleRegions.every((r) => this.placedOrders.has(r)) ||
          this.getAvailableOrders(house).length == 0
        ) {
          // All possible regions have orders
          return state;
        }

        return { status: false, reason: "not-all-regions-filled" };
      },
      null
    );

    return possibleError
      ? (possibleError as { status: boolean; reason: string })
      : { status: true, reason: "" };
  }

  /**
   * Client
   */
  assignOrder(region: Region, order: Order | null): void {
    this.entireGame.sendMessageToServer({
      type: "place-order",
      regionId: region.id,
      orderId: order ? order.id : null,
    });
  }

  ready(): void {
    this.entireGame.sendMessageToServer({
      type: "ready",
    });
  }

  unready(): void {
    this.entireGame.sendMessageToServer({
      type: "unready",
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
      const player = this.ingame.players.get(
        this.entireGame.users.get(message.userId)
      );
      this.readyHouses.push(player.house);
    } else if (message.type == "player-unready") {
      const player = this.ingame.players.get(
        this.entireGame.users.get(message.userId)
      );
      this.readyHouses = _.without(this.readyHouses, player.house);
    }
  }

  /**
   * Queries
   */

  getHousesToPutOrdersForPlayer(player: Player): House[] {
    return [player.house];
  }

  getNotReadyPlayers(): Player[] {
    return _.uniq(
      _.difference(this.participatingHouses, this.readyHouses).map((h) =>
        this.ingame.getControllerOfHouse(h)
      )
    );
  }

  getWaitedUsers(): User[] {
    return this.getNotReadyPlayers().map((p) => p.user);
  }

  getOrdersList(house: House): Order[] {
    return this.ingame.game.getOrdersListForHouse(house);
  }

  getAvailableOrders(house: House): Order[] {
    return this.ingame.game.getAvailableOrders(this.placedOrders, house);
  }

  isReady(house: House): boolean {
    return this.readyHouses.includes(house);
  }

  /*
     Action after vassal replacement
    */

  actionAfterVassalReplacement(newVassal: House): void {
    // Remove already placed orders of house:
    const placedOrders = this.getPlacedOrdersOfHouse(newVassal);
    placedOrders.forEach(([r, _o]) => {
      this.placedOrders.delete(r);
    });

    // A new vassal may want players to change their orders.
    // So we restart planning phase to force players to commit their orders again

    // Reset waitedFor data, to properly call ingame.setWaitedForPlayers() by the game-state-change
    this.ingame.resetAllWaitedForData();

    // game-state-change will notify all waited users, no need to do it explicitly
    this.parentGameState
      .setChildGameState(new PlaceOrdersGameState(this.parentGameState))
      .firstStart();
  }

  static deserializeFromServer(
    planning: PlanningGameState,
    data: SerializedPlaceOrdersGameState
  ): PlaceOrdersGameState {
    const placeOrder = new PlaceOrdersGameState(planning);

    placeOrder.readyHouses = data.readyHouses.map((hid) =>
      planning.ingame.game.houses.get(hid)
    );

    return placeOrder;
  }
}

export interface SerializedPlaceOrdersGameState {
  type: "place-orders";
  readyHouses: string[];
}
