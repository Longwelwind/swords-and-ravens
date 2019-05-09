import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import GameState from "../../GameState";
import {ServerMessage} from "../../../messages/ServerMessage";
import Game from "../game-data-structure/Game";
import Region from "../game-data-structure/Region";
import Unit from "../game-data-structure/Unit";
import House from "../game-data-structure/House";
import * as _ from "lodash";
import BetterMap from "../../../utils/BetterMap";

interface SelectUnitsParentGameState extends GameState<any, any> {
    game: Game;
    onSelectUnitsEnd: (house: House, selectedUnit: [Region, Unit[]][]) => void;
}

export default class SelectUnitsGameState extends GameState<SelectUnitsParentGameState> {
    house: House;
    possibleUnits: Unit[];
    count: number;

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(house: House, possibleUnits: Unit[], count: number): void {
        this.house = house;
        this.possibleUnits = possibleUnits;
        this.count = count;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-units") {
            if (player.house != this.house) {
                return;
            }

            const units: [Region, Unit[]][] = message.units.map(([rid, uids]) => {
                const region = this.game.world.regions.get(rid);
                const units = uids.map(uid => region.units.get(uid));

                return [region, units];
            });

            // Check if the user has selected a correct amount of units.
            // There might not be enough units to select, so compute the number of available
            // units to check.
            const countSelectedUnits = _.sum(units.map(([_region, units]) => units.length));

            if (countSelectedUnits != Math.min(this.count, this.possibleUnits.length)) {
                return;
            }

            if (!units.every(([_r, u]) => u.every(u => this.canPickUnit(u)))) {
                return;
            }

            this.parentGameState.onSelectUnitsEnd(this.house, units);
        }
    }

    selectUnits(units: BetterMap<Region, Unit[]>): void {
        this.entireGame.sendMessageToServer({
            type: "select-units",
            units: units.map((region, units) => [region.id, units.map(u => u.id)])
        });
    }

    onServerMessage(_message: ServerMessage): void { }

    canPickUnit(u: Unit): boolean {
        return this.possibleUnits.includes(u);
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSelectUnitsGameState {
        return {
            type: "select-units",
            house: this.house.id,
            possibleUnits: this.possibleUnits.map(u => u.id),
            count: this.count
        };
    }

    static deserializeFromServer(parent: SelectUnitsParentGameState, data: SerializedSelectUnitsGameState): SelectUnitsGameState {
        const selectUnits = new SelectUnitsGameState(parent);

        selectUnits.house = parent.game.houses.get(data.house);
        selectUnits.possibleUnits = data.possibleUnits.map(uid => parent.game.world.getUnitById(uid));
        selectUnits.count = data.count;

        return selectUnits;
    }
}

export interface SerializedSelectUnitsGameState {
    type: "select-units";
    house: string;
    possibleUnits: number[];
    count: number;
}
