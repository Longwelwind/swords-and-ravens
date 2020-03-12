import GameState from "../../../GameState";
import House from "../../game-data-structure/House";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import Game from "../../game-data-structure/Game";
import * as _ from "lodash";
import {observable} from "mobx";
import BetterMap from "../../../../utils/BetterMap";
import User from "../../../../server/User";
import IngameGameState from "../../IngameGameState";

export interface BiddingGameStateParent extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;
    onBiddingGameStateEnd: (results: [number, House[]][]) => void;
}

export default class BiddingGameState<ParentGameState extends BiddingGameStateParent> extends GameState<ParentGameState> {
    participatingHouses: House[];
    // Client-side, this structure will only contain -1 as value.
    @observable bids: BetterMap<House, number> = new BetterMap<House, number>();

    get game(): Game {
        return this.parentGameState.game;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "bid") {
            if (!this.participatingHouses.includes(player.house)) {
                return;
            }

            const bid = Math.max(0, Math.min(message.powerTokens, player.house.powerTokens));
            this.bids.set(player.house, bid);

            this.entireGame.broadcastToClients({
                type: "bid-done",
                houseId: player.house.id
            });

            if (this.getHousesLeftToBid().length == 0) {
                // All players had bid

                // Remove the power tokens
                this.bids.entries.forEach(([house, bid]) => {
                    house.powerTokens -= bid;

                    this.entireGame.broadcastToClients({
                        type: "change-power-token",
                        houseId: house.id,
                        powerTokenCount: house.powerTokens
                    });
                });

                // Create a convenient array containing the results
                const housesPerBid = new BetterMap<number, House[]>();
                this.bids.forEach((bid, house) => {
                    if (housesPerBid.has(bid)) {
                        housesPerBid.get(bid).push(house);
                    } else {
                        housesPerBid.set(bid, [house]);
                    }
                });

                const results = _.sortBy(housesPerBid.entries, ([bid, _]) => -bid);

                this.parentGameState.onBiddingGameStateEnd(results);
            }
        }
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "bid-done") {
            const house = this.game.houses.get(message.houseId);
            this.bids.set(house, -1);
        }
    }

    bid(powerTokens: number): void {
        this.entireGame.sendMessageToServer({
            type: "bid",
            powerTokens: powerTokens
        });
    }

    hasBid(house: House): boolean {
        return this.bids.has(house);
    }

    getWaitedUsers(): User[] {
        return this.getHousesLeftToBid().map(h => this.parentGameState.ingame.getControllerOfHouse(h).user);
    }

    getHousesLeftToBid(): House[] {
        return _.difference(this.participatingHouses, this.bids.keys);
    }

    getPhaseName(): string {
        return "Bidding phase";
    }

    firstStart(participatingHouses: House[] = []): void {
        this.participatingHouses = participatingHouses;
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedBiddingGameState {
        return {
            type: "bidding",
            participatingHouses: this.participatingHouses.map(h => h.id),
            bids: this.bids.entries.map(([house, bid]) => {
                // If a player requested the serialized version, only give his own bid.
                // If admin, give all bid.
                if (admin || (player && house == player.house)) {
                    return [house.id, bid];
                } else {
                    return [house.id, -1];
                }
            })
        };
    }

    static deserializeFromServer<ParentGameState extends BiddingGameStateParent>(parent: ParentGameState, data: SerializedBiddingGameState): BiddingGameState<ParentGameState> {
        const biddingGameState = new BiddingGameState(parent);

        biddingGameState.participatingHouses = data.participatingHouses.map(hid => parent.game.houses.get(hid));
        biddingGameState.bids = new BetterMap(data.bids.map(([houseId, bid]) => [parent.game.houses.get(houseId), bid]));

        return biddingGameState
    }
}

export interface SerializedBiddingGameState {
    type: "bidding";
    participatingHouses: string[];
    bids: [string, number][];
}
