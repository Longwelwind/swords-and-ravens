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
import IngameGameState from "../../../../../../IngameGameState";
import { cerseiLannister } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import Order from "../../../../../../game-data-structure/Order";

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

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
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

            if (availableRegions.length == 0) {
                this.ingame.log({
                    type: "cersei-lannister-no-order-available"
                });

                this.parentGameState.onHouseCardResolutionFinish(house);
                return;
            }

            this.setChildGameState(new SelectOrdersGameState(this)).firstStart(house, availableRegions, 1);
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: cerseiLannister.id
            });
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

    onSelectOrdersFinish(regions: Region[], resolvedAutomatically: boolean): void {
        // Remove the order
        regions.forEach(r => {
            const order = this.actionGameState.removeOrderFromRegion(r) as Order;

            this.ingame.log({
                type: "cersei-lannister-order-removed",
                house: this.childGameState.house.id,
                affectedHouse: this.combatGameState.getEnemy(this.childGameState.house).id,
                region: r.id,
                order: order.id
            }, resolvedAutomatically);
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
