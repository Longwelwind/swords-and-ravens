import GameState from "../../../../GameState";
import ClashOfKingsGameState from "../ClashOfKingsGameState";
import Player from "../../../Player";
import House from "../../../game-data-structure/House";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import * as _ from "lodash";
import EntireGame from "../../../../EntireGame";
import Game from "../../../game-data-structure/Game";

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

    firstStart(bidResults: [number, House[]][]) {
        this.bidResults = bidResults;
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
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

            // Create the final order of the track
            let tieProgression = -1;
            const finalOrdering = _.flatten(
                this.bidResults.map(([bid, houses]) => {
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

    onServerMessage(message: ServerMessage) {

    }

    resolveTies(resolvedTies: House[][]) {
        this.entireGame.sendMessageToServer({
            type: "resolve-ties",
            resolvedTies: resolvedTies.map(houses => houses.map(h => h.id))
        });
    }

    getTiesToResolve(): {trackerPlace: number; houses: House[]}[] {
        return this.bidResults
            .map(([bid, houses], i) => {
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
                    trackerPlace: _.sum(this.bidResults.slice(0, i).map(([bid, houses]) => houses.length)),
                    houses: houses
                });
            })
            .filter(({trackerPlace, houses}) => houses.length > 1);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveTiesGameState {
        return {
            type: "resolve-ties",
            bidResults: this.bidResults.map(([bid, houses]) => ([bid, houses.map(h => h.id)]))
        };
    }

    static deserializeFromServer(clashOfKings: ClashOfKingsGameState, data: SerializedResolveTiesGameState) {
        const resolveTies = new ResolveTiesGameState(clashOfKings);

        resolveTies.bidResults = data.bidResults.map(([bid, houseIds]) => ([bid, houseIds.map((hid => clashOfKings.game.houses.get(hid)))]));

        return resolveTies;
    }
}

export interface SerializedResolveTiesGameState {
    type: "resolve-ties";
    bidResults: [number, string[]][];
}
