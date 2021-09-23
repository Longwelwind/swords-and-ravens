import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import EntireGame from "../../../EntireGame";
import {land, port, sea} from "../../game-data-structure/regionTypes";
import Region from "../../game-data-structure/Region";
import IngameGameState from "../../IngameGameState";
import IronBankOrderType from "../../game-data-structure/order-types/IronBankOrderType";
import ResolveConsolidatePowerGameState from "../resolve-consolidate-power-game-state/ResolveConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../../game-data-structure/order-types/ConsolidatePowerOrderType";
import User from "../../../../server/User";
import DefenseMusterOrderType from "../../game-data-structure/order-types/DefenseMusterOrderType";
import PlayerMusteringGameState, { PlayerMusteringType } from "../../westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import IronBank from "../../game-data-structure/IronBank";
import { observable } from "mobx";

export default class ResolveSingleConsolidatePowerGameState extends GameState<ResolveConsolidatePowerGameState> {
    house: House;
    @observable rerender = 0;

    get game(): Game {
        return this.actionGameState.game;
    }

    get entireGame(): EntireGame {
        return this.actionGameState.entireGame;
    }

    get actionGameState(): ActionGameState {
        return this.parentGameState.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.actionGameState.ingameGameState;
    }

    get ironBank(): IronBank | null {
        return this.game.ironBank;
    }

    firstStart(house: House): void {
        this.house = house;

        const availableOrders = this.parentGameState.getAvailableOrdersOfHouse(house).entries;

        if (availableOrders.length == 0) {
            // Should never happen as parentGameState.getNextHouseToResolveOrder is checking this already, but for safety we handle it
            this.onResolveSingleConsolidatePowerFinish();
            return;
        }

        const defenseMusterOrders = availableOrders.filter(([_r, ot]) => ot instanceof DefenseMusterOrderType);
        const consolidatePowerOrders = availableOrders.filter(([_r, ot]) => ot instanceof ConsolidatePowerOrderType);
        const ironBankOrders = availableOrders.filter(([_r, ot]) => ot instanceof IronBankOrderType);

        if (defenseMusterOrders.length > 1 || (defenseMusterOrders.length == 1 && (consolidatePowerOrders.length > 0 || ironBankOrders.length > 0))) {
            throw new Error("Too much Defense / Muster orders placed or Defense / Muster together with player CP/IB orders placed!");
        }

        if (defenseMusterOrders.length == 1) {
            this.parentGameState.setChildGameState(new PlayerMusteringGameState(this.parentGameState)).firstStart(house, PlayerMusteringType.DEFENSE_MUSTER_ORDER);
            return;
        }

        // Before asking the player to resolve an Order now,
        // check if they only have non-starred Consolidate Power orders, or
        // if the starred ones are present on regions with no structure.
        // In that case, fast-track the process and simply resolve one of those.

        if (ironBankOrders.length == 0 && consolidatePowerOrders.every(([r, ot]) => !ot.starred || (ot.starred && !r.hasStructure))) {
            // Take one of the CP order and resolve it
            const region = consolidatePowerOrders[0][0];

            this.parentGameState.resolveConsolidatePowerOrderForPt(region, house);

            // Remove the order from the board
            this.actionGameState.removeOrderFromRegion(region);

            // Proceed to the next house
            this.onResolveSingleConsolidatePowerFinish();
        }
    }

