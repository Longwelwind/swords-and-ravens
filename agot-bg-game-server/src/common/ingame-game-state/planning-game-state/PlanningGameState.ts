import GameState from "../../GameState";
import IngameGameState from "../IngameGameState";
import {ClientMessage} from "../../../messages/ClientMessage";
import Player from "../Player";
import Order from "../game-data-structure/Order";
import Region from "../game-data-structure/Region";
import World from "../game-data-structure/World";
import {ServerMessage} from "../../../messages/ServerMessage";
import EntireGame from "../../EntireGame";
import BetterMap from "../../../utils/BetterMap";
import Game from "../game-data-structure/Game";
import PlanningRestriction from "../game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import PlaceOrdersGameState, { SerializedPlaceOrdersGameState } from "./place-orders-game-state/PlaceOrdersGameState";
import ClaimVassalsGameState, { SerializedClaimVassalsGameState } from "./claim-vassals-game-state/ClaimVassalsGameState";
import planningRestrictions from "../game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import MusteringGameState, { SerializedMusteringGameState } from "../westeros-game-state/mustering-game-state/MusteringGameState";
import WesterosCard from "../game-data-structure/westeros-card/WesterosCard";
import getById from "../../../utils/getById";
import PlaceOrdersForVassalsGameState, { SerializedPlaceOrdersForVassalsGameState } from "./place-orders-for-vassals-game-state/PlaceOrdersForVassalsGameState";
import { observable } from "mobx";
import orders from "../game-data-structure/orders";

export default class PlanningGameState extends GameState<IngameGameState, PlaceOrdersGameState | PlaceOrdersForVassalsGameState | ClaimVassalsGameState | MusteringGameState> {
    // Server-side, the value of the map should never be null.
    // Client-side, the client can receive a null value if it is the order of an other player,
    // it thus represents a face-down order (this player can't see it).
    @observable placedOrders: BetterMap<Region, Order | null> = new BetterMap<Region, Order | null>();
    planningRestrictions: PlanningRestriction[];
    revealedWesterosCards: WesterosCard[];

    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    firstStart(planningRestrictions: PlanningRestriction[], revealedWesterosCards: WesterosCard[]): void {
        this.planningRestrictions = planningRestrictions;
        this.revealedWesterosCards = revealedWesterosCards;
        this.setChildGameState(new ClaimVassalsGameState(this)).firstStart();
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onClaimVassalsFinished(): void {
        if (this.entireGame.gameSettings.precedingMustering && this.game.turn == 1) {
            this.ingame.log({
                type: "westeros-card-executed",
                westerosCardType: "mustering",
                westerosDeckI: 0
            });
            this.setChildGameState(new MusteringGameState(this)).firstStart();
        } else {
            this.setChildGameState(new PlaceOrdersGameState(this)).firstStart();
        }
    }

    onPlaceOrderFinish(): void {
        this.setChildGameState(new PlaceOrdersForVassalsGameState(this)).firstStart();
    }

    onPlaceOrderForVassalsFinish(): void {
        this.ingame.proceedToActionGameState(this.placedOrders as BetterMap<Region, Order>, this.planningRestrictions);
    }

    onMusteringGameStateEnd(): void {
        this.setChildGameState(new PlaceOrdersGameState(this)).firstStart();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPlanningGameState {
        let placedOrders = this.placedOrders.mapOver(r => r.id, (o, r) => {
            // Hide orders that doesn't belong to the player
            // If admin, send all orders.
            const controller = r.getController();
            if (admin || (player && controller != null && (controller == player.house || (this.ingame.isVassalHouse(controller) && this.ingame.isVassalControlledByPlayer(controller, player))))) {
                return o ? o.id : null;
            }
            return null;
        });

        if (this.entireGame.gameSettings.fogOfWar && !admin && player != null) {
            const visibleRegionIds = this.ingame.getVisibleRegionsForPlayer(player).map(r => r.id);
            placedOrders = placedOrders.filter(([rid, _oid]) => visibleRegionIds.includes(rid));
        }

        return {
            type: "planning",
            placedOrders: placedOrders,
            planningRestrictions: this.planningRestrictions.map(pr => pr.id),
            revealedWesterosCardIds: this.revealedWesterosCards.map(wc => wc.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedPlanningGameState): PlanningGameState {
        const planningGameState = new PlanningGameState(ingameGameState);

        planningGameState.planningRestrictions = data.planningRestrictions.map(prid => planningRestrictions.get(prid));
        planningGameState.revealedWesterosCards = data.revealedWesterosCardIds.map((cid, i) => getById(ingameGameState.game.westerosDecks[i], cid));
        planningGameState.placedOrders = new BetterMap(
            data.placedOrders.map(
                ([regionId, orderId]) => [
                    ingameGameState.world.regions.get(regionId),
                    orderId ? orders.get(orderId) : null
                ]
            )
        );
        planningGameState.childGameState = planningGameState.deserializeChildGameState(data.childGameState);

        return planningGameState;
    }

    deserializeChildGameState(data: SerializedPlanningGameState["childGameState"]): PlanningGameState["childGameState"] {
        switch (data.type) {
            case "place-orders":
                return PlaceOrdersGameState.deserializeFromServer(this, data);
            case "place-orders-for-vassals":
                return PlaceOrdersForVassalsGameState.deserializeFromServer(this, data);
            case "claim-vassals":
                return ClaimVassalsGameState.deserializeFromServer(this, data);
            case "mustering":
                return MusteringGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedPlanningGameState {
    type: "planning";
    placedOrders: [string, number | null][];
    planningRestrictions: string[];
    revealedWesterosCardIds: number[];
    childGameState: SerializedPlaceOrdersGameState | SerializedPlaceOrdersForVassalsGameState
        | SerializedClaimVassalsGameState | SerializedMusteringGameState;
}
