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
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";

interface SelectUnitsParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;
    onSelectUnitsEnd: (house: House, selectedUnit: [Region, Unit[]][]) => void;
}

export default class SelectUnitsGameState<P extends SelectUnitsParentGameState> extends GameState<P> {
    house: House;
    possibleUnits: Unit[];
    count: number;
    canBeSkipped: boolean;

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(house: House, possibleUnits: Unit[], count: number, canBeSkipped = false): void {
        if (count > possibleUnits.length) {
            throw new Error("User has to select more units than possible and therefore SelectUnitsGameState will never end!");
        }

        if (!canBeSkipped && possibleUnits.length == count) {
            this.parentGameState.onSelectUnitsEnd(house, this.convertPossibleUnitsForOnSelectUnitsEnd(possibleUnits));
            return;
        }

        this.house = house;
        this.possibleUnits = possibleUnits;
        this.count = count;
        this.canBeSkipped = canBeSkipped;
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

            if (!this.selectedCountMatchesExpectedCount(units)) {
                return;
            }

            if (!units.every(([_r, u]) => u.every(u => this.canPickUnit(u)))) {
                return;
            }

            this.parentGameState.onSelectUnitsEnd(this.house, units);
        }
    }

    selectedCountMatchesExpectedCount(selectedUnits: [Region, Unit[]][]): boolean {
        // Check if the user has selected a correct amount of units.
        // There might not be enough units to select, so compute the number of available
        // units to check.
        const selectedUnitsCount = _.sum(selectedUnits.map(([_region, units]) => units.length));
        const possibleSelectCount = Math.min(this.count, this.possibleUnits.length);

        if (this.canBeSkipped) {
            return selectedUnitsCount <= possibleSelectCount;
        } else {
            return selectedUnitsCount == possibleSelectCount;
        }
    }

    selectUnits(units: BetterMap<Region, Unit[]>): void {
        this.entireGame.sendMessageToServer({
            type: "select-units",
            units: units.map((region, units) => [region.id, units.map(u => u.id)])
        });
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    onServerMessage(_message: ServerMessage): void { }

    canPickUnit(u: Unit): boolean {
        return this.possibleUnits.includes(u);
    }

    private convertPossibleUnitsForOnSelectUnitsEnd(units: Unit[]): [Region, Unit[]][] {
        const unitsMap = new BetterMap<Region, Unit[]>();

        units.forEach(u => {
            const r = u.region;
            const tmp = unitsMap.tryGet(r, null);
            if (tmp) {
                tmp.push(u);
                unitsMap.set(r, tmp);
            } else {
                unitsMap.set(r, Array.of(u));
            }
        });

        return unitsMap.entries;
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSelectUnitsGameState {
        return {
            type: "select-units",
            house: this.house.id,
            possibleUnits: this.possibleUnits.map(u => u.id),
            count: this.count,
            canBeSkipped: this.canBeSkipped
        };
    }

    static deserializeFromServer<P extends SelectUnitsParentGameState>(parent: P, data: SerializedSelectUnitsGameState): SelectUnitsGameState<P> {
        const selectUnits = new SelectUnitsGameState(parent);

        selectUnits.house = parent.game.houses.get(data.house);
        selectUnits.possibleUnits = data.possibleUnits.map(uid => parent.game.world.getUnitById(uid));
        selectUnits.count = data.count;
        selectUnits.canBeSkipped = data.canBeSkipped;

        return selectUnits;
    }
}

export interface SerializedSelectUnitsGameState {
    type: "select-units";
    house: string;
    possibleUnits: number[];
    count: number;
    canBeSkipped: boolean;
}
