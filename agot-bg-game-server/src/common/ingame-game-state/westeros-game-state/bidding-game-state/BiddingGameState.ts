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
import { PlayerActionType } from "../../game-data-structure/GameLog";

export interface BiddingGameStateParent extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;
    onBiddingGameStateEnd: (results: [number, House[]][]) => void;
}

export default class BiddingGameState<ParentGameState extends BiddingGameStateParent> extends GameState<ParentGameState> {
    participatingHouses: House[];
    // Client-side, this structure will only contain -1 as value.
    @observable bids: BetterMap<House, number> = new BetterMap<House, number>();
    @observable powerTokensToBid = 0;

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "bid") {
            const bid = message.powerTokens;
            if (!this.participatingHouses.includes(player.house)
                || bid < 0
                || bid > player.house.powerTokens) {
                return;
            }

            this.bids.set(player.house, bid);

            this.entireGame.sendMessageToClients(_.without(this.entireGame.users.values, player.user), {
                type: "bid-done",
                houseId: player.house.id,
                value: -1
            });

            player.user.send({
                type: "bid-done",
                houseId: player.house.id,
                value: bid
            });

            this.ingame.log({
                type: "player-action",
                house: player.house.id,
                action: PlayerActionType.BID_MADE
            });

            this.checkAndProceedEndOfBidding();
        }
    }

    checkAndProceedEndOfBidding(): boolean {
        if (this.getHousesLeftToBid().length > 0) {
            return false;
        }

        // It might happen that a player gifted Power tokens during bidding and now
        // doesn't have the amount of their bid anymore. So we need to adapt the biddings to
        // the maximum of the players power tokens, just to be sure.
        this.bids.keys.forEach(house => {
            const bid = this.bids.get(house);
            this.bids.set(house, Math.min(bid, house.powerTokens));
        });

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
        return true;
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "bid-done") {
            const house = this.game.houses.get(message.houseId);
            this.bids.set(house, message.value);
        } else if(message.type == "bidding-begin") {
            this.bids = new BetterMap();
            this.powerTokensToBid = 0;
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

    firstStart(participatingHouses: House[] = []): void {
        this.participatingHouses = participatingHouses;

        // Already make the bidding for houses that have 0 power tokens
        this.participatingHouses.forEach(h => {
            if (h.powerTokens == 0 || this.ingame.isVassalHouse(h)) {
                this.bids.set(h, 0);

                if (!this.ingame.isVassalHouse(h)) {
                    this.ingame.log({
                        type: "player-action",
                        house: h.id,
                        action: PlayerActionType.BID_MADE
                    }, true);
                }
            }
        });

        // All houses might have been fast-tracked, check if the bidding is over
        if (! this.checkAndProceedEndOfBidding()) {
            this.entireGame.broadcastToClients({
                type: "bidding-begin"
            })
        }
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

    actionAfterVassalReplacement(newVassal: House): void {
        if (this.participatingHouses.includes(newVassal)) {
            this.bids.set(newVassal, 0);
            this.ingame.entireGame.broadcastToClients({
                type: "bid-done",
                houseId: newVassal.id,
                // We can reveal the value here as it's clear vassals bid 0
                value: 0
            });
            this.checkAndProceedEndOfBidding();
        }
    }
}

export interface SerializedBiddingGameState {
    type: "bidding";
    participatingHouses: string[];
    bids: [string, number][];
}
