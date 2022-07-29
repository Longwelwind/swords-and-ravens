import GameState from "../../../../GameState";
import Region from "../../../game-data-structure/Region";
import Player from "../../../Player";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import IngameGameState from "../../../IngameGameState";
import EntireGame from "../../../../EntireGame";
import House from "../../../game-data-structure/House";
import Game from "../../../game-data-structure/Game";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../simple-choice-game-state/SimpleChoiceGameState";
import BetterMap from "../../../../../utils/BetterMap";
import ResolveMarchOrderGameState from "../ResolveMarchOrderGameState";
import _ from "lodash";

export default class CallForSupportAgainstNeutralForceGameState extends GameState<ResolveMarchOrderGameState, SimpleChoiceGameState> {
    houseThatResolvesMarchOrder: House;
    possibleSupportersPerRegion: BetterMap<Region, House[]>;
    supportersPerRegion: BetterMap<Region, House[]> = new BetterMap();
    currentRegion: Region;

    get ingame(): IngameGameState {
        return this.parentGameState.ingameGameState;
    }

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    firstStart(houseThatResolvesMarchOrder: House, possibleSupportersPerRegion: BetterMap<Region, House[]>): void {
        if (possibleSupportersPerRegion.size == 0 || possibleSupportersPerRegion.values.some(houses => houses.length == 0)) {
            throw new Error("CallForSupportAgainstNeutralForceGameState called but no possibleSupportersPerRegion");
        }
        this.houseThatResolvesMarchOrder = houseThatResolvesMarchOrder;
        this.possibleSupportersPerRegion = possibleSupportersPerRegion;
        this.currentRegion = this.possibleSupportersPerRegion.keys[0];

        const next = this.getNextHouseToCallForSupport();
        if (!next) {
            throw new Error();
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(next.house,
            `House ${next.house.name} may provide support against the Neutral Force in ${next.region.name}.`,
            ["Grant support", "Refuse support"]);
    }

    getNextHouseToCallForSupport(): { house: House, region: Region } | null {
        while (true) {
            const housesOfCurrentRegion = this.possibleSupportersPerRegion.get(this.currentRegion);
            if (housesOfCurrentRegion.length > 0) {
                const nextHouse = housesOfCurrentRegion[0];
                _.pull(housesOfCurrentRegion, nextHouse);
                this.possibleSupportersPerRegion.set(this.currentRegion, housesOfCurrentRegion);
                return { house: nextHouse, region: this.currentRegion };
            } else {
                this.possibleSupportersPerRegion.delete(this.currentRegion);
                if (this.possibleSupportersPerRegion.size > 0) {
                    this.currentRegion = this.possibleSupportersPerRegion.keys[0];
                } else {
                    return null;
                }
            }
        }
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (choice == 0) {
            if (!this.supportersPerRegion.has(this.currentRegion)) {
                this.supportersPerRegion.set(this.currentRegion, []);
            }

            this.supportersPerRegion.set(this.currentRegion,
                _.concat(this.supportersPerRegion.get(this.currentRegion), this.childGameState.house));

            this.ingame.log({
                type: "support-attack-against-neutral-force",
                house: this.houseThatResolvesMarchOrder.id,
                supporter: this.childGameState.house.id,
                region: this.currentRegion.id
            });
        } else {
            this.ingame.log({
                type: "support-attack-against-neutral-force",
                house: this.houseThatResolvesMarchOrder.id,
                supporter: this.childGameState.house.id,
                region: this.currentRegion.id,
                refused: true
            });
        }

        const next = this.getNextHouseToCallForSupport();

        if (next) {
            this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(next.house,
                `House ${next.house.name} may provide support against the Neutral Force in ${next.region.name}.`,
                ["Grant support", "Refuse support"]);
        } else {
            this.parentGameState.onCallForSupportAgainstNeutralForceGameStateEnd(this.houseThatResolvesMarchOrder, this.supportersPerRegion);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedCallForSupportAgainstNeutralForceGameState {
        return {
            type: "call-for-support-against-neutral-force",
            houseThatResolvesMarchOrder: this.houseThatResolvesMarchOrder.id,
            possibleSupportersPerRegion: this.possibleSupportersPerRegion.entries.map(([r, houses]) => [r.id, houses.map(h => h.id)]),
            supportersPerRegion: this.supportersPerRegion.entries.map(([r, houses]) => [r.id, houses.map(h => h.id)]),
            currentRegion: this.currentRegion.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void {
    }

    static deserializeFromServer(parentGameState: ResolveMarchOrderGameState, data: SerializedCallForSupportAgainstNeutralForceGameState): CallForSupportAgainstNeutralForceGameState {
        const callForSupportAgainstNeutralForceGameState = new CallForSupportAgainstNeutralForceGameState(parentGameState);
        callForSupportAgainstNeutralForceGameState.houseThatResolvesMarchOrder = parentGameState.game.houses.get(data.houseThatResolvesMarchOrder);
        callForSupportAgainstNeutralForceGameState.possibleSupportersPerRegion = new BetterMap(
            data.possibleSupportersPerRegion.map(([rid, hids]) =>
            [parentGameState.world.regions.get(rid), hids.map(hid => parentGameState.game.houses.get(hid))])
        );
        callForSupportAgainstNeutralForceGameState.supportersPerRegion = new BetterMap(
            data.supportersPerRegion.map(([rid, hids]) =>
            [parentGameState.world.regions.get(rid), hids.map(hid => parentGameState.game.houses.get(hid))])
        );
        callForSupportAgainstNeutralForceGameState.currentRegion = parentGameState.world.regions.get(data.currentRegion);
        callForSupportAgainstNeutralForceGameState.childGameState = callForSupportAgainstNeutralForceGameState.deserializeChildGameState(data.childGameState);
        return callForSupportAgainstNeutralForceGameState;
    }

    deserializeChildGameState(data: SerializedCallForSupportAgainstNeutralForceGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedCallForSupportAgainstNeutralForceGameState {
    type: "call-for-support-against-neutral-force";
    houseThatResolvesMarchOrder: string;
    possibleSupportersPerRegion: [string, string[]][];
    supportersPerRegion: [string, string[]][];
    currentRegion: string;
    childGameState: SerializedSimpleChoiceGameState;
}
