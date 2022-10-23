import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import Region, { RegionState } from "../game-data-structure/Region";
import Order from "../game-data-structure/Order";
import EntireGame from "../../EntireGame";
import ResolveMarchOrderGameState, {SerializedResolveMarchOrderGameState} from "./resolve-march-order-game-state/ResolveMarchOrderGameState";
import orders from "../game-data-structure/orders";
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
import IronBankOrderType from "../game-data-structure/order-types/IronBankOrderType";
import ReconcileArmiesGameState, { SerializedReconcileArmiesGameState } from "../westeros-game-state/reconcile-armies-game-state/ReconcileArmiesGameState";
import popRandom from "../../../utils/popRandom";
import ScoreObjectivesGameState, { SerializedScoreObjectivesGameState } from "./score-objectives-game-state/ScoreObjectivesGameState";
import _ from "lodash";

export default class ActionGameState extends GameState<IngameGameState, UseRavenGameState | ResolveRaidOrderGameState
                                                                        | ResolveMarchOrderGameState | ResolveConsolidatePowerGameState
                                                                        | ReconcileArmiesGameState<ActionGameState> | ScoreObjectivesGameState>
{
    planningRestrictions: PlanningRestriction[];

    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    get ordersOnBoard(): BetterMap<Region, Order> {
        return this.ingame.ordersOnBoard;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(planningRestrictions: PlanningRestriction[]): void {
        this.planningRestrictions = planningRestrictions;

        this.ingame.log({
            type: "action-phase-began"
        });

        const worldState = _.orderBy(this.ingame.world.getWorldState(), [r => r.controller, r => r.id]);
        const enrichedWorldState: RegionState[] = [];
        worldState.forEach(r => {
            //const region = this.ingame.world.regions.tryGet(r.id, null);
            const region =  this.ingame.world.regions.get(r.id);
            if (region && this.ordersOnBoard.has(region)) {
                const order = this.ordersOnBoard.get(region);
                r.order = { type: order.type.id };
                if (this.game.isOrderRestricted(region, order, this.planningRestrictions)) {
                    r.order.restricted = true;
                }
            }
            enrichedWorldState.push(r);
        });

        this.ingame.log({
            type: "orders-revealed",
            worldState: enrichedWorldState
        });

        this.setChildGameState(new UseRavenGameState(this)).firstStart();
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

    findOrphanedOrdersAndRemoveThem(): void {
        const orphanedOrders = this.ordersOnBoard.entries.filter(([region, _]) => region.units.size == 0);

        orphanedOrders.forEach(([region, _]) => {
            this.removeOrderFromRegion(region, true, undefined, true, "red");
        });
    }

    removeOrderFromRegion(region: Region, log = false, house: (House | undefined) = undefined, resolvedAutomatically = false, animate: "yellow" | "red" | undefined = undefined): Order | null {
        if (this.ordersOnBoard.has(region)) {
            const order = this.ordersOnBoard.get(region);
            this.ordersOnBoard.delete(region);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: region.id,
                order: null,
                animate: animate
            });

            if (log) {
                this.ingame.log({
                    type: "order-removed",
                    region: region.id,
                    house: house?.id,
                    order: order.type.id
                }, resolvedAutomatically);
            }

            return order;
        }

        return null;
    }

    onUseRavenGameStateEnd(): void {
        // Remove restricted orders from board:
        this.ordersOnBoard.keys.forEach(region => {
            const order = this.ordersOnBoard.get(region);
            if (this.game.isOrderRestricted(region, order, this.planningRestrictions)) {
                this.removeOrderFromRegion(region, false, undefined, true, "red");
            }
        });

        this.setChildGameState(new ResolveRaidOrderGameState(this)).firstStart();
    }

    onResolveConsolidatePowerEnd(): void {
        if (this.entireGame.isFeastForCrows) {
            this.proceedFeastForCrowsSteps();
        } else {
            this.ingame.onActionGameStateFinish();
        }
    }

    proceedFeastForCrowsSteps(): void {
        this.game.updateSupplies();
        // Check if any house needs to reconcile his armies
        this.setChildGameState(new ReconcileArmiesGameState(this)).firstStart();
    }

    onReconcileArmiesGameStateEnd(): void {
        this.setChildGameState(new ScoreObjectivesGameState(this)).firstStart();
    }

    onScoreObjectivesGameStateEnd(): void {
        // Draw new objectives
        this.ingame.getTurnOrderWithoutVassals().forEach(h => {
            if (h.secretObjectives.length < 3) {
                const newCard = popRandom(this.game.objectiveDeck);
                if (newCard) {
                    h.secretObjectives.push(newCard);
                    this.ingame.log({
                        type: "new-objective-card-drawn",
                        house: h.id
                    });
                } else {
                    this.ingame.log({
                        type: "objective-deck-empty",
                        house: h.id
                    });
                }
            }
        });

        this.ingame.broadcastObjectives();
        if (this.ingame.checkVictoryConditions()) {
            return;
        }

        this.ingame.onActionGameStateFinish();
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
                if (message.animate) {
                    this.ingame.ordersToBeAnimated.set(region,
                        {highlight: {active: true, color: message.animate}, animateAttention: true});
                    window.setTimeout(() => {
                        this.ingame.ordersToBeAnimated.delete(region);
                    }, 3000);
                }
            } else {
                if (this.ordersOnBoard.has(region)) {
                    if (message.animate) {
                        this.ingame.ordersToBeAnimated.set(region,
                            {highlight: {active: true, color: message.animate}, animateFadeOut: true});
                        window.setTimeout(() => {
                            this.ingame.ordersToBeAnimated.delete(region);
                            this.ordersOnBoard.delete(region);
                        }, 4000);
                    } else {
                        this.ordersOnBoard.delete(region);
                    }
                }
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
            .filter(([region, order]) => (order.type instanceof RaidOrderType || order.type instanceof RaidSupportOrderType) && region.getController() == house)
            .map(([region, order]) => [region, order.type as RaidOrderType | RaidSupportOrderType]);
    }

    getRegionsWithMarchOrderOfHouse(house: House): Region[] {
        return this.ordersOnBoard.entries
            .filter(([region, order]) => order.type instanceof MarchOrderType && region.getController() == house)
            .map(([region, _order]) => region);
    }

    getRegionsWithConsolidatePowerOrderOfHouse(house: House): [Region, ConsolidatePowerOrderType][] {
        return this.ordersOnBoard.entries
            .filter(([region, order]) => order.type instanceof ConsolidatePowerOrderType && region.getController() == house)
            .map(([region, order]) => [region, order.type]);
    }

    getRegionsWithIronBankOrderOfHouse(house: House): [Region, IronBankOrderType][] {
        return this.ordersOnBoard.entries
            .filter(([region, order]) => order.type instanceof IronBankOrderType && region.getController() == house)
            .map(([region, order]) => [region, order.type]);
    }

    getRegionsWithStarredConsolidatePowerOrderOfHouse(house: House): Region[] {
        return this.getRegionsWithConsolidatePowerOrderOfHouse(house).filter(([_, ot]) => ot.starred).map(([r, _]) => r);
    }

    getRegionsWithDefenseMusterOrderOfHouse(house: House): [Region, DefenseMusterOrderType][] {
        return this.ordersOnBoard.entries
            .filter(([region, order]) => order.type instanceof DefenseMusterOrderType && region.getController() == house)
            .map(([region, order]) => [region, order.type as DefenseMusterOrderType]);
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
            planningRestrictions: this.planningRestrictions.map(r => r.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedActionGameState): ActionGameState {
        const actionGameState = new ActionGameState(ingameGameState);

        actionGameState.planningRestrictions = data.planningRestrictions ? data.planningRestrictions.map(id => planningRestrictions.get(id)) : [];
        actionGameState.childGameState = actionGameState.deserializeChildGameState(data.childGameState);

        return actionGameState;
    }

    deserializeChildGameState(data: SerializedActionGameState["childGameState"]): ActionGameState["childGameState"] {
        switch (data.type) {
            case "use-raven":
                return UseRavenGameState.deserializeFromServer(this, data);
            case "resolve-march-order":
                return ResolveMarchOrderGameState.deserializeFromServer(this, data);
            case "resolve-raid-order":
                return ResolveRaidOrderGameState.deserializeFromServer(this, data);
            case "resolve-consolidate-power":
                return ResolveConsolidatePowerGameState.deserializeFromServer(this, data);
            case "reconcile-armies":
                return ReconcileArmiesGameState.deserializeFromServer(this, data);
            case "score-objectives":
                return ScoreObjectivesGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedActionGameState {
    type: "action";
    planningRestrictions: string[];
    childGameState: SerializedUseRavenGameState | SerializedResolveMarchOrderGameState | SerializedResolveRaidOrderGameState
        | SerializedResolveConsolidatePowerGameState | SerializedReconcileArmiesGameState | SerializedScoreObjectivesGameState;
}
