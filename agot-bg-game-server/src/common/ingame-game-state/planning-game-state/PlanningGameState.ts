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

export default class PlanningGameState extends GameState<IngameGameState, PlaceOrdersGameState | ClaimVassalsGameState> {
    planningRestrictions: PlanningRestriction[];

    get ingameGameState(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.ingameGameState.entireGame;
    }

    firstStart(planningRestrictions: PlanningRestriction[]): void {
        this.ingameGameState.log({
            type: "planning-phase-began"
        });

        this.planningRestrictions = planningRestrictions;

        this.setChildGameState(new ClaimVassalsGameState(this)).firstStart();
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onClaimVassalsFinished(): void {
        this.setChildGameState(new PlaceOrdersGameState(this)).firstStart();
    }

    onPlaceOrderFinish(forVassals: boolean, orders: BetterMap<Region, Order>): void {
        if (!forVassals) {
            this.setChildGameState(new PlaceOrdersGameState(this)).firstStart(orders, true);
        } else {
            this.ingameGameState.proceedToActionGameState(orders, this.planningRestrictions);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPlanningGameState {
        return {
            type: "planning",
            planningRestrictions: this.planningRestrictions.map(pr => pr.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedPlanningGameState): PlanningGameState {
        const planningGameState = new PlanningGameState(ingameGameState);

        planningGameState.planningRestrictions = data.planningRestrictions.map(prid => planningRestrictions.get(prid));
        planningGameState.childGameState = planningGameState.deserializeChildGameState(data.childGameState);
        
        return planningGameState;
    }

    deserializeChildGameState(data: SerializedPlanningGameState["childGameState"]): PlanningGameState["childGameState"] {
        switch (data.type) {
            case "place-orders":
                return PlaceOrdersGameState.deserializeFromServer(this, data);
            case "claim-vassals":
                return ClaimVassalsGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedPlanningGameState {
    type: "planning";
    planningRestrictions: string[];
    childGameState: SerializedPlaceOrdersGameState | SerializedClaimVassalsGameState;
}
