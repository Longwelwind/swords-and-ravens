import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import Game from "../../game-data-structure/Game";
import ConsolidatePowerOrderType from "../../game-data-structure/order-types/ConsolidatePowerOrderType";
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
        this.resolveNormalConsolidatePowerOrders();

        // Starred resolve consolidate power must still be resolved
        this.proceedNextResolve(null);
    }

    resolveNormalConsolidatePowerOrders(): void {
        // If a house has no starred consolidate power order the normal consolidate power orders can be processed automatically
        // Resolve the normal consolidate power and give the power tokens for each house
        const consolidatePowerOrders = this.actionGameState.ordersOnBoard.entries.filter(([_, order]) => order.type instanceof ConsolidatePowerOrderType);

        this.actionGameState.game.getTurnOrder().forEach(house => {
            const ordersOfHouse = consolidatePowerOrders.filter(([region, _]) => region.getController() == house);

            if(ordersOfHouse.length == 0) {
                return;
            }

            const starredOrders = ordersOfHouse.filter(([_, order]) => order.type.starred);

            // If all consolidate power orders are not starred
            // or the starred consolidate power order is placed on a non castle region
            // this phase can be processed automatically
            if(starredOrders.length == 0 || starredOrders.every(([region, _]) => !region.hasStructure)) {
                ordersOfHouse.forEach(([region, _]) => {
                    this.resolveConsolidatePowerOrderForPt(region, house);

                    // Remove the consolidate power order from board
                    this.actionGameState.ordersOnBoard.delete(region);
                    this.entireGame.broadcastToClients({
                        type: "action-phase-change-order",
                        region: region.id,
                        order: null
                    });
                });
            }
        });
    }

    getPotentialGainedPowerTokens(region: Region, house: House): number {
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

    resolveConsolidatePowerOrderForPt(region: Region, house: House): void {
        const gaines: number = this.getPotentialGainedPowerTokens(region, house);

        if(gaines > 0) {
            // Broadcast new Power token count
            house.changePowerTokens(gaines);

            this.entireGame.broadcastToClients({
                type: "change-power-token",
                houseId: house.id,
                powerTokenCount: house.powerTokens
            });

            this.ingame.log({
                type: "consolidate-power-order-resolved",
                house: house.id,
                region: region.id,
                starred: this.actionGameState.ordersOnBoard.get(region).type.starred,
                powerTokenCount: gaines
            });
        }
    }

    proceedNextResolve(lastHouseToResolve: House | null): void {
        const nextToResolve = this.getNextHouseToResolveOrder(lastHouseToResolve);

        if (!nextToResolve) {
            this.actionGameState.onResolveConsolidatePowerEnd();
            return;
        }

        this.setChildGameState(new PlayerMusteringGameState(this)).firstStart(nextToResolve, PlayerMusteringType.STARRED_CONSOLIDATE_POWER);
    }

    onPlayerMusteringEnd(house: House, regions: Region[]): void {
        const region = regions[0];

        if (!region) {
            throw new Error();
        }

        // Remove Consolidate Power token
        this.actionGameState.ordersOnBoard.delete(region);
        this.entireGame.broadcastToClients({
            type: "action-phase-change-order",
            region: region.id,
            order: null
        });

        this.resolveNormalConsolidatePowerOrders();

        this.proceedNextResolve(house);
    }

    getNextHouseToResolveOrder(lastHouseToResolve: House | null): House | null {
        let currentHouseToCheck = lastHouseToResolve ? this.game.getNextInTurnOrder(lastHouseToResolve) : this.game.getTurnOrder()[0];

        // Check each house in order to find one that has a starred consolidate power
        for (let i = 0;i < this.game.houses.size;i++) {
            const regions = this.actionGameState.getRegionsWithStarredConsolidatePowerOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }

            currentHouseToCheck = this.game.getNextInTurnOrder(currentHouseToCheck);
        }

        // If no house has any CP* order available, return null
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
