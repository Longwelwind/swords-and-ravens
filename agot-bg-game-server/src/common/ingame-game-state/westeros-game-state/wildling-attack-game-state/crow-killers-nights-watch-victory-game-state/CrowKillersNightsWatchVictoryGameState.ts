import GameState from "../../../../GameState";
import WildlingAttackGameState from "../WildlingAttackGameState";
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

export default class CrowKillersNightsWatchVictoryGameState extends GameState<WildlingAttackGameState, SelectUnitsGameState<CrowKillersNightsWatchVictoryGameState>> {

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        const house = this.parentGameState.highestBidder;
        let count = 2;

        const availableFootmen = this.getAllFootmen();

        count = Math.min(count, availableFootmen.length);

        const availableKnights = this.game.getAvailableUnitsOfType(house, knight);

        count = Math.min(count, availableKnights);

        if (count == 0) {
            this.parentGameState.onWildlingCardExecuteEnd();
            return;
        }

        this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
            this.parentGameState.highestBidder,
            this.getAllFootmen(),
            2
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
            this.transformIntoKnight(house, region, footmen);
        });

        this.parentGameState.onWildlingCardExecuteEnd();
    }

    transformIntoKnight(house: House, region: Region, footmenToRemove: Unit[]): void {
        footmenToRemove.forEach(u => region.units.delete(u.id));

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: region.id,
            unitIds: footmenToRemove.map(k => k.id)
        });

        // Replace them by footman
        const knightsToAdd = footmenToRemove.map(_ => this.game.createUnit(knight, house));

        knightsToAdd.forEach(u => region.units.set(u.id, u));

        this.entireGame.broadcastToClients({
            type: "add-units",
            units: [[region.id, knightsToAdd.map(u => u.serializeToClient())]]
        });

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

    static deserializeFromServer(parent: WildlingAttackGameState, data: SerializedCrowKillersNightsWatchVictoryGameState): CrowKillersNightsWatchVictoryGameState {
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
