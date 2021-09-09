import GameState from "../../../GameState";
import WesterosGameState from "../WesterosGameState";
import BiddingGameState, {SerializedBiddingGameState} from "../bidding-game-state/BiddingGameState";
import Player from "../../Player";
import ResolveTiesGameState, {SerializedResolveTiesGameState} from "./resolve-ties-game-state/ResolveTiesGameState";
import House from "../../game-data-structure/House";
import Game from "../../game-data-structure/Game";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import DistributePowerTokensGameState, { SerializedDistributePowerTokensGameState } from "./distribute-power-tokens-game-state/DistributePowerTokensGameState";

export default class ClashOfKingsGameState extends GameState<WesterosGameState, BiddingGameState<ClashOfKingsGameState> | ResolveTiesGameState | DistributePowerTokensGameState> {
    currentTrackI = -1;

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.proceedNextTrack();
    }

    proceedNextTrack(): void {
        this.currentTrackI++;

        this.entireGame.broadcastToClients({
            type: "bidding-next-track",
            nextTrack: this.currentTrackI
        });

        this.setChildGameState(new BiddingGameState(this)).firstStart(this.game.houses.values);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if(message.type == "bidding-next-track") {
            this.currentTrackI = message.nextTrack
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    onBiddingGameStateEnd(results: [number, House[]][]): void {
        this.parentGameState.ingame.log({
            type: "clash-of-kings-bidding-done",
            trackerI: this.currentTrackI,
            results: results.map(([bid, houses]) => [bid, houses.map(h => h.id)]),
            distributor: null
        });

        const targaryen = this.game.targaryen;
        if (targaryen && results.some(([bid, houses]) => bid > 0 && houses.includes(targaryen))) {
            this.setChildGameState(new DistributePowerTokensGameState(this)).firstStart(targaryen, results);
            return;
        }

        this.proceedCheckForTies(results);
    }

    onDistributePowerTokensFinish(results: [number, House[]][], distributor: House | null): void {
        if (distributor) {
            this.parentGameState.ingame.log({
                type: "clash-of-kings-bidding-done",
                trackerI: this.currentTrackI,
                results: results.map(([bid, houses]) => [bid, houses.map(h => h.id)]),
                distributor: distributor.id
            });
        }

        this.proceedCheckForTies(results);
    }

    proceedCheckForTies(results: [number, House[]][]): void {
        // Check if there's at least one tie.
        if (results.some(([_, houses]) => houses.length > 1)) {
            // Remove a possible bid of Targaryen:
            results.forEach(([_bid, houses]) => {
                const targIndex = houses.findIndex(h => h.id == "targaryen");
                if (targIndex > -1) {
                    houses.splice(targIndex, 1);
                }
            });

            // Ask the iron throne holder to resolve them
            this.setChildGameState(new ResolveTiesGameState(this)).firstStart(results);
        } else {
            // No ties, simply proceed
            const finalOrdering = results.map(([_, houses]) => houses[0]);

            this.onResolveTiesGameState(results, finalOrdering);
        }
    }

    onResolveTiesGameState(_biddingResults: [number, House[]][], finalOrdering: House[]): void {
        finalOrdering = this.ingame.getFixedInfluenceTrack(finalOrdering);

        this.parentGameState.ingame.log({
            type: "clash-of-kings-final-ordering",
            trackerI: this.currentTrackI,
            finalOrder: finalOrdering.map(h => h.id)
        });

        this.ingame.setInfluenceTrack(this.currentTrackI, finalOrdering);

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
        } else if (data.type == "distribute-power-tokens") {
            return DistributePowerTokensGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedClashOfKingsGameState {
    type: "clash-of-kings";
    currentTrackI: number;
    childGameState: SerializedBiddingGameState | SerializedResolveTiesGameState | SerializedDistributePowerTokensGameState;
}
