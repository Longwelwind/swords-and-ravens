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
import {port, sea, land} from "../game-data-structure/regionTypes";
import PlanningRestriction from "../game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import planningRestrictions, { noSupportOrder } from "../game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import RaidSupportOrderType from "../game-data-structure/order-types/RaidSupportOrderType";
import Unit from "../game-data-structure/Unit";
import {footman} from "../game-data-structure/unitTypes";
import DefenseMusterOrderType from "../game-data-structure/order-types/DefenseMusterOrderType";
import { raidSupportPlusOne } from "../game-data-structure/order-types/orderTypes";

export default class ActionGameState extends GameState<IngameGameState, UseRavenGameState | ResolveRaidOrderGameState | ResolveMarchOrderGameState | ResolveConsolidatePowerGameState> {
    planningRestrictions: PlanningRestriction[];
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

    firstStart(ordersOnBoard: BetterMap<Region, Order>, planningRestrictions: PlanningRestriction[]): void {
        this.planningRestrictions = planningRestrictions;
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
        // In case of no support orders (web of lies) now remove raid/support orders
        if (this.planningRestrictions.some(pr => pr == noSupportOrder)) {
            const regionsWithRaidSupportPlusOneOrders = this.ordersOnBoard.entries.filter(([_r, o]) => o.type == raidSupportPlusOne).map(([r, _o]) => r);
            for(const region of regionsWithRaidSupportPlusOneOrders) {
                this.removeOrderFromRegion(region);
            }
        }

        this.setChildGameState(new ResolveMarchOrderGameState(this)).firstStart();
    }

    removeOrderFromRegion(region: Region): Order | null {
        // todo: Add param to log this event
        if (this.ordersOnBoard.has(region)) {
            const order = this.ordersOnBoard.get(region);
            this.ordersOnBoard.delete(region);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: region.id,
                order: null
            });

            return order;
        }

        return null;
    }

    onUseRavenGameStateEnd(): void {
        // Remove restricted orders from board:
        this.ordersOnBoard.keys.forEach(region => {
            const order = this.ordersOnBoard.get(region);
            if (this.game.isOrderRestricted(region, order, this.planningRestrictions)) {
                this.removeOrderFromRegion(region);
            }
        });

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
                try { this.ordersOnBoard.delete(region); } catch { }
            }
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    getOrdersOfHouse(house: House): [Region, Order][] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house);
    }

    getFootmenOfHouse(house: House): Unit[] {
        const footmen: Unit[] = [];

        this.game.world.regions.values
            .filter(region => region.getController() == house)
            .forEach(region => {
                region.units.forEach(unit => {
                    if (unit.type == footman) {
                        footmen.push(unit);
                    }
                });
            });
        return footmen;
    }

    getRegionsWithRaidOrderOfHouse(house: House): [Region, RaidOrderType | RaidSupportOrderType][] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof RaidOrderType || order.type instanceof RaidSupportOrderType)
            .map(([region, order]) => [region, order.type as RaidOrderType | RaidSupportOrderType]);
    }

    getRegionsWithMarchOrderOfHouse(house: House): Region[] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof MarchOrderType)
            .map(([region, _order]) => region);
    }

    getRegionsWithConsolidatePowerOrderOfHouse(house: House): [Region, ConsolidatePowerOrderType][] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof ConsolidatePowerOrderType)
            .map(([region, order]) => [region, order.type]);
    }

    getRegionsWithStarredConsolidatePowerOrderOfHouse(house: House): Region[] {
        return this.getRegionsWithConsolidatePowerOrderOfHouse(house).filter(([_, ot]) => ot.starred).map(([r, _]) => r);
    }

    getRegionsWithDefenseMusterOrderOfHouse(house: House): Region[] {
        return this.ordersOnBoard.entries
            .filter(([region, _order]) => region.getController() == house)
            .filter(([_region, order]) => order.type instanceof DefenseMusterOrderType).map(([r, _]) => r);
    }

    getPossibleSupportingRegions(attackedRegion: Region): {region: Region; support: SupportOrderType}[] {
        return this.game.world.getNeighbouringRegions(attackedRegion)
            .filter(r => this.ordersOnBoard.has(r))
            .filter(r => this.ordersOnBoard.get(r).type instanceof SupportOrderType || this.ordersOnBoard.get(r).type instanceof RaidSupportOrderType)
            // A port can't support the adjacent land region
            .filter(r => !(r.type == port && this.game.world.getAdjacentLandOfPort(r) == attackedRegion))
            // A sea battle can't be supported by land units
            .filter(r => !(attackedRegion.type == sea && r.type == land))
            .map(region => ({region, support: this.ordersOnBoard.get(region).type as SupportOrderType}));
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedActionGameState {
        return {
            type: "action",
            ordersOnBoard: this.ordersOnBoard.mapOver(r => r.id, o => o.id),
            planningRestrictions: this.planningRestrictions.map(r => r.id),
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
        actionGameState.planningRestrictions = data.planningRestrictions ? data.planningRestrictions.map(id => planningRestrictions.get(id)) : [];
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
    planningRestrictions: string[];
    ordersOnBoard: [string, number][];
    childGameState: SerializedUseRavenGameState | SerializedResolveMarchOrderGameState | SerializedResolveRaidOrderGameState
        | SerializedResolveConsolidatePowerGameState;
}
