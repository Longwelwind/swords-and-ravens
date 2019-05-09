import GameState from "../../../GameState";
import WesterosGameState from "../WesterosGameState";
import BiddingGameState, {SerializedBiddingGameState} from "../bidding-game-state/BiddingGameState";
import Player from "../../Player";
import ResolveTiesGameState, {SerializedResolveTiesGameState} from "./resolve-ties-game-state/ResolveTiesGameState";
import House from "../../game-data-structure/House";
import Game from "../../game-data-structure/Game";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";

export default class ClashOfKingsGameState extends GameState<WesterosGameState, BiddingGameState<ClashOfKingsGameState> | ResolveTiesGameState> {
    currentTrackI = -1;

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart() {
        this.proceedNextTrack();
    }

    proceedNextTrack() {
        this.currentTrackI++;

        this.setChildGameState(new BiddingGameState(this)).firstStart(this.game.houses.values);
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage) {
        this.childGameState.onServerMessage(message);
    }

    onBiddingGameStateEnd(results: [number, House[]][]) {
        // Check if there's at least one tie.
        if (results.some(([_, houses]) => houses.length > 1)) {
            // Ask the iron throne holder to resolve them
            this.setChildGameState(new ResolveTiesGameState(this)).firstStart(results);
        } else {
            // No ties, simply proceed
            const finalOrdering = results.map(([_, houses]) => houses[0]);

            this.onResolveTiesGameState(finalOrdering);
        }
    }

    onResolveTiesGameState(finalOrdering: House[]) {
        // The concept of tracks probably should have been generalized (so that the game
        // has a list of tracks, instead of 3 different variables, one for each track).
        // This would have made the code easier, but what is done is done.
        if (this.currentTrackI == 0) {
            this.game.ironThroneTrack = finalOrdering;
        } else if (this.currentTrackI == 1) {
            this.game.fiefdomsTrack = finalOrdering;
        } else if (this.currentTrackI == 2) {
            this.game.kingsCourtTrack = finalOrdering;
        } else {
            throw new Error();
        }

        this.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: this.currentTrackI,
            tracker: finalOrdering.map(h => h.id)
        });

        if (this.currentTrackI < 2) {
            this.proceedNextTrack();
        } else {
            this.parentGameState.onWesterosCardEnd();
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedClashOfKingsGameState {
        return {
            type: "clash-of-kings",
            currentTrackI: this.currentTrackI,
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedClashOfKingsGameState): ClashOfKingsGameState {
        const clashOfKings = new ClashOfKingsGameState(westeros);

        clashOfKings.currentTrackI = data.currentTrackI;
        clashOfKings.childGameState = clashOfKings.deserializeChildGameState(data.childGameState);

        return clashOfKings;
    }

    deserializeChildGameState(data: SerializedClashOfKingsGameState["childGameState"]): ClashOfKingsGameState["childGameState"] {
        if (data.type == "bidding") {
            return BiddingGameState.deserializeFromServer(this, data);
        } else if (data.type == "resolve-ties") {
            return ResolveTiesGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedClashOfKingsGameState {
    type: "clash-of-kings";
    currentTrackI: number;
    childGameState: SerializedBiddingGameState | SerializedResolveTiesGameState;
}
