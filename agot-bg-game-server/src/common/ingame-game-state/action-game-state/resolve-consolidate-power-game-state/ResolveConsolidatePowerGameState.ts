import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import Game from "../../game-data-structure/Game";
import ConsolidatePowerOrderType from "../../game-data-structure/order-types/ConsolidatePowerOrderType";
import House from "../../game-data-structure/House";
import BetterMap from "../../../../utils/BetterMap";
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
        // Resolve all the normal consolidate power and give the power tokens for each house
        const gains = new BetterMap<House, number>(this.game.houses.values.map(h => ([h, 0])));
        this.actionGameState.ordersOnBoard.entries.forEach(([region, order]) => {
            const house = region.getController();

            // Should never happen. If there was an order here, then there were at least
            // one unit, and therefore the region should have a controller.
            if (!house) {
                return;
            }

            if (!(order.type instanceof ConsolidatePowerOrderType)) {
                return;
            }

            if (order.type.starred) {
                return;
            }

            // This order can be processed automatically
            // Remove it
            this.actionGameState.ordersOnBoard.delete(region);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: region.id,
                order: null
            });

            if (region.type == sea) {
                // A consolidate power on sea grants nothing.
                // Do nothing.
            } else if (region.type == port) {
                // A single power token is granted if the adjacent sea is unoccupied
                // or if it belongs to the same house than the port
                const adjacentSea = this.game.world.getAdjacentSeaOfPort(region);
                const adjacentSeaController = adjacentSea.getController();
                if (adjacentSeaController == null || adjacentSeaController == house) {
                    gains.set(house, gains.get(house) + 1);
                }
            } else if (region.type == land) {
                const gain = 1 + region.crownIcons;
                gains.set(house, gains.get(house) + gain);
            }
        });

        gains.forEach((gain, house) => {
            if (gain == 0) {
                return;
            }

            house.changePowerTokens(gain);

            this.entireGame.broadcastToClients({
                type: "change-power-token",
                houseId: house.id,
                powerTokenCount: house.powerTokens
            });
        });

        // Starred resolve consolidate power must still be resolved
        this.proceedNextResolve(null);
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

        // Remove Consolidate Power token
        if (!region) {
            throw new Error();
        }

        this.actionGameState.ordersOnBoard.delete(region);

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

        // If no house has any march order available, return null
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
