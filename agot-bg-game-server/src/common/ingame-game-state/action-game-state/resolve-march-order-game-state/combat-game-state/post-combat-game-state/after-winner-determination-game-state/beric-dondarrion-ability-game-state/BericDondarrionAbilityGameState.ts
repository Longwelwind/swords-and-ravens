import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import Game from "../../../../../../game-data-structure/Game";
import Player from "../../../../../../Player";
import { ClientMessage } from "../../../../../../../../messages/ClientMessage";
import { ServerMessage } from "../../../../../../../../messages/ServerMessage";
import House from "../../../../../../game-data-structure/House";
import Unit from "../../../../../../game-data-structure/Unit";
import PostCombatGameState from "../../PostCombatGameState";
import CombatGameState from "../../../CombatGameState";
import Region from "../../../../../../game-data-structure/Region";
import IngameGameState from "../../../../../../IngameGameState";
import _ from "lodash";
import SelectUnitsGameState, { SerializedSelectUnitsGameState } from "../../../../../../../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";

export default class BericDondarrionAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SelectUnitsGameState<BericDondarrionAbilityGameState>
> {
    house: House;
    get game(): Game {
        return this.parentGameState.game;
    }

    get postCombat(): PostCombatGameState {
        return this.parentGameState.parentGameState.parentGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.combat.ingameGameState;
    }

    firstStart(house: House): void {
        this.house = house;
        const army = this.combat.houseCombatDatas.get(house).army;
        if (army.length > 0) {
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, army, 1);
        } else {
            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
        const selectedRegion = selectedUnits[0][0];
        const selectedUnit = selectedUnits[0][1][0];

        this.combat.ingameGameState.log(
            {
                type: "beric-dondarrion-used",
                house: house.id,
                casualty: selectedUnit.type.id
            }
        );

        // Remove the selected casualties
        selectedRegion.units.delete(selectedUnit.id);
        // Remove them from the house combat datas
        const loserCombatData = this.combat.houseCombatDatas.get(house);
        loserCombatData.army = _.without(loserCombatData.army, selectedUnit);

        this.entireGame.broadcastToClients({
            type: "combat-change-army",
            region: selectedRegion.id,
            house: house.id,
            army: loserCombatData.army.map(u => u.id)
        });

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: selectedRegion.id,
            unitIds: [selectedUnit.id]
        });

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedBericDondarrionAbilityGameState {
        return {
            type: "beric-dondarrion-ability",
            childGameState: this.childGameState.serializeToClient(admin, player),
            house: this.house.id
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedBericDondarrionAbilityGameState): BericDondarrionAbilityGameState {
        const bericDondarrionAbility = new BericDondarrionAbilityGameState(afterWinnerDeterminationChild);

        bericDondarrionAbility.childGameState = bericDondarrionAbility.deserializeChildGameState(data.childGameState);
        bericDondarrionAbility.house = afterWinnerDeterminationChild.game.houses.get(data.house);

        return bericDondarrionAbility;
    }

    deserializeChildGameState(data: SerializedBericDondarrionAbilityGameState["childGameState"]): SelectUnitsGameState<BericDondarrionAbilityGameState> {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedBericDondarrionAbilityGameState {
    type: "beric-dondarrion-ability";
    childGameState: SerializedSelectUnitsGameState;
    house: string;
}
