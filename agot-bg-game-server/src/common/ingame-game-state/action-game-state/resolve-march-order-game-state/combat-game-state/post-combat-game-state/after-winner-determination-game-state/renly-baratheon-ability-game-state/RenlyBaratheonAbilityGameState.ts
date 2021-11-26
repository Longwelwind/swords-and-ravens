import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../../../../select-units-game-state/SelectUnitsGameState";
import Game from "../../../../../../game-data-structure/Game";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import House from "../../../../../../game-data-structure/House";
import Unit from "../../../../../../game-data-structure/Unit";
import CombatGameState from "../../../CombatGameState";
import {footman, knight} from "../../../../../../game-data-structure/unitTypes";
import _ from "lodash";
import Region from "../../../../../../game-data-structure/Region";
import IngameGameState from "../../../../../../IngameGameState";
import { renlyBaratheon } from "../../../../../../game-data-structure/house-card/houseCardAbilities";

export default class RenlyBaratheonAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SelectUnitsGameState<RenlyBaratheonAbilityGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        const upgradableFootmen = this.getUpgradableFootmen(house);

        if (this.game.getAvailableUnitsOfType(house, knight) == 0) {
            this.ingame.log({
                type: "renly-baratheon-no-knight-available",
                house: house.id
            }, true);

            this.parentGameState.onHouseCardResolutionFinish(house);
        } else if (upgradableFootmen.length == 0) {
            this.ingame.log({
                type: "renly-baratheon-no-footman-available",
                house: house.id
            }, true);

            this.parentGameState.onHouseCardResolutionFinish(house);
        } else {
            this.setChildGameState(new SelectUnitsGameState(this))
                .firstStart(house, upgradableFootmen, 1, true);
        }
    }

    getUpgradableFootmen(house: House): Unit[] {
        // Assemble a list of all units belonging to the house (supporting or not), and then take the footmen among them
        const units = [...this.combatGameState.houseCombatDatas.get(house).army];
        if (this.combatGameState.supporters.tryGet(house, null) == house) {
            units.push(..._.flatMap(this.combatGameState.getPossibleSupportingRegions().map(({region}) => region).filter(region => region.getController() == house).map(r => r.units.values)))
        }

        return units.filter(u => u.type == footman);
    }

    onSelectUnitsEnd(house: House, selectedUnit: [Region, Unit[]][]): void {
        // Upgrade the footmen to a knight
        // Even tough they should be only one unit in "selectedUnit",
        // the following code is generic for all units in it.

        if (_.flatMap(selectedUnit.map(([_, u]) => u)).length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: renlyBaratheon.id
            });
        }

        const houseCombatData = this.combatGameState.houseCombatDatas.get(house);

        selectedUnit.forEach(([region, footmenToRemove]) => {
            // Replace them by knight
            const knightsToAdd = this.ingame.transformUnits(region, footmenToRemove, knight);

            if (houseCombatData.region == region) {
                // In case the footman was party of the army,
                // remove it from the army.
                houseCombatData.army = _.without(houseCombatData.army, ...footmenToRemove);

                // If the new knight is part of the attacking army,
                // it will now be part of the army
                houseCombatData.army.push(...knightsToAdd);

                this.entireGame.broadcastToClients({
                    type: "combat-change-army",
                    house: house.id,
                    region: region.id,
                    army: houseCombatData.army.map(u => u.id)
                });
            }

            this.ingame.log({
                type: "renly-baratheon-footman-upgraded-to-knight",
                house: house.id,
                region: region.id
            });
        });

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedRenlyBaratheonAbilityGameState {
        return {
            type: "renly-baratheon-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedRenlyBaratheonAbilityGameState): RenlyBaratheonAbilityGameState {
        const renlyBaratheonAbility = new RenlyBaratheonAbilityGameState(afterWinnerDeterminationChild);

        renlyBaratheonAbility.childGameState = renlyBaratheonAbility.deserializeChildGameState(data.childGameState);

        return renlyBaratheonAbility;
    }

    deserializeChildGameState(data: SerializedRenlyBaratheonAbilityGameState["childGameState"]): SelectUnitsGameState<RenlyBaratheonAbilityGameState> {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedRenlyBaratheonAbilityGameState {
    type: "renly-baratheon-ability";
    childGameState: SerializedSelectUnitsGameState;
}
