import WildlingsAttackGameState from "../WildlingsAttackGameState";
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
import { findOrphanedShipsAndDestroyThem } from "../../../port-helper/PortHelper";

enum PreemptiveRaidStep {
    CHOOSING,
    DESTROYING_UNITS,
    REDUCING_INFLUENCE_TRACKS
}

export default class PreemptiveRaidWildlingVictoryGameState extends GameState<WildlingsAttackGameState, SimpleChoiceGameState | SelectUnitsGameState<PreemptiveRaidWildlingVictoryGameState>> {
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
            this.ingame.log({
                type: "preemptive-raid-choice-done",
                house: this.parentGameState.lowestBidder.id,
                choice: choice
            });

            if (choice == 0) {
                this.step = PreemptiveRaidStep.DESTROYING_UNITS;

                const units = this.game.world.getUnitsOfHouse(this.parentGameState.lowestBidder);

                const destroyCount = Math.min(2, units.length);

                if (units.length > 0) {
                    this.setChildGameState(new SelectUnitsGameState(this)).firstStart(this.parentGameState.lowestBidder, units, destroyCount);
                } else {
                    this.ingame.log({
                        type: "preemptive-raid-units-killed",
                        house: this.parentGameState.lowestBidder.id,
                        units: []
                    });

                    this.parentGameState.onWildlingCardExecuteEnd();
                }
            } else if (choice == 1) {
                const highestInfluenceTracks = this.highestInfluenceTracks;

                if (highestInfluenceTracks.length > 1) {
                    // If the lowest bidder has multiple "highest" influence tracks, the iron
                    // throne holder chooses one.
                    this.step = PreemptiveRaidStep.REDUCING_INFLUENCE_TRACKS;

                    this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
                        this.game.ironThroneHolder,
                        "The holder of the Iron Throne chooses which influence tracks will be reduced",
                        highestInfluenceTracks.map(i => this.game.getNameInfluenceTrack(i))
                    );
                } else {
                    this.proceedReduceInfluenceTrack(highestInfluenceTracks[0]);
                }
            }
        } else if (this.step == PreemptiveRaidStep.REDUCING_INFLUENCE_TRACKS) {
            this.ingame.log({
                type: "ties-decided",
                house: this.game.ironThroneHolder.id
            });

            this.proceedReduceInfluenceTrack(this.highestInfluenceTracks[choice], this.game.ironThroneHolder);
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

        this.ingame.log({
            type: "preemptive-raid-units-killed",
            house: house.id,
            units: units.map(([region, units]) => [region.id, units.map(u => u.type.id)])
        });

        // After destroying an unit an orphaned ship may be present here, so try to find it and destroy it in that case
        findOrphanedShipsAndDestroyThem(this.game.world, this.ingame, null);

        this.parentGameState.onWildlingCardExecuteEnd();
    }

    proceedReduceInfluenceTrack(influenceTrackI: number, chooser: House | null = null): void {
        const tracker = this.game.getInfluenceTrackByI(influenceTrackI);

        const currentPosition = tracker.indexOf(this.parentGameState.lowestBidder);

        tracker.splice(currentPosition, 1);
        // If currentPosition == tracker.length, splice will correctly consider
        // "currentPosition + 2" to be tracker.length (and thus not changing anything).
        tracker.splice(currentPosition + 2, 0, this.parentGameState.lowestBidder);

        this.ingame.log({
            type: "preemptive-raid-track-reduced",
            house: this.parentGameState.lowestBidder.id,
            chooser: chooser ? chooser.id : null,
            trackI: influenceTrackI
        });

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: influenceTrackI,
            tracker: tracker.map(h => h.id)
        })

        this.parentGameState.onWildlingCardExecuteEnd();
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

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedPreemptiveRaidWildlingVictoryGameState): PreemptiveRaidWildlingVictoryGameState {
        const preemptiveRaidWildlingVictory = new PreemptiveRaidWildlingVictoryGameState(wildlingsAttack);

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
