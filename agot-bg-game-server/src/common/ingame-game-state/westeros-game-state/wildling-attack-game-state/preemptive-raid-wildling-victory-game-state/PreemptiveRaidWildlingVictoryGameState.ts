import WildlingAttackGameState from "../WildlingAttackGameState";
import GameState from "../../../../GameState";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../game-data-structure/Game";
import House from "../../../game-data-structure/House";
import * as _ from "lodash";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../select-units-game-state/SelectUnitsGameState";
import Unit from "../../../game-data-structure/Unit";
import Region from "../../../game-data-structure/Region";
import IngameGameState from "../../../IngameGameState";

enum PreemptiveRaidStep {
    CHOOSING,
    DESTROYING_UNITS,
    REDUCING_INFLUENCE_TRACKS
}

export default class PreemptiveRaidWildlingVictoryGameState extends GameState<WildlingAttackGameState, SimpleChoiceGameState | SelectUnitsGameState<PreemptiveRaidWildlingVictoryGameState>> {
    step: PreemptiveRaidStep = PreemptiveRaidStep.CHOOSING;

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    get highestInfluenceTracks(): number[] {
        const highestPosition = _.min(this.game.influenceTracks.map(t => t.indexOf(this.parentGameState.lowestBidder)));

        const highestTracks: number[] = [];
        this.game.influenceTracks.forEach((track, i) => {
            if (track.indexOf(this.parentGameState.lowestBidder as House) == highestPosition) {
                highestTracks.push(i);
            }
        });
        return highestTracks;
    }

    firstStart(): void {
        if (!this.parentGameState.lowestBidder) {
            throw new Error();
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            this.parentGameState.lowestBidder,
            "The lowest bidder chooses",
            ["Destroy 2 of his units", "Reduce position on his highest influence track"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (this.step == PreemptiveRaidStep.CHOOSING) {
            if (choice == 0) {
                this.step = PreemptiveRaidStep.DESTROYING_UNITS;

                // Lowest bidder must select two of his units.
                this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
                    this.parentGameState.lowestBidder,
                    this.game.world.getUnitsOfHouse(this.parentGameState.lowestBidder),
                    2
                );
            } else if (choice == 1) {
                const highestInfluenceTracks = this.highestInfluenceTracks;

                if (highestInfluenceTracks.length > 1) {
                    // If the lowest bidder has multiple "highest" influence tracks, the iron
                    // throne holder chooses one.
                    this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
                        this.game.ironThroneHolder,
                        "The holder of the Iron Throne chooses which influence tracks will be reduced",
                        highestInfluenceTracks.map(i => this.game.getNameInfluenceTrack(i))
                    );
                } else {
                    this.proceedReduceInfluenceTrack();
                }
                this.step = PreemptiveRaidStep.REDUCING_INFLUENCE_TRACKS;
            }
        } else if (this.step == PreemptiveRaidStep.REDUCING_INFLUENCE_TRACKS) {
            this.proceedReduceInfluenceTrack(choice);
        }
    }

    onSelectUnitsEnd(house: House, units: [Region, Unit[]][]): void {
        // Kill those 2 units
        units.forEach(([region, units]) => {
            units.forEach(u => region.units.delete(u.id));

            this.entireGame.broadcastToClients({
                type: "remove-units",
                regionId: region.id,
                unitIds: units.map(u => u.id)
            });
        });

        this.parentGameState.onWildlingCardExecuteEnd();
    }

    proceedReduceInfluenceTrack(influenceTrack = 0): void {
        const tracker = this.game.getInfluenceTrackByI(influenceTrack);

        const currentPosition = tracker.indexOf(this.parentGameState.lowestBidder);

        tracker.splice(currentPosition, 1);
        // If currentPosition == tracker.length, splice will correctly consider
        // "currentPosition + 1" to be tracker.length (and thus not changing anything).
        tracker.splice(currentPosition + 1, 0, this.parentGameState.lowestBidder);

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: influenceTrack,
            tracker: tracker.map(h => h.id)
        })
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPreemptiveRaidWildlingVictoryGameState {
        return {
            type: "preemptive-raid-wildling-victory",
            step: this.step,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(wildlingAttack: WildlingAttackGameState, data: SerializedPreemptiveRaidWildlingVictoryGameState): PreemptiveRaidWildlingVictoryGameState {
        const preemptiveRaidWildlingVictory = new PreemptiveRaidWildlingVictoryGameState(wildlingAttack);

        preemptiveRaidWildlingVictory.childGameState = preemptiveRaidWildlingVictory.deserializeChildGameState(data.childGameState);
        preemptiveRaidWildlingVictory.step = data.step;

        return preemptiveRaidWildlingVictory;
    }

    deserializeChildGameState(data: SerializedPreemptiveRaidWildlingVictoryGameState["childGameState"]): PreemptiveRaidWildlingVictoryGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-units") {
            return SelectUnitsGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedPreemptiveRaidWildlingVictoryGameState {
    type: "preemptive-raid-wildling-victory";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectUnitsGameState;
    step: PreemptiveRaidStep;
}
