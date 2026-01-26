import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import { ClientMessage } from "../../../../messages/ClientMessage";
import Player from "../../Player";
import { ServerMessage } from "../../../../messages/ServerMessage";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import EntireGame from "../../../EntireGame";
import { land, port, sea } from "../../game-data-structure/regionTypes";
import PlayerMusteringGameState, {
  SerializedPlayerMusteringGameState,
} from "../../westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import Region from "../../game-data-structure/Region";
import IngameGameState from "../../IngameGameState";
import IronBankOrderType from "../../game-data-structure/order-types/IronBankOrderType";
import ResolveSingleConsolidatePowerGameState, {
  SerializedResolveSingleConsolidatePowerGameState,
} from "./resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../../game-data-structure/order-types/ConsolidatePowerOrderType";
import BetterMap from "../../../../utils/BetterMap";
import DefenseMusterOrderType from "../../game-data-structure/order-types/DefenseMusterOrderType";
import ExecuteLoanGameState, {
  SerializedExecuteLoanGameState,
} from "./execute-loan-game-state/ExecuteLoanGameState";

export default class ResolveConsolidatePowerGameState extends GameState<
  ActionGameState,
  | ResolveSingleConsolidatePowerGameState
  | PlayerMusteringGameState
  | ExecuteLoanGameState
> {
  get game(): Game {
    return this.actionGameState.game;
  }

  get entireGame(): EntireGame {
    return this.actionGameState.entireGame;
  }

  get actionGameState(): ActionGameState {
    return this.parentGameState;
  }

  get ingame(): IngameGameState {
    return this.actionGameState.ingame;
  }

  firstStart(): void {
    this.ingame.log({
      type: "action-phase-resolve-consolidate-power-began",
    });
    this.proceedNextResolve(null);
  }

  getAvailableOrdersOfHouse(
    house: House,
  ): BetterMap<
    Region,
    ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType
  > {
    const result: BetterMap<
      Region,
      ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType
    > = new BetterMap();
    this.actionGameState
      .getRegionsWithConsolidatePowerOrderOfHouse(house)
      .forEach(([r, ot]) => result.set(r, ot));
    this.actionGameState
      .getRegionsWithIronBankOrderOfHouse(house)
      .forEach(([r, ot]) => result.set(r, ot));
    this.actionGameState
      .getRegionsWithDefenseMusterOrderOfHouse(house)
      .forEach(([r, ot]) => result.set(r, ot));
    return result;
  }

  getPotentialGainedPowerTokens(region: Region, house: House): number {
    const order = this.actionGameState.ordersOnBoard.tryGet(region, null);
    if (order && order.type instanceof IronBankOrderType) {
      // Iron Bank orders can't be used for Consolidating Power
      return 0;
    }

    if (region.type == sea) {
      // A consolidate power on sea grants nothing.
      // Do nothing.
    } else if (region.type == port) {
      // A single power token is granted if the adjacent sea is unoccupied
      // or if it belongs to the same house than the port
      const adjacentSea = this.game.world.getAdjacentSeaOfPort(region);
      const adjacentSeaController = adjacentSea.getController();
      if (adjacentSeaController == null || adjacentSeaController == house) {
        return 1;
      }
    } else if (region.type == land) {
      return 1 + region.crownIcons;
    }

    return 0;
  }

  resolveConsolidatePowerOrderForPt(
    region: Region,
    house: House,
    resolvedAutomatically = false,
  ): void {
    let gains: number = this.getPotentialGainedPowerTokens(region, house);

    if (gains > 0) {
      gains = this.ingame.changePowerTokens(house, gains);
    }

    this.ingame.log(
      {
        type: "consolidate-power-order-resolved",
        house: house.id,
        region: region.id,
        starred: this.actionGameState.ordersOnBoard.get(region).type.starred,
        powerTokenCount: gains,
      },
      resolvedAutomatically,
    );
  }

  proceedNextResolve(lastHouseToResolve: House | null): void {
    const nextToResolve = this.getNextHouseToResolveOrder(lastHouseToResolve);

    if (!nextToResolve) {
      this.actionGameState.onResolveConsolidatePowerEnd();
      return;
    }

    this.setChildGameState(
      new ResolveSingleConsolidatePowerGameState(this),
    ).firstStart(nextToResolve);
  }

  onPlayerMusteringEnd(house: House, regions: Region[]): void {
    // Remove CP* order token
    regions.forEach((r) =>
      this.actionGameState.removeOrderFromRegion(
        r,
        false,
        undefined,
        undefined,
        "yellow",
      ),
    );
    this.proceedNextResolve(house);
  }

  getNextHouseToResolveOrder(lastHouseToResolve: House | null): House | null {
    let currentHouseToCheck = lastHouseToResolve
      ? this.ingame.getNextInTurnOrder(lastHouseToResolve)
      : this.game.getTurnOrder()[0];

    // Check each house in order to find one that has a consolidate power / defense muster order or iron bank order
    for (let i = 0; i < this.game.houses.size; i++) {
      if (this.getAvailableOrdersOfHouse(currentHouseToCheck).size > 0) {
        return currentHouseToCheck;
      }

      currentHouseToCheck = this.ingame.getNextInTurnOrder(currentHouseToCheck);
    }

    // If no house has any CP, Iron Bank or Defense/Muster order available, return null
    return null;
  }

  onPlayerMessage(player: Player, message: ClientMessage): void {
    this.childGameState.onPlayerMessage(player, message);
  }

  onServerMessage(message: ServerMessage): void {
    this.childGameState.onServerMessage(message);
  }

  serializeToClient(
    admin: boolean,
    player: Player | null,
  ): SerializedResolveConsolidatePowerGameState {
    return {
      type: "resolve-consolidate-power",
      childGameState: this.childGameState.serializeToClient(admin, player),
    };
  }

  static deserializeFromServer(
    action: ActionGameState,
    data: SerializedResolveConsolidatePowerGameState,
  ): ResolveConsolidatePowerGameState {
    const resolveConsolidatePower = new ResolveConsolidatePowerGameState(
      action,
    );

    resolveConsolidatePower.childGameState =
      resolveConsolidatePower.deserializeChildGameState(data.childGameState);

    return resolveConsolidatePower;
  }

  deserializeChildGameState(
    data: SerializedResolveConsolidatePowerGameState["childGameState"],
  ): ResolveConsolidatePowerGameState["childGameState"] {
    if (data.type == "player-mustering") {
      return PlayerMusteringGameState.deserializeFromServer(this, data);
    } else if (data.type == "resolve-single-consolidate-power") {
      return ResolveSingleConsolidatePowerGameState.deserializeFromServer(
        this,
        data,
      );
    } else if (data.type == "execute-loan") {
      return ExecuteLoanGameState.deserializeFromServer(this, data);
    } else {
      throw new Error("");
    }
  }
}

export interface SerializedResolveConsolidatePowerGameState {
  type: "resolve-consolidate-power";
  childGameState:
    | SerializedPlayerMusteringGameState
    | SerializedResolveSingleConsolidatePowerGameState
    | SerializedExecuteLoanGameState;
}
