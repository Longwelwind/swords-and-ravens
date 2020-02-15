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

export default class ResolveMarchOrderGameState extends GameState<ActionGameState, ResolveSingleMarchOrderGameState | CombatGameState | TakeControlOfEnemyPortGameState> {
    constructor(actionGameState: ActionGameState) {
        super(actionGameState);
    }

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
        this.proceedNextResolveSingleMarchOrder();
    }

    onResolveSingleMarchOrderGameStateFinish(house: House): void {
        // Last march is completely handled
        // Now is the time to ...
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
        this.proceedNextResolveSingleMarchOrder(house);
    }

    onTakeControlOfEnemyPortFinish(lastHouseThatResolvedMarchOrder: House) {
        // Check if an other march order can be resolved
        this.onResolveSingleMarchOrderGameStateFinish(lastHouseThatResolvedMarchOrder);
    }

    proceedNextResolveSingleMarchOrder(lastHouseToResolve: House | null = null): void {
        const houseToResolve = this.getNextHouseToResolveMarchOrder(lastHouseToResolve);

        if (houseToResolve == null) {
            // All march orders have been executed
            // go the to the next phase
            this.actionGameState.onResolveMarchOrderGameStateFinish();
            return;
        }

        this.setChildGameState(new ResolveSingleMarchOrderGameState(this)).firstStart(houseToResolve);
    }

    destroyAllShipsInPort(portRegion: Region): number {
        if(portRegion.type != port) {
            throw new Error("This method is intended to only be used for destroying ships in ports")
        }

        this.removePossibleOrdersInPort(portRegion);

        const shipsToDestroy = portRegion.units.map((id, _unit) => id);
        shipsToDestroy.forEach(id => portRegion.units.delete(id));

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: portRegion.id,
            unitIds: shipsToDestroy
        });

        return shipsToDestroy.length;
    }

    proceedToCombat(attackerComingFrom: Region, combatRegion: Region, attacker: House, defender: House, army: Unit[], order: Order): void {
        this.setChildGameState(new CombatGameState(this)).firstStart(attackerComingFrom, combatRegion, attacker, defender, army, order);
    }

    getNextHouseToResolveMarchOrder(lastHouseToResolve: House | null): House | null {
        let currentHouseToCheck = lastHouseToResolve ? this.game.getNextInTurnOrder(lastHouseToResolve) : this.game.getTurnOrder()[0];

        // Check each house in order to find one that has an available March order.
        // Check at most once for each house
        for (let i = 0;i < this.game.houses.size;i++) {
            const regions = this.actionGameState.getRegionsWithMarchOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }

            currentHouseToCheck = this.game.getNextInTurnOrder(currentHouseToCheck);
        }

        // If no house has any march order available, return null
        return null;
    }

    moveUnits(from: Region, units: Unit[], to: Region) {
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

    private removePossibleOrdersInPort(portRegion: Region) {
        if(portRegion.type != port) {
            throw new Error("This method is intended to only be used for removing orders of destroyed or taken ships")
        }

        if (this.actionGameState.ordersOnBoard.has(portRegion)) {
            this.actionGameState.ordersOnBoard.delete(portRegion);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: portRegion.id,
                order: null
            });
        }
    }

    private isTakeControlOfEnemyPortGameStateRequired(): {port: Region, newController: House} | null {
        // Find ports with enemy ships
        const portsWithEnemyShips = this.world.regions.values.filter(r => r.type == port
            && r.units.size > 0
            && r.getController() != this.world.getAdjacentLandOfPort(r).getController());

            if(portsWithEnemyShips.length == 0) {
            return null;
        }

        const adjacentCastleController = this.world.getAdjacentLandOfPort(portsWithEnemyShips[0]).getController();
        if(adjacentCastleController) {
            // A castle with ships in port has been conquered
            this.removePossibleOrdersInPort(portsWithEnemyShips[0]);

            // return TakeControlOfEnemyPortGameState required
            return {
                port: portsWithEnemyShips[0],
                newController: adjacentCastleController
            }
        }
        // An else path can be omitted here as immediately destroyed ships by empty castle
        // has been handled by resolve single march order game state already

        throw new Error("adjacentCastleController should never be null");
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage) {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveMarchOrderGameState {
        return {
            type: "resolve-march-order",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(actionGameState: ActionGameState, data: SerializedResolveMarchOrderGameState): ResolveMarchOrderGameState {
        const resolveMarchOrderGameState = new ResolveMarchOrderGameState(actionGameState);

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
}
