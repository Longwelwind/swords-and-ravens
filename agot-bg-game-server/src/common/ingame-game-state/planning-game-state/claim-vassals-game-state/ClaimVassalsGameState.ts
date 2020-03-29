import PlanningGameState from "../PlanningGameState";
import GameState from "../../../GameState";
import ClaimVassalGameState, { SerializedClaimVassalGameState } from "./claim-vassal-game-state/ClaimVassalGameState";
import House from "../../game-data-structure/House";
import { ServerMessage } from "../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../messages/ClientMessage";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import IngameGameState from "../../IngameGameState";
import _ from "lodash";

export default class ClaimVassalsGameState extends GameState<PlanningGameState, ClaimVassalGameState> {

    get ingame(): IngameGameState {
        return this.parentGameState.ingameGameState;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        this.proceedNextVassal(null);
    }

    proceedNextVassal(lastToClaim: House | null): void {
        const vassalsToClaim = this.ingame.getNonClaimedVassalHouses();

        if (vassalsToClaim.length == 0) {
            this.parentGameState.onClaimVassalsFinished();
            return;
        }

        const nextHouseToClaim = this.ingame.getNextNonVassalInTurnOrder(lastToClaim);

        // If it is the last house to claim vassals,
        // attribute all of them to him
        if (nextHouseToClaim == _.last(this.ingame.getTurnOrderWithoutVassals())) {
            this.assignVassals(nextHouseToClaim, vassalsToClaim);

            this.parentGameState.onClaimVassalsFinished();
            return;
        }

        // Depending on the number of vassals, a house might be able to take multiple
        // vassals.
        const countVassals = this.ingame.getVassalHouses().length;
        const countNonVassals = this.game.houses.size - countVassals;
        // Get the position in the Iron Throne track, but without considering the vassals
        const positionInTrack = this.game.ironThroneTrack.filter(h => !this.ingame.isVassalHouse(h)).indexOf(nextHouseToClaim);
        const count = Math.floor(countVassals / countNonVassals) + (positionInTrack < (countVassals % countNonVassals) ? 1 : 0);

        this.setChildGameState(new ClaimVassalGameState(this)).firstStart(nextHouseToClaim, count);
    }

    onClaimVassalFinish(house: House): void {
        this.proceedNextVassal(house);
    }

    assignVassals(house: House, vassals: House[]): void {
        vassals.forEach(v => this.game.vassalRelations.set(v, house));

        this.entireGame.broadcastToClients({
            type: "vassals-claimed",
            vassals: vassals.map(v => v.id),
            house: house.id
        });

        this.ingame.log({
            type: "vassals-claimed",
            house: house.id,
            vassals: vassals.map(v => v.id)
        });
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "vassals-claimed") {
            const vassals = message.vassals.map(hid => this.ingame.game.houses.get(hid));
            const house = this.ingame.game.houses.get(message.house);

            vassals.forEach(v => this.game.vassalRelations.set(v, house));
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedClaimVassalsGameState {
        return {
            type: "claim-vassals",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(planningGameState: PlanningGameState, data: SerializedClaimVassalsGameState): ClaimVassalsGameState {
        const claimVassals = new ClaimVassalsGameState(planningGameState);

        claimVassals.childGameState = claimVassals.deserializeChildGameState(data.childGameState);
        
        return claimVassals;
    }

    deserializeChildGameState(data: SerializedClaimVassalsGameState["childGameState"]): ClaimVassalsGameState["childGameState"] {
        switch (data.type) {
            case "claim-vassal":
                return ClaimVassalGameState.deserializeFromServer(this, data);
        }
    }

}

export interface SerializedClaimVassalsGameState {
    type: "claim-vassals";
    childGameState: SerializedClaimVassalGameState;
    
}