import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import EntireGame from "../../../EntireGame";
import {land, port, sea} from "../../game-data-structure/regionTypes";
import PlayerMusteringGameState, {
    PlayerMusteringType,
    SerializedPlayerMusteringGameState
} from "../../westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import Region from "../../game-data-structure/Region";
import IngameGameState from "../../IngameGameState";

export default class ResolveConsolidatePowerGameState extends GameState<ActionGameState, PlayerMusteringGameState> {
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
        return this.actionGameState.ingameGameState;
    }

    firstStart(): void {
        // Starred Consolidate Power Orders must be resolved
        this.proceedNextResolve(null);
    }

    ifPossibleResolveAllConsolidatePowerOrdersOfHouseAutomatically(house: House): void {
        const consolidatePowerOrders = this.actionGameState.getRegionsWithConsolidatePowerOrderOfHouse(house);

        // If house has no Consolidate Power Order there is nothing to do
        if(consolidatePowerOrders.length == 0) {
            return;
        }

        const starredOrders = consolidatePowerOrders.filter(([_, order]) => order.type.starred);

        // All orders can be processed automatically if ...
        //      - There are no starred CP orders
        //      - Or the starred order is not placed in a castle region and can't be used for mustering
        if(starredOrders.length == 0 || starredOrders.every(([region, _]) => !region.hasStructure)) {
            consolidatePowerOrders.forEach(([region, _]) => {
                this.resolveConsolidatePowerOrderForPt(region, house);
                this.deleteConsolidatePowerOrder(region);
            });
        }
    }

    private deleteConsolidatePowerOrder(region: Region): void {
        // Remove the Consolidate Power Order from board
        this.actionGameState.ordersOnBoard.delete(region);
        this.entireGame.broadcastToClients({
            type: "action-phase-change-order",
            region: region.id,
            order: null
        });
    }

    getPotentialGainedPowerTokens(region: Region, house: House): number {
        if (region.type == sea) {
            // A Consolidate Power Order on sea grants nothing.
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

    resolveConsolidatePowerOrderForPt(region: Region, house: House): void {
        if (region.getController() != house) {
            throw new Error("invalid state in resolveConsolidatePowerOrderForPt()");
        }

        const gains: number = this.getPotentialGainedPowerTokens(region, house);

        if(gains > 0) {
            // Broadcast new Power token count
            house.changePowerTokens(gains);

            this.entireGame.broadcastToClients({
                type: "change-power-token",
                houseId: house.id,
                powerTokenCount: house.powerTokens
            });
        }

        this.ingame.log({
            type: "consolidate-power-order-resolved",
            house: house.id,
            region: region.id,
            starred: this.actionGameState.ordersOnBoard.get(region).type.starred,
            powerTokenCount: gains
        });
    }

    proceedNextResolve(lastHouseToResolve: House | null): void {
        const nextToResolve = this.getNextHouseToResolveOrder(lastHouseToResolve);

        if (!nextToResolve) {
            this.actionGameState.onResolveConsolidatePowerEnd();
            return;
        }

        this.ifPossibleResolveAllConsolidatePowerOrdersOfHouseAutomatically(nextToResolve);

        // If there is still a Starred Consolidate Power Order now
        if (this.actionGameState.getRegionsWithStarredConsolidatePowerOrderOfHouse(nextToResolve).length > 0) {
            //... switch to PlayerMusteringGameState
            this.setChildGameState(new PlayerMusteringGameState(this)).firstStart(nextToResolve, PlayerMusteringType.STARRED_CONSOLIDATE_POWER);
        } else {
            // ... or proceed with next house that has Consolidate Power Orders
            this.proceedNextResolve(nextToResolve);
        }
    }

    onPlayerMusteringEnd(house: House, regions: Region[]): void {
        const region = regions[0];

        if (!region) {
            throw new Error();
        }

        this.deleteConsolidatePowerOrder(region);

        this.proceedNextResolve(house);
    }

    getNextHouseToResolveOrder(lastHouseToResolve: House | null): House | null {
        let currentHouseToCheck = lastHouseToResolve ? this.game.getNextInTurnOrder(lastHouseToResolve) : this.game.getTurnOrder()[0];

        // Check each house in order to find one that has a Consolidate Power Order
        for (let i = 0;i < this.game.houses.size;i++) {
            const regions = this.actionGameState.getRegionsWithConsolidatePowerOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }

            currentHouseToCheck = this.game.getNextInTurnOrder(currentHouseToCheck);
        }

        // If no house has any Consolidate Power Order available, return null
        return null;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveConsolidatePowerGameState {
        return {
            type: "resolve-consolidate-power",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(action: ActionGameState, data: SerializedResolveConsolidatePowerGameState): ResolveConsolidatePowerGameState {
        const resolveConsolidatePower = new ResolveConsolidatePowerGameState(action);

        resolveConsolidatePower.childGameState = resolveConsolidatePower.deserializeChildGameState(data.childGameState);

        return resolveConsolidatePower;
    }

    deserializeChildGameState(data: SerializedResolveConsolidatePowerGameState["childGameState"]): PlayerMusteringGameState {
        return PlayerMusteringGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedResolveConsolidatePowerGameState {
    type: "resolve-consolidate-power";
    childGameState: SerializedPlayerMusteringGameState;
}
