import GameState from "../../../../../../GameState";
import ImmediatelyHouseCardAbilitiesResolutionGameState from "../ImmediatelyHouseCardAbilitiesResolutionGameState";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import SelectOrdersGameState, {SerializedSelectOrdersGameState} from "../../../../../select-orders-game-state/SelectOrdersGameState";
import Game from "../../../../../game-data-structure/Game";
import Region from "../../../../../game-data-structure/Region";
import ActionGameState from "../../../../ActionGameState";
import House from "../../../../../game-data-structure/House";
import CombatGameState from "../../CombatGameState";
import IngameGameState from "../../../../../IngameGameState";
import Order from "../../../../../../../common/ingame-game-state/game-data-structure/Order";

export default class QueenOfThornsAbilityGameState extends GameState<
    ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"],
    SelectOrdersGameState<QueenOfThornsAbilityGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get actionGameState(): ActionGameState {
        return this.combatGameState.actionGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        const removableOrders = this.getRemovableOrders(house);

        if (removableOrders.length > 0) {
            this.setChildGameState(new SelectOrdersGameState(this)).firstStart(house, removableOrders, 1);
        } else {
            this.ingame.log({
                type: "queen-of-thorns-no-order-available",
                house: house.id,
                affectedHouse: this.combatGameState.getEnemy(house).id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    getRemovableOrders(house: House): Region[] {
        const enemy = this.combatGameState.getEnemy(house);

        return this.game.world.getNeighbouringRegions(this.combatGameState.defendingRegion)
            // Remove regions that don't contain an order
            .filter(r => this.actionGameState.ordersOnBoard.has(r))
            .map(r => ({r, o: this.actionGameState.ordersOnBoard.get(r)}))
            // Remove regions that don't belong to the enemy
            .filter(({r}) => r.getController() == enemy)
            // Remove the attacking regions (which contain the original march order)
            .filter(({r}) => r != this.combatGameState.attackingRegion)
            .map(({r}) => r);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedQueenOfThornsAbilityGameState {
        return {
            type: "queen-of-thorns",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    onSelectOrdersFinish(regions: Region[]): void {
        regions.forEach(region => {
            const removedOrder = this.actionGameState.removeOrderFromRegion(region) as Order;

            this.ingame.log({
                type: "queen-of-thorns-order-removed",
                house: this.childGameState.house.id,
                affectedHouse: this.combatGameState.getEnemy(this.childGameState.house).id,
                orderRemoved: removedOrder.id,
                region: region.id
            });
        });

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    static deserializeFromServer(houseCardResolution: ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], data: SerializedQueenOfThornsAbilityGameState): QueenOfThornsAbilityGameState {
        const queenOfThornsAbility = new QueenOfThornsAbilityGameState(houseCardResolution);

        queenOfThornsAbility.childGameState = queenOfThornsAbility.deserializeChildGameState(data.childGameState);

        return queenOfThornsAbility;
    }

    deserializeChildGameState(data: SerializedQueenOfThornsAbilityGameState["childGameState"]): SelectOrdersGameState<QueenOfThornsAbilityGameState> {
        return SelectOrdersGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedQueenOfThornsAbilityGameState {
    type: "queen-of-thorns";
    childGameState: SerializedSelectOrdersGameState;
}
