import GameState from "../../../GameState";
import WesterosGameState from "../WesterosGameState";
import Player from "../../Player";
import BiddingGameState, {SerializedBiddingGameState} from "../bidding-game-state/BiddingGameState";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import EntireGame from "../../../EntireGame";
import * as _ from "lodash";
import WildlingCard from "../../game-data-structure/wildling-card/WildlingCard";
import PreemptiveRaidWildlingVictoryGameState
    , {SerializedPreemptiveRaidWildlingVictoryGameState} from "./preemptive-raid-wildling-victory-game-state/PreemptiveRaidWildlingVictoryGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import CrowKillersWildlingVictoryGameState
    , {SerializedCrowKillersWildlingVictoryGameState} from "./crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import CrowKillersNightsWatchVictoryGameState
    , {SerializedCrowKillersNightsWatchVictoryGameState} from "./crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";
import RattleshirtsRaidersWildlingVictoryGameState
    , {SerializedRattleshirtsRaidersWildlingVictoryGameState} from "./rattleshirts-raiders-wildling-victory-game-state/RattleshirtsRaidersWildlingVictoryGameState";
import MassingOnTheMilkwaterWildlingVictoryGameState
    , {SerializedMassingOnTheMilkwaterWildlingVictoryGameState} from "./massing-on-the-milkwater-wildling-victory-game-state/MassingOnTheMilkwaterWildlingVictoryGameState";
import AKingBeyondTheWallWildlingVictoryGameState, {SerializedAKingBeyondTheWallWildlingVictoryGameState} from "./a-king-beyond-the-wall-wildling-victory-game-state/AKingBeyondTheWallWildlingVictoryGameState";
import AKingBeyondTheWallNightsWatchVictoryGameState, {SerializedAKingBeyondTheWallNightsWatchVictoryGameState} from "./a-king-beyond-the-wall-nights-watch-victory-game-state/AKingBeyondTheWallNightsWatchVictoryGameState";
import MammothRidersWildlingVictoryGameState, {SerializedMammothRidersWildlingVictoryGameState} from "./mammoth-riders-wildling-victory-game-state/MammothRidersWildlingVictoryGameState";
import MammothRidersNightsWatchVictoryGameState, {SerializedMammothRidersNightsWatchVictoryGameState} from "./mammoth-riders-nights-watch-victory-game-state/MammothRidersNightsWatchVictoryGameState";
import TheHordeDescendsWildlingVictoryGameState, {SerializedTheHordeDescendsWildlingVictoryGameState} from "./the-horde-descends-wildling-victory-game-state/TheHordeDescendsWildlingVictoryGameState";
import TheHordeDescendsNightsWatchVictoryGameState, {SerializedTheHordeDescendsNightsWatchVictoryGameState} from "./the-horde-descends-nights-watch-victory-game-state/TheHordeDescendsNightsWatchVictoryGameState";

export default class WildlingAttackGameState extends GameState<WesterosGameState,
    BiddingGameState<WildlingAttackGameState> | SimpleChoiceGameState | PreemptiveRaidWildlingVictoryGameState
    | CrowKillersWildlingVictoryGameState | CrowKillersNightsWatchVictoryGameState
    | RattleshirtsRaidersWildlingVictoryGameState | MassingOnTheMilkwaterWildlingVictoryGameState
    | AKingBeyondTheWallWildlingVictoryGameState | AKingBeyondTheWallNightsWatchVictoryGameState
    | MammothRidersWildlingVictoryGameState | MammothRidersNightsWatchVictoryGameState
    | TheHordeDescendsWildlingVictoryGameState | TheHordeDescendsNightsWatchVictoryGameState