    getPotentialGainedPowerTokens(region: Region, house: House): number {
        const order = this.actionGameState.ordersOnBoard.tryGet(region, null);
        if (order && !(order.type instanceof ConsolidatePowerOrderType)) {
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

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "resolve-consolidate-power-choice") {
            if (this.ingame.getControllerOfHouse(this.house).user != player.user) {
                return;
            }

            const regionOfOrder = this.ingame.world.regions.tryGet(message.region, null);
            if (!regionOfOrder) {
                return;
            }

            const order = this.actionGameState.ordersOnBoard.tryGet(regionOfOrder, null);

            if (!order || !(order.type instanceof ConsolidatePowerOrderType || order.type instanceof IronBankOrderType || order.type instanceof DefenseMusterOrderType)) {
                return;
            }

            if (order.type instanceof ConsolidatePowerOrderType) {
                if (message.gainPowerTokens) {
                    this.parentGameState.resolveConsolidatePowerOrderForPt(regionOfOrder, this.house);
                    // Remove the order from the board
                    this.actionGameState.removeOrderFromRegion(regionOfOrder);
                    this.onResolveSingleConsolidatePowerFinish();
                    return;
                } else if (order.type.starred && message.musterUnits) {
                    this.parentGameState.setChildGameState(new PlayerMusteringGameState(this.parentGameState)).firstStart(this.house, PlayerMusteringType.STARRED_CONSOLIDATE_POWER);
                    return;
                }
            } else if (order.type instanceof DefenseMusterOrderType && message.musterUnits) {
                // Should not happen, but we handle it
                this.parentGameState.setChildGameState(new PlayerMusteringGameState(this.parentGameState)).firstStart(this.house, PlayerMusteringType.STARRED_CONSOLIDATE_POWER);
            } else if (order.type instanceof IronBankOrderType && this.ironBank && message.purchaseLoan !== undefined) {
                const loan = this.ironBank.purchaseLoan(this.house, message.purchaseLoan, regionOfOrder.id);
                if (!loan) {
                    return;
                }

                // Remove the order from the board
                this.actionGameState.removeOrderFromRegion(regionOfOrder);
                loan.execute(this, this.house);
            } else if (message.ignoreAndRemoveOrder) {
                // Remove the order from the board
                this.ingame.log({
                    type: "order-removed",
                    house: this.house.id,
                    order: order.type.id,
                    region: regionOfOrder.id
                });
                this.actionGameState.removeOrderFromRegion(regionOfOrder);
                this.onResolveSingleConsolidatePowerFinish();
            }
        }
    }

    onResolveSingleConsolidatePowerFinish(): void {
        this.parentGameState.proceedNextResolve(this.house);
    }

    onServerMessage(_message: ServerMessage): void {
    }

    getWaitedUsers(): User[] {
        return [ this.ingame.getControllerOfHouse(this.house).user ];
    }

    /* CLIENT */

    choosePurchaseLoan(i: number, region: Region): void {
        this.entireGame.sendMessageToServer({
            type: "resolve-consolidate-power-choice",
            purchaseLoan: i,
            region: region.id
        });
    }

    chooseGainPowerTokens(region: Region): void {
        this.entireGame.sendMessageToServer({
            type: "resolve-consolidate-power-choice",
            gainPowerTokens: true,
            region: region.id
        });
    }

    chooseMustering(region: Region): void {
        this.entireGame.sendMessageToServer({
            type: "resolve-consolidate-power-choice",
            musterUnits: true,
            region: region.id
        });
    }

    chooseRemoveOrder(region: Region): void {
        this.entireGame.sendMessageToServer({
            type: "resolve-consolidate-power-choice",
            region: region.id,
            ignoreAndRemoveOrder: true
        });
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedResolveSingleConsolidatePowerGameState {
        return {
            type: "resolve-single-consolidate-power",
            house: this.house.id
        };
    }

    static deserializeFromServer(resolveConsolidatePower: ResolveConsolidatePowerGameState, data: SerializedResolveSingleConsolidatePowerGameState): ResolveSingleConsolidatePowerGameState {
        const resolveSingleConsolidatePower = new ResolveSingleConsolidatePowerGameState(resolveConsolidatePower);
        resolveSingleConsolidatePower.house = resolveConsolidatePower.game.houses.get(data.house);
        return resolveSingleConsolidatePower;
    }
}

export interface SerializedResolveSingleConsolidatePowerGameState {
    type: "resolve-single-consolidate-power";
    house: string;
}
