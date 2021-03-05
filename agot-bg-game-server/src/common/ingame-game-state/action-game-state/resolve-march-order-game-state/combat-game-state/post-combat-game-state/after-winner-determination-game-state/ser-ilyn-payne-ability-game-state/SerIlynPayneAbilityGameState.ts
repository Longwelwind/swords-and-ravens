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
import { serIlynPayne } from "../../../../../../../../common/ingame-game-state/game-data-structure/house-card/houseCardAbilities";
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

    get enemy(): House {
        return this.combatGameState.getEnemy(this.house);
    }

    firstStart(house: House): void {
        this.house = house

        if (this.combatGameState.areCasulatiesPrevented(this.enemy)) {
            // todo: Log
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this))
            .firstStart(
                house,
                "",
                ["Activate", "Ignore"]
            );
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
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

            this.entireGame.broadcastToClients({
                type: "remove-units",
                regionId: region.id,
                unitIds: units.map(u => u.id)
            });

            this.ingame.log({
                type: "ser-ilyn-payne-footman-killed",
                house: house.id,
                region: region.id
            });
        });

        if (selectedUnits.length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: this.house.id,
                houseCard: serIlynPayne.id
            });
        }

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (choice == 0) {
            const availableFootmen = this.actionGameState.getFootmenOfHouse(this.enemy);

            if (availableFootmen.length == 0) {
                this.ingame.log({
                    type: "house-card-ability-not-used",
                    house: this.house.id,
                    houseCard: serIlynPayne.id
                });
                this.parentGameState.onHouseCardResolutionFinish(this.house);
                return;
            }

            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(
                this.house,
                availableFootmen,
                1,
                true
            );
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: this.house.id,
                houseCard: serIlynPayne.id
            });
            this.parentGameState.onHouseCardResolutionFinish(this.house);
        }
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
        const serIlynPayneAbility = new SerIlynPayneAbilityGameState(afterWinnerDeterminationChild);

        serIlynPayneAbility.childGameState = serIlynPayneAbility.deserializeChildGameState(data.childGameState);

        return serIlynPayneAbility;
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
