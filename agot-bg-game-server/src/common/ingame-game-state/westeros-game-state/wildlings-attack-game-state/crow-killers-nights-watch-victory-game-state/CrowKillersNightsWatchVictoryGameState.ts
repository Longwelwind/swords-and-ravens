import GameState from "../../../../GameState";
import WildlingsAttackGameState from "../WildlingsAttackGameState";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../select-units-game-state/SelectUnitsGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import House from "../../../game-data-structure/House";
import Region from "../../../game-data-structure/Region";
import Unit from "../../../game-data-structure/Unit";
import {footman, knight} from "../../../game-data-structure/unitTypes";
import Game from "../../../game-data-structure/Game";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";

export default class CrowKillersNightsWatchVictoryGameState extends GameState<WildlingsAttackGameState, SelectUnitsGameState<CrowKillersNightsWatchVictoryGameState>> {

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    firstStart(): void {
        const house = this.parentGameState.highestBidder;
        let count = 2;

        const availableFootmen = this.getAllFootmen();

        count = Math.min(count, availableFootmen.length);

        const availableKnights = this.game.getAvailableUnitsOfType(house, knight);

        count = Math.min(count, availableKnights);

        if (count == 0) {
            this.ingame.log({
                type: "crow-killers-footman-upgraded",
                house: house.id,
                units: []
            });

            this.parentGameState.onWildlingCardExecuteEnd();
            return;
        }

        this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
            this.parentGameState.highestBidder,
            availableFootmen,
            count,
            true
        );
    }

    getAllFootmen(): Unit[] {
        return _.flatMap(
            this.game.world.getControlledRegions(this.parentGameState.highestBidder)
                .map(u => u.units.values.filter(u => u.type == footman))
        );
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
        selectedUnits.forEach(([region, footmen]) => {
            this.game.transformUnits(region, footmen, knight, this.entireGame);
        });

        this.ingame.log({
            type: "crow-killers-footman-upgraded",
            house: house.id,
            units: selectedUnits.map(([region, units]) => [region.id, units.map(u => u.type.id)])
        });

        this.parentGameState.onWildlingCardExecuteEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(admin: boolean, player: Player | null): SerializedCrowKillersNightsWatchVictoryGameState {
        return {
            type: "crow-killers-nights-watch-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: WildlingsAttackGameState, data: SerializedCrowKillersNightsWatchVictoryGameState): CrowKillersNightsWatchVictoryGameState {
        const crowKillersNightsWatchVictory = new CrowKillersNightsWatchVictoryGameState(parent);

        crowKillersNightsWatchVictory.childGameState = crowKillersNightsWatchVictory.deserializeChildGameState(data.childGameState);

        return crowKillersNightsWatchVictory;
    }

    deserializeChildGameState(data: SerializedCrowKillersNightsWatchVictoryGameState["childGameState"]): CrowKillersNightsWatchVictoryGameState["childGameState"] {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedCrowKillersNightsWatchVictoryGameState {
    type: "crow-killers-nights-watch-victory";
    childGameState: SerializedSelectUnitsGameState;
}
