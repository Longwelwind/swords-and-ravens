import GameState from "../../../../../GameState";
import Region from "../../../../game-data-structure/Region";
import { footman, knight } from "../../../../game-data-structure/unitTypes";
import Unit from "../../../../game-data-structure/Unit";
import House from "../../../../game-data-structure/House";
import Game from "../../../../game-data-structure/Game";
import ExecuteLoanGameState from "../ExecuteLoanGameState";
import IngameGameState from "../../../../IngameGameState";
import BetterMap from "../../../../../../utils/BetterMap";
import { ServerMessage } from "../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import User from "../../../../../../server/User";
import _ from "lodash";
import { observable } from "mobx";

export default class TheFacelessMenGameState extends GameState<ExecuteLoanGameState> {
    @observable house: House;

    get game(): Game {
        return this.parentGameState.game;
    }

    get executeLoanGameState(): ExecuteLoanGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get availableUnits(): Unit[] {
        return _.flatMap(this.game.world.regions.values.map(r => r.units.values)).filter(u => u.type == footman || u.type == knight);
    }

    firstStart(house: House): void {
        this.house = house;

        if (this.availableUnits.length == 0) {
            this.ingame.log({
                type: "the-faceless-men-units-destroyed",
                house: this.house.id,
                units: []
            }, true);
            this.parentGameState.onExecuteLoanFinish(house);
        }
    }

    onServerMessage(_: ServerMessage): void {
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-units") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const destroyedUnits = new BetterMap(message.units.map(([rid, uids]) => {
                const region = this.game.world.regions.get(rid);
                const units = uids.map(uid => region.units.get(uid));

                return [region, units];
            }));

            const flatUnits = _.flatMap(destroyedUnits.values);
            // Check there is a maximum of 1 footman and 1 knight
            if (flatUnits.filter(u => u.type == footman).length > 1
                || flatUnits.filter(u => u.type == knight).length > 1
                || destroyedUnits.values.some(units => units.length != 1)) {
                return;
            }

            destroyedUnits.forEach((units, region) => {
                units.forEach(unit => {
                    region.units.delete(unit.id);
                });

                this.ingame.broadcastRemoveUnits(region, units);
            });

            this.ingame.log({
                type: "the-faceless-men-units-destroyed",
                house: this.house.id,
                units: destroyedUnits.entries.map(([region, units]) => ({
                    regionId: region.id,
                    houseId: units[0].allegiance.id,
                    unitTypeId: units[0].type.id
                }))
            });

            this.parentGameState.onExecuteLoanFinish(this.house);
        }
    }

    sendSelectUnits(selectedUnits: [Region, Unit][]): void {
        this.entireGame.sendMessageToServer({
            type: "select-units",
            units: selectedUnits.map(([region, unit]) => [
                region.id,
                [unit.id]
            ])
        });
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedTheFacelessMenGameState {
        return {
            type: "the-faceless-men",
            house: this.house.id
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedTheFacelessMenGameState): TheFacelessMenGameState {
        const gameState = new TheFacelessMenGameState(parent);

        gameState.house = parent.game.houses.get(data.house);

        return gameState;
    }
}

export interface SerializedTheFacelessMenGameState {
    type: "the-faceless-men";
    house: string;
}
