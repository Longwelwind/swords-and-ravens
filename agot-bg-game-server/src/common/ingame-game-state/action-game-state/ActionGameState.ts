import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import Region from "../game-data-structure/Region";
import Order from "../game-data-structure/Order";
import EntireGame from "../../EntireGame";
import ResolveMarchOrderGameState, {SerializedResolveMarchOrderGameState} from "./resolve-march-order-game-state/ResolveMarchOrderGameState";
import orders from "../game-data-structure/orders";
import {observable} from "mobx";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import MarchOrderType from "../game-data-structure/order-types/MarchOrderType";
import RaidOrderType from "../game-data-structure/order-types/RaidOrderType";
import UseRavenGameState, {SerializedUseRavenGameState} from "./use-raven-game-state/UseRavenGameState";
import ResolveRaidOrderGameState, {SerializedResolveRaidOrderGameState} from "./resolve-raid-order-game-state/ResolveRaidOrderGameState";
import BetterMap from "../../../utils/BetterMap";
import Game from "../game-data-structure/Game";
import ResolveConsolidatePowerGameState, {SerializedResolveConsolidatePowerGameState} from "./resolve-consolidate-power-game-state/ResolveConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../game-data-structure/order-types/ConsolidatePowerOrderType";
import SupportOrderType from "../game-data-structure/order-types/SupportOrderType";
import * as _ from "lodash";
import {port, sea, land} from "../game-data-structure/regionTypes";

export default class ActionGameState extends GameState<IngameGameState, UseRavenGameState | ResolveRaidOrderGameState | ResolveMarchOrderGameState | ResolveConsolidatePowerGameState> {
    @observable ordersOnBoard: BetterMap<Region, Order>;

    get ingameGameState(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    get entireGame(): EntireGame {
        return this.ingameGameState.entireGame;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(ordersOnBoard: BetterMap<Region, Order>): void {
        this.ordersOnBoard = ordersOnBoard;

        this.ingameGameState.log({
            type: "action-phase-began"
        });

        if (!this.game.skipRavenPhase) {
            this.setChildGameState(new UseRavenGameState(this)).firstStart();
        } else {
            this.onUseRavenGameStateEnd();
        }
    }

    onResolveMarchOrderGameStateFinish(): void {
        this.setChildGameState(new ResolveConsolidatePowerGameState(this)).firstStart();
    }

    onResolveRaidOrderGameStateFinish(): void {
        this.setChildGameState(new ResolveMarchOrderGameState(this)).firstStart();
    }

    onUseRavenGameStateEnd(): void {
        this.setChildGameState(new ResolveRaidOrderGameState(this)).firstStart();
    }

    onResolveConsolidatePowerEnd(): void {
        this.ingameGameState.onActionGameStateFinish();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "action-phase-change-order") {
            const region = this.game.world.regions.get(message.region);
            const order = message.order ? orders.get(message.order) : null;

            if (order) {
                this.ordersOnBoard.set(region, order);
            } else {
                this.ordersOnBoard.delete(region);
            }
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    getOrdersOfHouse(house: House): [Region, Order][] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house);
    }

    getRegionsWithRaidOrderOfHouse(house: House): Region[] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof RaidOrderType)
            .map(([region, _order]) => region);
    }

    getRegionsWithMarchOrderOfHouse(house: House): Region[] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof MarchOrderType)
            .map(([region, _order]) => region);
    }

    getRegionsWithStarredConsolidatePowerOrderOfHouse(house: House): Region[] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof ConsolidatePowerOrderType && order.type.starred)
            .map(([region, _order]) => region);
    }

    getPossibleSupportingRegions(attackedRegion: Region): {region: Region; support: SupportOrderType}[] {
        return this.game.world.getNeighbouringRegions(attackedRegion)
            .filter(r => this.ordersOnBoard.has(r))
            .filter(r => this.ordersOnBoard.get(r).type instanceof SupportOrderType)
            // A port can't support the adjacent land region
            .filter(r => !(r.type == port && this.game.world.getAdjacentLandOfPort(r) == attackedRegion))
            // A sea battle can't be supported by land units
            .filter(r => !(attackedRegion.type == sea && r.type == land))
            .map(region => ({region, support: this.ordersOnBoard.get(region).type as SupportOrderType}));
    }

    getSupportCombatStrength(supportingHouse: House, attackedRegion: Region): number {
        return this.getPossibleSupportingRegions(attackedRegion)
            .filter(({region}) => region.getController() == supportingHouse)
            .map(({region, support}) => this.game.getCombatStrengthOfArmy(region.units.values, attackedRegion.hasStructure) + support.supportModifier)
            .reduce(_.add, 0);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedActionGameState {
        return {
            type: "action",
            ordersOnBoard: this.ordersOnBoard.mapOver(r => r.id, o => o.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedActionGameState): ActionGameState {
        const actionGameState = new ActionGameState(ingameGameState);

        actionGameState.ordersOnBoard = new BetterMap(
            data.ordersOnBoard.map(([regionId, orderId]) => (
                [ingameGameState.world.regions.get(regionId), orders.get(orderId)]
            ))
        );
        actionGameState.childGameState = actionGameState.deserializeChildGameState(data.childGameState);

        return actionGameState;
    }

    deserializeChildGameState(data: SerializedActionGameState["childGameState"]): UseRavenGameState | ResolveRaidOrderGameState | ResolveMarchOrderGameState | ResolveConsolidatePowerGameState {
        if (data.type == "use-raven") {
            return UseRavenGameState.deserializeFromServer(this, data);
        } else if (data.type == "resolve-march-order") {
            return ResolveMarchOrderGameState.deserializeFromServer(this, data);
        } else if (data.type == "resolve-raid-order") {
            return ResolveRaidOrderGameState.deserializeFromServer(this, data);
        } else if (data.type == "resolve-consolidate-power") {
            return ResolveConsolidatePowerGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedActionGameState {
    type: "action";
    ordersOnBoard: [string, number][];
    childGameState: SerializedUseRavenGameState | SerializedResolveMarchOrderGameState | SerializedResolveRaidOrderGameState
        | SerializedResolveConsolidatePowerGameState;
}
