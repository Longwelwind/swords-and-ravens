import GameState from "../../../../GameState";
import ActionGameState from "../../ActionGameState";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import Player from "../../../Player";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import House from "../../../game-data-structure/House";
import EntireGame from "../../../../EntireGame";
import {land, port, sea} from "../../../game-data-structure/regionTypes";
import Region from "../../../game-data-structure/Region";
import IngameGameState from "../../../IngameGameState";
import IronBankOrderType from "../../../game-data-structure/order-types/IronBankOrderType";
import ResolveConsolidatePowerGameState from "../ResolveConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../../../game-data-structure/order-types/ConsolidatePowerOrderType";
import User from "../../../../../server/User";
import DefenseMusterOrderType from "../../../game-data-structure/order-types/DefenseMusterOrderType";
import PlayerMusteringGameState, { PlayerMusteringType } from "../../../westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import IronBank from "../../../game-data-structure/IronBank";
import { observable } from "mobx";
import BetterMap from "../../../../../utils/BetterMap";
import _ from "lodash";

export default class ResolveSingleConsolidatePowerGameState extends GameState<ResolveConsolidatePowerGameState> {
    @observable house: House;

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
        return this.actionGameState.ingame;
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
        const consolidatePowerOrders = new BetterMap(availableOrders.filter(([_r, ot]) => ot instanceof ConsolidatePowerOrderType));
        const ironBankOrders = availableOrders.filter(([_r, ot]) => ot instanceof IronBankOrderType);

        if (defenseMusterOrders.length > 1 || (defenseMusterOrders.length == 1 && (consolidatePowerOrders.size > 0 || ironBankOrders.length > 0))) {
            throw new Error("Too much Defense / Muster orders placed or Defense / Muster together with player CP/IB orders placed!");
        }

        if (defenseMusterOrders.length > 0) {
            // There is nothing to fast-track
            return;
        }

        // Before asking the player to resolve an Order now,
        // check if they only have non-starred Consolidate Power orders, or
        // if the starred ones are present on regions with no structure.
        // In that case, fast-track the process and simply resolve one of those.

        if (this.canCpOrdersBeResolvedAutomatically(ironBankOrders, consolidatePowerOrders)) {
            // Take the order which will gain the most Power tokens and resolve it automatically
            // This is done to avoid resolving CPs manually all the time. In the past the order didn't matter but
            // due to The Faceless Men players want to resolve the orders with the most tokens first.
            const regionsWithPossibleGains = consolidatePowerOrders.keys.map(r => [r, this.getPotentialGainedPowerTokens(r, house)] as [Region, number]);
            const ordered = _.sortBy(regionsWithPossibleGains,
                // Resolve CP orders with highest gain first
                ([_region, gains]) => -gains);
            const regionToResolveCpAutomatically = ordered[0][0];

            this.parentGameState.resolveConsolidatePowerOrderForPt(regionToResolveCpAutomatically, house, true);

            // Remove the order from the board
            this.actionGameState.removeOrderFromRegion(regionToResolveCpAutomatically);

            // Proceed to the next house
            this.onResolveSingleConsolidatePowerFinish();
            return;
        }

        // Check if Iron Bank order can be fast-tracked because there might be no purchasable loan
        if (ironBankOrders.length == 1 && consolidatePowerOrders.size == 0 && this.ironBank?.getPurchasableLoans(this.house).length == 0) {
            const region = ironBankOrders[0][0];
            this.actionGameState.removeOrderFromRegion(region, true, this.house, true);
            this.onResolveSingleConsolidatePowerFinish();
            return;
        }

        // If there is an Iron Bank order but all loan slots are empty and no CP* can be used for mustering
        // (players might want to delay the mustering or muster immediately), the Iron Bank order can be removed automatically
        if (ironBankOrders.length == 1 && !consolidatePowerOrders.entries.some(([r, ot]) => ot.starred && r.hasStructure) && this.ironBank?.loanSlots.every(lc => lc == null)) {
            const region = ironBankOrders[0][0];
            this.actionGameState.removeOrderFromRegion(region, true, this.house, true);
            this.onResolveSingleConsolidatePowerFinish();
        }
    }

    private canCpOrdersBeResolvedAutomatically(ironBankOrders: [Region, ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType][],
        consolidatePowerOrders: BetterMap<Region, ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType>): boolean {
        // When there are Iron Bank orders left, CPs cannot be resolved automatically
        if (ironBankOrders.length > 0) {
            return false;
        }

        // When there are CP* orders on castle areas they can be used for mustering and therefore not resolved automatically
        if (consolidatePowerOrders.entries.some(([r, ot]) => ot.starred && r.hasStructure)) {
            return false;
        }

        if (consolidatePowerOrders.size > 1 && this.game.ironBank && this.game.ironBank.loanSlots.some(lc => lc?.type.preventsAutomaticResolutionOfCpOrders)) {
            // If Faceless men is present on the loan slots we have to check if someone else has an Iron Bank order to resolve
            // and then multiple CPs must be resolved manually
            const otherIronBankOrders = this.actionGameState.ordersOnBoard.entries.filter(([region, order]) =>
                order.type instanceof IronBankOrderType && region.getController() != this.house);

            return otherIronBankOrders.length == 0;
        }

        return true;
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
                    this.actionGameState.removeOrderFromRegion(regionOfOrder, false, this.house, false, "yellow");
                    this.onResolveSingleConsolidatePowerFinish();
                    return;
                } else if (order.type.starred && message.musterUnits) {
                    this.parentGameState.setChildGameState(new PlayerMusteringGameState(this.parentGameState)).firstStart(this.house, PlayerMusteringType.STARRED_CONSOLIDATE_POWER);
                    return;
                }
            } else if (order.type instanceof DefenseMusterOrderType && message.musterUnits) {
                this.parentGameState.setChildGameState(new PlayerMusteringGameState(this.parentGameState)).firstStart(this.house, PlayerMusteringType.DEFENSE_MUSTER_ORDER);
                return;
            } else if (order.type instanceof IronBankOrderType && this.ironBank && message.purchaseLoan !== undefined) {
                const loan = this.ironBank.purchaseLoan(this.house, message.purchaseLoan, regionOfOrder.id);
                if (!loan) {
                    return;
                }

                // Remove the order from the board
                this.actionGameState.removeOrderFromRegion(regionOfOrder, false, this.house, false, "yellow");
                loan.execute(this, this.house);
            } else if (message.ignoreAndRemoveOrder) {
                // Remove the order from the board
                this.ingame.log({
                    type: "order-removed",
                    house: this.house.id,
                    order: order.type.id,
                    region: regionOfOrder.id
                });
                this.actionGameState.removeOrderFromRegion(regionOfOrder, false, this.house, false, "yellow");
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
