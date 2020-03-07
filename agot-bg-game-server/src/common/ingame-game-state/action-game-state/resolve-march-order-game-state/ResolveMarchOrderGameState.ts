import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import IngameGameState from "../../IngameGameState";
import ResolveSingleMarchOrderGameState, {SerializedResolveSingleMarchOrderGameState} from "./resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import House from "../../game-data-structure/House";
import EntireGame from "../../../EntireGame";
import World from "../../game-data-structure/World";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import CombatGameState, {SerializedCombatGameState} from "./combat-game-state/CombatGameState";
import Region from "../../game-data-structure/Region";
import Unit from "../../game-data-structure/Unit";
import Game from "../../game-data-structure/Game";
import Order from "../../game-data-structure/Order";
import { port } from "../../game-data-structure/regionTypes";
import TakeControlOfEnemyPortGameState, { SerializedTakeControlOfEnemyPortGameState } from "./take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";
import { findOrphanedShipsAndDestroyThem } from "../../port-helper/PortHelper";

export default class ResolveMarchOrderGameState extends GameState<ActionGameState, ResolveSingleMarchOrderGameState | CombatGameState | TakeControlOfEnemyPortGameState> {
    public currentTurnOrderIndex: number;

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
        this.currentTurnOrderIndex = -1;

	    this.ingameGameState.log({
            type: "action-phase-resolve-march-began"
        });

