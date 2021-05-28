import ImmediatelyHouseCardAbilitiesResolutionGameState from "../ImmediatelyHouseCardAbilitiesResolutionGameState";
import GameState from "../../../../../../GameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import _ from "lodash";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../../../select-units-game-state/SelectUnitsGameState";
import Region from "../../../../../game-data-structure/Region";
import Unit from "../../../../../game-data-structure/Unit";
import {footman} from "../../../../../game-data-structure/unitTypes";
import IngameGameState from "../../../../../IngameGameState";
import groupBy from "../../../../../../../utils/groupBy";

export default class MaceTyrellAbilityGameState extends GameState<
    ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"],
        SelectUnitsGameState<MaceTyrellAbilityGameState>
    > {
    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        const enemy = this.combatGameState.getEnemy(house);
        const availableFootmen = this.getAvailableFootmen(house);

        if (availableFootmen.length == 0) {
            this.ingame.log({
                type: "mace-tyrell-no-footman-available",
                house: house.id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        } else if (this.combatGameState.areCasualtiesPrevented(enemy)) {
            this.ingame.log({
                type: "mace-tyrell-casualties-prevented",
                house: house.id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        } else {
            if (availableFootmen.every(fm => !fm.wounded) || availableFootmen.every(fm => fm.wounded)) {
                // Automatically kill one of the footmen if all are wounded or all are not wounded
                const selectedFootman = Array.of(availableFootmen[0]);
                this.onSelectUnitsEnd(house, groupBy(selectedFootman, u => u.region).entries);
            } else {
                // In case there are non-wounded and wounded footmen let the user decide which one to kill
                this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
                    house,
                    availableFootmen,
                    1
                );
            }
        }
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
        const enemy = this.combatGameState.getEnemy(house);
        // There will only be one footman in "selectedUnit",
        // but the following code deals with the multiple units present.
        selectedUnits.forEach(([region, units]) => {
            // Remove them from the regions as well as from the army of the opponent
            const houseCombatData = this.combatGameState.houseCombatDatas.get(enemy);
            houseCombatData.army = _.without(houseCombatData.army, ...units);

            units.forEach(unit => {
                region.units.delete(unit.id);
            });

            this.entireGame.broadcastToClients({
                type: "combat-change-army",
                region: region.id,
                house: enemy.id,
                army: houseCombatData.army.map(u => u.id)
            });

            this.entireGame.broadcastToClients({
                type: "remove-units",
                regionId: region.id,
                unitIds: units.map(u => u.id)
            });

            this.ingame.log({
                type: "mace-tyrell-footman-killed",
                house: house.id,
                region: region.id
            });
        });

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    getAvailableFootmen(house: House): Unit[] {
        return this.combatGameState.houseCombatDatas.get(this.combatGameState.getEnemy(house)).army.filter(u => u.type == footman);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedMaceTyrellAbilityGameState {
        return {
            type: "mace-tyrell-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], data: SerializedMaceTyrellAbilityGameState): MaceTyrellAbilityGameState {
        const maceTyrellAbilityGameState = new MaceTyrellAbilityGameState(houseCardResolution);

        maceTyrellAbilityGameState.childGameState = maceTyrellAbilityGameState.deserializeChildGameState(data.childGameState);

        return maceTyrellAbilityGameState;
    }

    deserializeChildGameState(data: SerializedMaceTyrellAbilityGameState["childGameState"]): MaceTyrellAbilityGameState["childGameState"] {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedMaceTyrellAbilityGameState {
    type: "mace-tyrell-ability";
    childGameState: SerializedSelectUnitsGameState;
}
