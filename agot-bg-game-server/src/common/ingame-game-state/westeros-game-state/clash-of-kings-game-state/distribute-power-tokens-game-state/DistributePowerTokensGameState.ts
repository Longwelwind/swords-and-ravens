import GameState from "../../../../GameState";
import ClashOfKingsGameState from "../ClashOfKingsGameState";
import Player from "../../../Player";
import House from "../../../game-data-structure/House";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import * as _ from "lodash";
import EntireGame from "../../../../EntireGame";
import Game from "../../../game-data-structure/Game";
import User from "../../../../../server/User";
import BetterMap from "../../../../../utils/BetterMap";

export default class DistributePowerTokensGameState extends GameState<ClashOfKingsGameState> {
    house: House;
    bidResults: [number, House[]][];

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    get bidsOfHouses(): BetterMap<House, number> {
        const result = new BetterMap<House, number>();
        this.bidResults.forEach(([bid, houses]) => {
            houses.forEach(h => {
                result.set(h, bid);
            });
        });
        return result;
    }

    get bidOfDistributor(): number {
        return this.bidsOfHouses.get(this.house);
    }

    firstStart(house: House, bidResults: [number, House[]][]): void {
        this.house = house;
        this.bidResults = bidResults;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "distribute-power-tokens") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const powerTokensForHouses = new BetterMap(message.powerTokensForHouses.map(([hid, powerTokens]) => [this.game.houses.get(hid), powerTokens] as [House, number]));
            const newBidsOfHouses = this.bidsOfHouses;
            const bidOfDistributor = newBidsOfHouses.get(this.house);
            newBidsOfHouses.delete(this.house);

            if (bidOfDistributor == 0) {
                // This should not happen as we don't start this Game State when Targ bid 0 but we can simply handle it
                console.warn("Bid of distributer is 0!");
                this.parentGameState.onDistributePowerTokensFinish(this.bidResults, null);
                return;
            }

            // Check the sent distributions
            if (powerTokensForHouses.values.some(additionalTokens => additionalTokens < 0) // Additional tokens can't be negative
                || powerTokensForHouses.keys.includes(this.house) // House cannot adapt their own bid
                || _.sum(powerTokensForHouses.values) > bidOfDistributor) { // Sum of distributions must be less or equal to bid of house
                return;
            }

            powerTokensForHouses.entries.forEach(([house, additionalPowerTokens]) => {
                newBidsOfHouses.set(house, newBidsOfHouses.get(house) + additionalPowerTokens);
            });

            const housesPerBid = new BetterMap<number, House[]>();
            newBidsOfHouses.forEach((bid, house) => {
                if (housesPerBid.has(bid)) {
                    housesPerBid.get(bid).push(house);
                } else {
                    housesPerBid.set(bid, [house]);
                }
            });

            const newBidResults = _.sortBy(housesPerBid.entries, ([bid, _]) => -bid);
            this.parentGameState.onDistributePowerTokensFinish(newBidResults, this.house);
        }
    }

    onServerMessage(_message: ServerMessage): void {

    }

    distributePowerTokens(distributedPowerTokens: [House, number][]): void {
        this.entireGame.sendMessageToServer({
            type: "distribute-power-tokens",
            powerTokensForHouses: distributedPowerTokens.map(([house, powerTokens]) => [house.id, powerTokens] as [string, number])
        });
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedDistributePowerTokensGameState {
        return {
            type: "distribute-power-tokens",
            house: this.house.id,
            bidResults: this.bidResults.map(([bid, houses]) => ([bid, houses.map(h => h.id)]))
        };
    }

    static deserializeFromServer(clashOfKings: ClashOfKingsGameState, data: SerializedDistributePowerTokensGameState): DistributePowerTokensGameState {
        const distributeBids = new DistributePowerTokensGameState(clashOfKings);

        distributeBids.house = clashOfKings.game.houses.get(data.house);
        distributeBids.bidResults = data.bidResults.map(([bid, houseIds]) => ([bid, houseIds.map((hid => clashOfKings.game.houses.get(hid)))]));

        return distributeBids;
    }
}

export interface SerializedDistributePowerTokensGameState {
    type: "distribute-power-tokens";
    house: string;
    bidResults: [number, string[]][];
}
