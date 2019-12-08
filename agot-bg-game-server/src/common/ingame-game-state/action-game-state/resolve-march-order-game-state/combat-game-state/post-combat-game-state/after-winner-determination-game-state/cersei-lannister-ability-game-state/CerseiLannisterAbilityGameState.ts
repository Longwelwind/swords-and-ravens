import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import SelectOrdersGameState, {SerializedSelectOrdersGameState} from "../../../../../../select-orders-game-state/SelectOrdersGameState";
import Game from "../../../../../../game-data-structure/Game";
import CombatGameState from "../../../CombatGameState";
import House from "../../../../../../game-data-structure/House";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import Region from "../../../../../../game-data-structure/Region";
import ActionGameState from "../../../../../ActionGameState";

export default class CerseiLannisterAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState | SelectOrdersGameState<CerseiLannisterAbilityGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get actionGameState(): ActionGameState {
        return this.combatGameState.actionGameState;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this))
            .firstStart(
                house,
                "",
                ["Activate", "Ignore"]
            );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            const availableRegions = this.getAvailableRegionsWithOrders(house);

            this.setChildGameState(new SelectOrdersGameState(this)).firstStart(house, availableRegions, 1);
        } else {
            this.parentGameState.onHouseCardResolutionFinish(house);
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
        regions.forEach(r => this.actionGameState.ordersOnBoard.delete(r));

        regions.forEach(r => {
            this.actionGameState.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: r.id,
                order: null
            })
        });

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedCerseiLannisterAbilityGameState {
        return {
            type: "cersei-lannister-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedCerseiLannisterAbilityGameState): CerseiLannisterAbilityGameState {
        const cerseiLannisterAbility = new CerseiLannisterAbilityGameState(afterWinnerDeterminationChild);

        cerseiLannisterAbility.childGameState = cerseiLannisterAbility.deserializeChildGameState(data.childGameState);

        return cerseiLannisterAbility;
    }

    deserializeChildGameState(data: SerializedCerseiLannisterAbilityGameState["childGameState"]): CerseiLannisterAbilityGameState["childGameState"] {
        switch (data.type) {
            case "select-orders":
                return SelectOrdersGameState.deserializeFromServer(this, data);
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedCerseiLannisterAbilityGameState {
    type: "cersei-lannister-ability";
    childGameState: SerializedSimpleChoiceGameState
        | SerializedSelectOrdersGameState;
}
