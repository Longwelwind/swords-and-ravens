import GameState from "../../../../../../../GameState";
import AfterCombatHouseCardAbilitiesGameState from "../AfterCombatHouseCardAbilitiesGameState";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import House from "../../../../../../game-data-structure/House";
import CombatGameState from "../../../CombatGameState";
import Game from "../../../../../../game-data-structure/Game";
import IngameGameState from "../../../../../../IngameGameState";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import { robertArryn } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import HouseCard, { HouseCardState } from "../../../../../../game-data-structure/house-card/HouseCard";
import _ from "lodash";

export default class RobertArrynAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState
> {
    get game(): Game {
        return this.combat.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get enemyHouseCardToRemove(): HouseCard | null {
        // A player enemy always has at least one card in their discard pile at this point
        // But as vassals don't have a discard pile and we never mark a vassal house card as used we have to handle this!
        const enemy = this.combat.getEnemy(this.childGameState.house);
        const enemyDiscardPile = _.sortBy(enemy.houseCards.values.filter(hc => hc.state == HouseCardState.USED), sorted => sorted.combatStrength);
        return enemyDiscardPile.length > 0 ? enemyDiscardPile[0] : null;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Activate", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            const enemy = this.combat.getEnemy(house);
            const enemyHouseCard = this.enemyHouseCardToRemove;

            house.houseCards.delete("robert-arryn");
            this.entireGame.broadcastToClients({
                type: "update-house-cards",
                house: house.id,
                houseCards: house.houseCards.keys
            });

            if (enemyHouseCard) {
                enemy.houseCards.delete(enemyHouseCard.id);
                this.entireGame.broadcastToClients({
                    type: "update-house-cards",
                    house: enemy.id,
                    houseCards: enemy.houseCards.keys
                });
            }

            this.ingame.log({
                type: "robert-arryn-used",
                house: house.id,
                affectedHouse: enemy.id,
                removedHouseCard: enemyHouseCard ? enemyHouseCard.id : null
            });
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: robertArryn.id
            });
        }

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedRobertArrynAbilityGameState {
        return {
            type: "robert-arryn-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedRobertArrynAbilityGameState): RobertArrynAbilityGameState {
        const robertArrynAbilityGameState = new RobertArrynAbilityGameState(afterCombat);

        robertArrynAbilityGameState.childGameState = robertArrynAbilityGameState.deserializeChildGameState(data.childGameState);

        return robertArrynAbilityGameState;
    }

    deserializeChildGameState(data: SerializedRobertArrynAbilityGameState["childGameState"]): SimpleChoiceGameState {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedRobertArrynAbilityGameState {
    type: "robert-arryn-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