> {
    participatingHouses: House[];
    // Client-side, `wildlingCard` is null before the bidding phase is over
    wildlingCard: WildlingCard;
    wildlingStrength: number;
    _highestBidder: House | null;
    _lowestBidder: House | null;
    biddingResults: [number, House[]][] | null;

    get totalBid(): number {
        if (this.biddingResults == null) {
            throw new Error();
        }

        return _.sum(this.biddingResults.map(([bid, houses]) => bid * houses.length));
    }

    get nightsWatchWon(): boolean {
        return this.totalBid >= this.wildlingStrength;
    }

    get westerosGameState(): WesterosGameState {
        return this.parentGameState;
    }

    get highestBidders(): House[] {
        if (this.biddingResults == null) {
            throw new Error();
        }


        return this.biddingResults[0][1];
    }

    get lowestBidders(): House[] {
        if (this.biddingResults == null) {
            throw new Error();
        }

        return this.biddingResults[this.biddingResults.length - 1][1];
    }

    get lowestBidder(): House {
        if (!this._lowestBidder) {
            throw new Error();
        }

        return this._lowestBidder;
    }

    get highestBidder(): House {
        if (!this._highestBidder) {
            throw new Error();
        }

        return this._highestBidder;
    }

    get entireGame(): EntireGame {
        return this.westerosGameState.entireGame;
    }

    get game(): Game {
        return this.westerosGameState.game;
    }

    firstStart(wildlingStrength: number, participatingHouses: House[] = []): void {
        this.wildlingStrength = wildlingStrength;
        this.participatingHouses = participatingHouses;

        // Draw the first card from the wildling deck
        this.wildlingCard = this.game.wildlingDeck.shift() as WildlingCard;

        this.setChildGameState(new BiddingGameState(this)).firstStart(this.game.houses.values);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "reveal-wildling-card") {
            this.wildlingCard = this.game.wildlingDeck.find(c => c.id == message.wildlingCard) as WildlingCard;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    onBiddingGameStateEnd(results: [number, House[]][]): void {
        this.biddingResults = results;

        // Reveal the wildling card to the players
        this.entireGame.broadcastToClients({
            type: "reveal-wildling-card",
            wildlingCard: this.wildlingCard.id
        });

        if (this.nightsWatchWon) {
            // Wildling attack has been rebuffed
            // Check if there a single highest bidder or if there needs to be a decision from the iron throne holder
            if (this.highestBidders.length > 1) {
                this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
                    this.game.ironThroneHolder,
                    "The holder of the Iron Throne must choose between the highest bidders",
                    this.highestBidders.map(h => h.name)
                );
                return;
            }

            this.proceedNightsWatchWon(this.highestBidders[0]);
        } else {
            // Wildling attack was successful
            // Check if there a single lowest bidder or if there needs to be a decision from the iron throne holder
            if (this.lowestBidders.length > 1) {
                this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
                    this.game.ironThroneHolder,
                    "The holder of the Iron Throne must choose between the lowest bidders",
                    this.lowestBidders.map(h => h.name)
                );
                return;
            }

            this.proceedWildlingWon(this.lowestBidders[0]);
        }
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (this.nightsWatchWon) {
            this.proceedNightsWatchWon(this.highestBidders[choice]);
        } else {
            this.proceedWildlingWon(this.lowestBidders[choice]);
        }
    }

    onDecideBiggestEnd(chosen: House): void {
        if (this.nightsWatchWon) {
            this.proceedNightsWatchWon(chosen);
        } else {
            this.proceedWildlingWon(chosen);
        }
    }

    proceedNightsWatchWon(highestBidder: House): void {
        this._highestBidder = highestBidder;

        this.wildlingCard.type.executeNightsWatchWon(this);
    }

    proceedWildlingWon(lowestBidder: House): void {
        this._lowestBidder = lowestBidder;

        this.wildlingCard.type.executeWildlingWon(this);
    }

    onWildlingCardExecuteEnd(): void {
        // Bury the wildling card
        this.game.wildlingDeck.push(this.wildlingCard);

        // Change the wildling strength based on the result of wildling attack
        if (this.nightsWatchWon) {
            this.game.wildlingStrength = 0;
        } else {
            this.game.wildlingStrength = Math.max(0, this.game.wildlingStrength - 2);
        }
        this.entireGame.broadcastToClients({
            type: "change-wildling-strength",
            wildlingStrength: this.game.wildlingStrength
        });

        this.westerosGameState.onWildlingAttackGameStateEnd();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedWildlingAttackGameState {
        return {
            type: "wildling-attack",
            wildlingStrength: this.wildlingStrength,
            childGameState: this.childGameState.serializeToClient(admin, player),
            participatingHouses: this.participatingHouses.map(h => h.id),
            // Only give the wildling card after the bidding phase
            wildlingCard: this.biddingResults ? this.wildlingCard.id : null,
            biddingResults: this.biddingResults ? this.biddingResults.map(([bid, houses]) => ([bid, houses.map(h => h.id)])) : null,
            lowestBidder: this._lowestBidder ? this._lowestBidder.id : null,
            highestBidder: this._highestBidder ? this._highestBidder.id : null
        };
    }

    static deserializeFromServer(westerosGameState: WesterosGameState, data: SerializedWildlingAttackGameState): WildlingAttackGameState {
        const wildlingAttackGameState = new WildlingAttackGameState(westerosGameState);

        wildlingAttackGameState.wildlingStrength = data.wildlingStrength;
        wildlingAttackGameState.participatingHouses = data.participatingHouses.map(hid => westerosGameState.game.houses.get(hid));
        wildlingAttackGameState.childGameState = wildlingAttackGameState.deserializeChildGameState(data.childGameState);
        if (data.wildlingCard) {
            wildlingAttackGameState.wildlingCard = wildlingAttackGameState.game.wildlingDeck.find(c => c.id == data.wildlingCard) as WildlingCard;
        }
        wildlingAttackGameState.biddingResults = data.biddingResults ? data.biddingResults.map(([bid, hids]) => ([bid, hids.map(hid => westerosGameState.game.houses.get(hid))])) : null;
        wildlingAttackGameState._lowestBidder = data.lowestBidder ? westerosGameState.game.houses.get(data.lowestBidder) : null;
        wildlingAttackGameState._highestBidder = data.highestBidder ? westerosGameState.game.houses.get(data.highestBidder) : null;


        return wildlingAttackGameState;
    }

    deserializeChildGameState(data: SerializedWildlingAttackGameState["childGameState"]): WildlingAttackGameState["childGameState"] {
        switch(data.type) {
            case "bidding":
                return BiddingGameState.deserializeFromServer(this, data);
            case "crow-killers-wildling-victory":
                return CrowKillersWildlingVictoryGameState.deserializeFromServer(this, data);
            case "preemptive-raid-wildling-victory":
                return PreemptiveRaidWildlingVictoryGameState.deserializeFromServer(this, data);
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "crow-killers-nights-watch-victory":
                return CrowKillersNightsWatchVictoryGameState.deserializeFromServer(this, data);
            case "rattleshirts-raiders-wildling-victory":
                return RattleshirtsRaidersWildlingVictoryGameState.deserializeFromServer(this, data);
            case "massing-on-the-milkwater-wildling-victory":
                return MassingOnTheMilkwaterWildlingVictoryGameState.deserializeFromServer(this, data);
            case "a-king-beyond-the-wall-wildling-victory":
                return AKingBeyondTheWallWildlingVictoryGameState.deserializeFromServer(this, data);
            case "a-king-beyond-the-wall-nights-watch-victory":
                return AKingBeyondTheWallNightsWatchVictoryGameState.deserializeFromServer(this, data);
            case "mammoth-riders-nights-watch-victory":
                return MammothRidersNightsWatchVictoryGameState.deserializeFromServer(this, data);
            case "mammoth-riders-wildling-victory":
                return MammothRidersWildlingVictoryGameState.deserializeFromServer(this, data);
            case "the-horde-descends-wildling-victory":
                return TheHordeDescendsWildlingVictoryGameState.deserializeFromServer(this, data);
            case "the-horde-descends-nights-watch-victory":
                return TheHordeDescendsNightsWatchVictoryGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedWildlingAttackGameState {
    type: "wildling-attack";
    wildlingStrength: number;
    participatingHouses: string[];
    childGameState: SerializedBiddingGameState | SerializedSimpleChoiceGameState | SerializedPreemptiveRaidWildlingVictoryGameState
        | SerializedCrowKillersWildlingVictoryGameState | SerializedCrowKillersNightsWatchVictoryGameState
        | SerializedRattleshirtsRaidersWildlingVictoryGameState | SerializedMassingOnTheMilkwaterWildlingVictoryGameState
        | SerializedAKingBeyondTheWallWildlingVictoryGameState | SerializedAKingBeyondTheWallNightsWatchVictoryGameState
        | SerializedMammothRidersWildlingVictoryGameState | SerializedMammothRidersNightsWatchVictoryGameState
        | SerializedTheHordeDescendsWildlingVictoryGameState | SerializedTheHordeDescendsNightsWatchVictoryGameState;
    wildlingCard: number | null;
    biddingResults: [number, string[]][] | null;
    highestBidder: string | null;
    lowestBidder: string | null;
}
