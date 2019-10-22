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

    firstStart(house: House): void {
        const upgradableFootmen = this.getUpgradableFootmen(house);

        if (upgradableFootmen.length > 0) {
            this.setChildGameState(new SelectUnitsGameState(this))
                .firstStart(house, upgradableFootmen, 1);
        } else {
            this.parentGameState.parentGameState.onHouseCardResolutionFinish();
        }
    }

    getUpgradableFootmen(house: House): Unit[] {
        // First, get all possible regions where footmen could be upgraded, which means
        // the region where the house's army is, and regions where house was
        // supporting the combat.

        // If house is not a supporter, or didn't support himself in the combat,
        // don't take into account the supporting regions.
        const supportingRegions = this.combatGameState.supporters.has(house) && this.combatGameState.supporters.get(house)
            ? this.combatGameState.getPossibleSupportingRegions()
                .map(({region}) => region)
                .filter(region => region.getController() == house)
            : [];

        const regions = [this.combatGameState.houseCombatDatas.get(house).region].concat(supportingRegions);

        return _.flatMap(regions, region => region.units.values.filter(u => u.type == footman));
    }

    onSelectUnitsEnd(house: House, selectedUnit: [Region, Unit[]][]): void {
        // Upgrade the footmen to a knight
        // Even tough they should be only one unit in "selectedUnit",
        // the following code is generic for all units in it.
        selectedUnit.forEach(([region, footmenToRemove]) => {
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
