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

export default class ResolveTiesGameState extends GameState<ClashOfKingsGameState> {
    // Sorted in descending order of bid.
    bidResults: [number, House[]][];

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    get decider(): House {
        return this.parentGameState.game.ironThroneHolder;
    }

    firstStart(bidResults: [number, House[]][]): void {
        this.bidResults = bidResults;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "resolve-ties") {
            if (player.house != this.decider) {
                return;
            }

            const resolvedTies = message.resolvedTies.map((hids) => hids.map(hid => this.game.houses.get(hid)));

            // Check if the resolved ties received are correct
            const tiesToResolve = this.getTiesToResolve();
            if (resolvedTies.length != tiesToResolve.length) {
                return;
            }

            for (let i = 0;i < tiesToResolve.length;i++) {
                if (resolvedTies[i].length != tiesToResolve[i].houses.length) {
                    return;
                }

                // Check if the two arrays contains the same element, but in different order (that is
                // the decider didn't put a house in the wrong "tie-tier").
                if (_.difference(resolvedTies[i], tiesToResolve[i].houses).length != 0) {
                    return;
                }
            }

            this.parentGameState.ingame.log({
                type: "ties-decided",
                house: this.decider.id
            });

            // Create the final order of the track
            let tieProgression = -1;
            const finalOrdering = _.flatten(
                this.bidResults.map(([_bid, houses]) => {
                    if (houses.length == 1) {
                        return houses;
                    } else {
                        // Get the choice of the iron throne holder
                        tieProgression++;
                        return resolvedTies[tieProgression];
                    }
                })
            );

            this.parentGameState.onResolveTiesGameState(this.bidResults, finalOrdering);
        }
    }

    onServerMessage(_message: ServerMessage): void {

    }

    resolveTies(resolvedTies: House[][]): void {
        this.entireGame.sendMessageToServer({
            type: "resolve-ties",
            resolvedTies: resolvedTies.map(houses => houses.map(h => h.id))
        });
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.parentGameState.ingame.getControllerOfHouse(this.decider).user];
    }

    getTiesToResolve(): {trackerPlace: number; houses: House[]}[] {
        return this.bidResults
            .map(([_bid, houses], i) => {
                // The goal is to go from:
                // [
                //   [12, [lannister, stark]],
                //   [10, [baratheon]],
                //   [5, [tyrell, martell],
                //   [0, [greyjoy]]
                // ]
                // to
                // [
                //   {trackerPlace: 0, houses: [lannister, stark]},
                //   {trackerPlace: 2, houses: [baratheon]},
                //   {trackerPlace: 3, houses: [tyrell, martel]},
                //   {trackerPlace: 5, houses: [greyjoy]},
                // ]
                return ({
                    trackerPlace: _.sum(this.bidResults.slice(0, i).map(([_bid, houses]) => houses.length)),
                    houses: houses
                });
            })
            .filter(({houses}) => houses.length > 1);
    }

    getBidOfHouse(house: House): number {
        const index = this.bidResults.findIndex(([_bid, houses]) => houses.includes(house));
        if(index > -1) {
            return this.bidResults[index][0];
        }

        return -1;
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedResolveTiesGameState {
        return {
            type: "resolve-ties",
            bidResults: this.bidResults.map(([bid, houses]) => ([bid, houses.map(h => h.id)]))
        };
    }

    static deserializeFromServer(clashOfKings: ClashOfKingsGameState, data: SerializedResolveTiesGameState): ResolveTiesGameState {
        const resolveTies = new ResolveTiesGameState(clashOfKings);

        resolveTies.bidResults = data.bidResults.map(([bid, houseIds]) => ([bid, houseIds.map((hid => clashOfKings.game.houses.get(hid)))]));

        return resolveTies;
    }
}

export interface SerializedResolveTiesGameState {
    type: "resolve-ties";
    bidResults: [number, string[]][];
}
