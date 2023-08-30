import GameState from "../../../../../../../GameState";
import AfterCombatHouseCardAbilitiesGameState from "../AfterCombatHouseCardAbilitiesGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../../game-data-structure/Game";
import CombatGameState from "../../../CombatGameState";
import House from "../../../../../../game-data-structure/House";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import ActionGameState from "../../../../../ActionGameState";
import IngameGameState from "../../../../../../IngameGameState";
import { maceTyrellASoS } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import BetterMap from "../../../../../../../../utils/BetterMap";
import orders from "../../../../../../game-data-structure/orders";
import Order from "../../../../../../game-data-structure/Order";
import { defensePlusOne, support } from "../../../../../../game-data-structure/order-types/orderTypes";
import _ from "lodash";

export default class MaceTyrellASoSAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState
> {
    activated: boolean;
    availableOrders: Order[];

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
        this.activated = false;
        this.availableOrders = this.getAvailableOrdersOfHouse(house);
        if (this.availableOrders.length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: maceTyrellASoS.id
            }, true);
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

    getAvailableOrdersOfHouse(house: House): Order[] {
        const placedOrders = new BetterMap(this.actionGameState.getOrdersOfHouse(house));
        const available = _.uniqBy(this.ingame.game.getAvailableOrders(placedOrders, house), o => o.type);
        // The restrictions say you are not allowed to place orders in the planning phase. But I think placing an order due to an ability in the action phase should be allowed.
        // return available.filter(o => !this.actionGameState.planningRestrictions.some(pr => pr.restriction(o.type)) && (o.type == support || o.type == defensePlusOne));
        // Order result list descending by type.name, so "Support" will be the first option, like on the card text
        return _.orderBy(available.filter(o => o.type == support || o.type == defensePlusOne), o => o.type.name, "desc");
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;

        if (!this.activated) {
            if (choice == 0) {
                this.activated = true;
                this.setChildGameState(new SimpleChoiceGameState(this))
                    .firstStart(
                        house,
                        "",
                        this.availableOrders.map(o => o.type.name)
                    );
                return;
            } else {
                this.ingame.log({
                    type: "house-card-ability-not-used",
                    house: house.id,
                    houseCard: maceTyrellASoS.id
                });
            }
        } else {
            const chosenOrder = this.availableOrders[choice];
            // Remove a possible order and log this for the case the defender decides to change the current order to Support or Defense
            this.combatGameState.actionGameState.removeOrderFromRegion(this.combatGameState.defendingRegion, true);
            this.combatGameState.actionGameState.ordersOnBoard.set(this.combatGameState.defendingRegion, chosenOrder);
            this.ingame.sendMessageToPlayersWhoCanSeeRegion({
                type: "action-phase-change-order",
                region: this.combatGameState.defendingRegion.id,
                order: chosenOrder.id,
                animate: "white"
            }, this.combatGameState.defendingRegion);
            this.ingame.log({
                type: "mace-tyrell-asos-order-placed",
                house: this.childGameState.house.id,
                order: chosenOrder.id,
                region: this.combatGameState.defendingRegion.id
            }, resolvedAutomatically);
        }

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedMaceTyrellASoSAbilityGameState {
        return {
            type: "mace-tyrell-asos-ability",
            activated: this.activated,
            availableOrders: this.availableOrders.map(o => o.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedMaceTyrellASoSAbilityGameState): MaceTyrellASoSAbilityGameState {
        const maceTyrellASoSAbilityGameState = new MaceTyrellASoSAbilityGameState(afterWinnerDeterminationChild);

        maceTyrellASoSAbilityGameState.activated = data.activated;
        maceTyrellASoSAbilityGameState.availableOrders = data.availableOrders.map(oid => orders.get(oid));
        maceTyrellASoSAbilityGameState.childGameState = maceTyrellASoSAbilityGameState.deserializeChildGameState(data.childGameState);

        return maceTyrellASoSAbilityGameState;
    }

    deserializeChildGameState(data: SerializedMaceTyrellASoSAbilityGameState["childGameState"]): MaceTyrellASoSAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedMaceTyrellASoSAbilityGameState {
    type: "mace-tyrell-asos-ability";
    activated: boolean;
    availableOrders: number[];
    childGameState: SerializedSimpleChoiceGameState;
}