        this.proceedNextResolveSingleMarchOrder();
    }

    onResolveSingleMarchOrderGameStateFinish(house: House): void {
        // Last march is completely handled
        // Now is the time to ...
        //   ... remove orphaned orders (e.g. caused by Mace Tyrell or Ilyn Payne)
        this.findOrphanedOrdersAndRemoveThem();

        //   ... destroy orphaned ships (e.g. caused by Arianne)
        findOrphanedShipsAndDestroyThem(this.world, this.ingameGameState, this.actionGameState);
        //   ... check if ships can be converted
        const analyzePortResult = this.isTakeControlOfEnemyPortGameStateRequired();
        if(analyzePortResult) {
            this.setChildGameState(new TakeControlOfEnemyPortGameState(this)).firstStart(analyzePortResult.port, analyzePortResult.newController, house);
            return;
        }

        //   ... check victory conditions
        if(this.ingameGameState.checkVictoryConditions()) {
            return;
        }

        //   ... check if an other march order can be resolved
        this.proceedNextResolveSingleMarchOrder();
    }

    findOrphanedOrdersAndRemoveThem(): void {
        const orphanedOrders = this.actionGameState.ordersOnBoard.entries.filter(([region, _]) => region.units.size == 0);

        orphanedOrders.forEach(([region, _]) => {
            // todo: Add a game log for this event
            this.actionGameState.ordersOnBoard.delete(region);
            this.actionGameState.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: region.id,
                order: null
            });
        });
    }

    onTakeControlOfEnemyPortFinish(lastHouseThatResolvedMarchOrder: House): void {
        // Check if an other march order can be resolved
        this.onResolveSingleMarchOrderGameStateFinish(lastHouseThatResolvedMarchOrder);
    }

    proceedNextResolveSingleMarchOrder(): void {
        const houseToResolve = this.getNextHouseToResolveMarchOrder();

        if (houseToResolve == null) {
            // All march orders have been executed
            // go the to the next phase
            this.actionGameState.onResolveMarchOrderGameStateFinish();
            return;
        }

        this.setChildGameState(new ResolveSingleMarchOrderGameState(this)).firstStart(houseToResolve);
    }

    proceedToCombat(attackerComingFrom: Region, combatRegion: Region, attacker: House, defender: House, army: Unit[], order: Order): void {
        this.setChildGameState(new CombatGameState(this)).firstStart(attackerComingFrom, combatRegion, attacker, defender, army, order);
    }

    getNextHouseToResolveMarchOrder(): House | null {
        const turnOrder = this.game.getTurnOrder();
        const numberOfPlayers = turnOrder.length;

        // Check each house in order to find one that has an available March order.
        // Check at most once for each house
        for (let i = 0;i < numberOfPlayers;i++) {
            this.currentTurnOrderIndex = (this.currentTurnOrderIndex + 1) % numberOfPlayers;
            const currentHouseToCheck = turnOrder[this.currentTurnOrderIndex];

            const regions = this.actionGameState.getRegionsWithMarchOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }
        }

        // If no house has any march order available, return null
        return null;
    }

    moveUnits(from: Region, units: Unit[], to: Region): void {
        const controllerToRegion = to.getController();

        if (controllerToRegion != units[0].allegiance) {
            // If there was an order from an other house, remove it
            if (this.actionGameState.ordersOnBoard.has(to)) {
                this.actionGameState.ordersOnBoard.delete(to);

                this.entireGame.broadcastToClients({
                    type: "action-phase-change-order",
                    region: to.id,
                    order: null
                });
            }

            // If there was a power token from an other house, remove it
            if (to.controlPowerToken) {
                to.controlPowerToken = null;

                this.entireGame.broadcastToClients({
                    type: "change-control-power-token",
                    regionId: to.id,
                    houseId: null
                });
            }
        }

        units.forEach(u => from.units.delete(u.id));
        units.forEach(u => to.units.set(u.id, u));
        units.forEach(u => u.region = to);

        this.entireGame.broadcastToClients({
            type: "move-units",
            from: from.id,
            to: to.id,
            units: units.map(u => u.id)
        });
    }

    private isTakeControlOfEnemyPortGameStateRequired(): { port: Region; newController: House } | null {
        // Find ports with enemy ships
        const portsWithEnemyShips = this.world.regions.values.filter(r => r.type == port
            && r.units.size > 0
            && r.getController() != this.world.getAdjacentLandOfPort(r).getController());

        if (portsWithEnemyShips.length == 0) {
            return null;
        }

        const portRegion = portsWithEnemyShips[0];
        const adjacentCastle = this.world.getAdjacentLandOfPort(portRegion);
        const adjacentCastleController = adjacentCastle.getController();

        if (adjacentCastleController) {
            // return TakeControlOfEnemyPortGameState required
            return {
                port: portRegion,
                newController: adjacentCastleController
            }
        }

        // We should never reach this line because we removed orphaned ships earlier.
        // is Martell playing Arianne in a non-capital city. So the ships have to be destroyed
        throw new Error(`$Port with id '{portRegion.id}' contains orphaned ships which should have been removed before!`);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveMarchOrderGameState {
        return {
            type: "resolve-march-order",
            childGameState: this.childGameState.serializeToClient(admin, player),
            currentTurnOrderIndex: this.currentTurnOrderIndex
        };
    }

    static deserializeFromServer(actionGameState: ActionGameState, data: SerializedResolveMarchOrderGameState): ResolveMarchOrderGameState {
        const resolveMarchOrderGameState = new ResolveMarchOrderGameState(actionGameState);
        resolveMarchOrderGameState.currentTurnOrderIndex = data.currentTurnOrderIndex;

        resolveMarchOrderGameState.childGameState = resolveMarchOrderGameState.deserializeChildGameState(data.childGameState);

        return resolveMarchOrderGameState;
    }

    deserializeChildGameState(data: SerializedResolveMarchOrderGameState["childGameState"]): ResolveSingleMarchOrderGameState | CombatGameState | TakeControlOfEnemyPortGameState {
        if (data.type == "resolve-single-march") {
            return ResolveSingleMarchOrderGameState.deserializeFromServer(this, data);
        } else if (data.type == "combat") {
            return CombatGameState.deserializeFromServer(this, data);
        } else if (data.type == "take-control-of-enemy-port") {
            return TakeControlOfEnemyPortGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedResolveMarchOrderGameState {
    type: "resolve-march-order";
    childGameState: SerializedResolveSingleMarchOrderGameState | SerializedCombatGameState | SerializedTakeControlOfEnemyPortGameState;
    currentTurnOrderIndex: number;
}
