import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../../game-data-structure/Game";
import CombatGameState from "../../../CombatGameState";
import House from "../../../../../../game-data-structure/House";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import Region from "../../../../../../game-data-structure/Region";
import ActionGameState from "../../../../../ActionGameState";
import IngameGameState from "../../../../../../IngameGameState";
import Unit from "../../../../../../game-data-structure/Unit";
import _ from "lodash";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../../../../select-units-game-state/SelectUnitsGameState";
export default class SerIlynPayneAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState | SelectUnitsGameState<SerIlynPayneAbilityGameState>
> {
    house: House
    get game(): Game {
        return this.parentGameState.game;
    }

    get actionGameState(): ActionGameState {
        return this.combatGameState.actionGameState;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        this.house = house
        this.setChildGameState(new SimpleChoiceGameState(this))
            .firstStart(
                house,
                "",
                ["Activate", "Ignore"]
            );
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

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (choice == 0) {
            const availableFootmen = this.actionGameState.getFootmenOfHouse(this.combatGameState.getEnemy(this.house));
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
                this.house,
                availableFootmen,
                1
            );
        } else {
            this.parentGameState.onHouseCardResolutionFinish(this.house);
        }
    }

    getAvailableRegionsWithOrders(house: House): Region[] {
        const enemy = this.combatGameState.getEnemy(house);

        return this.actionGameState.getOrdersOfHouse(enemy)
            // Removing the march order used for this attack.
            .filter(([region, _]) => region != this.combatGameState.attackingRegion)
            .filter(([region, _]) => region != this.combatGameState.defendingRegion)
            .map(([region, _]) => region);
    }

    onSelectOrdersFinish(regions: Region[]): void {
        // Remove the order
        regions.forEach(r => {
            const order = this.actionGameState.ordersOnBoard.get(r);
            this.actionGameState.ordersOnBoard.delete(r);

            this.actionGameState.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: r.id,
                order: null
            });

            this.ingame.log({
                type: "cersei-lannister-order-removed",
                house: this.childGameState.house.id,
                affectedHouse: this.combatGameState.getEnemy(this.childGameState.house).id,
                region: r.id,
                order: order.id
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

    serializeToClient(admin: boolean, player: Player | null): SerializedSerIlynPayneAbilityGameState {
        return {
            type: "ser-ilyn-payne-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedSerIlynPayneAbilityGameState): SerIlynPayneAbilityGameState {
        const cerseiLannisterAbility = new SerIlynPayneAbilityGameState(afterWinnerDeterminationChild);

        cerseiLannisterAbility.childGameState = cerseiLannisterAbility.deserializeChildGameState(data.childGameState);

        return cerseiLannisterAbility;
    }

    deserializeChildGameState(data: SerializedSerIlynPayneAbilityGameState["childGameState"]): SerIlynPayneAbilityGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-units":
                return SelectUnitsGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedSerIlynPayneAbilityGameState {
    type: "ser-ilyn-payne-ability";
    childGameState: SerializedSimpleChoiceGameState
        | SerializedSelectUnitsGameState;
}
