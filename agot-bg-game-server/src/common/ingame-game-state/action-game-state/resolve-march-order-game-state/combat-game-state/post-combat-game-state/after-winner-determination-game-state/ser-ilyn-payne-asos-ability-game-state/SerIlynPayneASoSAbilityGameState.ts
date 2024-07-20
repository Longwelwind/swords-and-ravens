import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
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
import { serIlynPayneASoS } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import HouseCard from "../../../../../../game-data-structure/house-card/HouseCard";

export default class SerIlynPayneASoSAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"], SelectUnitsGameState<SerIlynPayneASoSAbilityGameState>
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

    get enemy(): House {
        return this.combatGameState.getEnemy(this.house);
    }

    firstStart(house: House): void {
        this.house = house

        if (this.combatGameState.areCasualtiesPrevented(this.enemy)) {
            this.ingame.log({
                type: "casualties-prevented",
                house: this.enemy.id,
                houseCard: (this.combatGameState.houseCombatDatas.get(this.enemy).houseCard as HouseCard).id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        const enemyArmy = this.combatGameState.houseCombatDatas.get(this.enemy).army;

        if (enemyArmy.length == 0) {
            // Casualties are resolved later, but in case of an attack on a garrison, there may be no army
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: this.house.id,
                houseCard: serIlynPayneASoS.id
            }, true);
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
            this.enemy,
            enemyArmy,
            1
        );
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][], resolvedAutomatically: boolean): void {
        // There will only be one footman in "selectedUnit",
        // but the following code deals with the multiple units present.
        selectedUnits.forEach(([region, units]) => {
            // Remove them from the regions and if necessary from the army of the opponent as well
            const houseCombatData = this.combatGameState.houseCombatDatas.get(this.enemy);
            if (units.some(u => houseCombatData.army.includes(u))) {
                houseCombatData.army = _.without(houseCombatData.army, ...units);

                this.entireGame.broadcastToClients({
                    type: "combat-change-army",
                    region: region.id,
                    house: this.enemy.id,
                    army: houseCombatData.army.map(u => u.id)
                });
            }

            units.forEach(unit => {
                region.units.delete(unit.id);
            });

            this.ingame.broadcastRemoveUnits(region, units);

            this.ingame.log({
                type: "ser-ilyn-payne-asos-casualty-suffered",
                house: this.house.id,
                affectedHouse: house.id,
                unit: units[0].type.id
            }, resolvedAutomatically);
        });

        this.parentGameState.onHouseCardResolutionFinish(this.house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSerIlynPayneASoSAbilityGameState {
        return {
            type: "ser-ilyn-payne-asos-ability",
            house: this.house.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedSerIlynPayneASoSAbilityGameState): SerIlynPayneASoSAbilityGameState {
        const serIlynPayneAbility = new SerIlynPayneASoSAbilityGameState(afterWinnerDeterminationChild);

        serIlynPayneAbility.house = afterWinnerDeterminationChild.game.houses.get(data.house);
        serIlynPayneAbility.childGameState = serIlynPayneAbility.deserializeChildGameState(data.childGameState);

        return serIlynPayneAbility;
    }

    deserializeChildGameState(data: SerializedSerIlynPayneASoSAbilityGameState["childGameState"]): SerIlynPayneASoSAbilityGameState["childGameState"] {
        switch (data.type) {
            case "select-units":
                return SelectUnitsGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedSerIlynPayneASoSAbilityGameState {
    type: "ser-ilyn-payne-asos-ability";
    house: string;
    childGameState: SerializedSelectUnitsGameState;
}
