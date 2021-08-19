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
import SelectHouseCardGameState, { SerializedSelectHouseCardGameState } from "../../../../../../../ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";

export default class RobertArrynAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<RobertArrynAbilityGameState>
> {
    house: House;
    get game(): Game {
        return this.combat.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get possibleEnemyHouseCards(): HouseCard[] {
        // Due to Roose Bolton and vassals the enemy discard pile may be empty
        const enemy = this.combat.getEnemy(this.house);
        const enemyDiscardPile = _.sortBy(enemy.houseCards.values.filter(hc => hc.state == HouseCardState.USED), sorted => sorted.combatStrength);
        if (enemyDiscardPile.length == 0) {
            return [];
        }

        const lowestCombatStrength = enemyDiscardPile[0].combatStrength;
        return enemyDiscardPile.filter(hc => hc.combatStrength == lowestCombatStrength);
    }

    firstStart(house: House): void {
        this.house = house;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Activate", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (choice == 0) {
            const possibleEnemyHouseCards = this.possibleEnemyHouseCards;

            if (possibleEnemyHouseCards.length == 0) {
                this.executeRobertsAbility(null);
            } else if (possibleEnemyHouseCards.length == 1) {
                this.executeRobertsAbility(possibleEnemyHouseCards[0]);
            } else {
                // Iron Throne holder has to decide which card to remove
                this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(
                    this.game.ironThroneHolder,
                    possibleEnemyHouseCards);
                return;
            }
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: this.house.id,
                houseCard: robertArryn.id
            });
        }

        this.parentGameState.onHouseCardResolutionFinish(this.house);
    }

    executeRobertsAbility(enemyHouseCardToRemove: HouseCard | null): void {
        const enemy = this.combat.getEnemy(this.house);
        if (enemyHouseCardToRemove) {
            this.game.deletedHouseCards.set(enemyHouseCardToRemove.id, enemyHouseCardToRemove);
            enemy.houseCards.delete(enemyHouseCardToRemove.id);
            this.entireGame.broadcastToClients({
                type: "update-house-cards",
                house: enemy.id,
                houseCards: enemy.houseCards.values.map(hc => hc.serializeToClient())
            });
        }

        const robertArrynHc = this.house.houseCards.get("robert-arryn");
        this.game.deletedHouseCards.set(robertArrynHc.id, robertArrynHc);
        this.house.houseCards.delete(robertArrynHc.id);
        this.entireGame.broadcastToClients({
            type: "update-house-cards",
            house: this.house.id,
            houseCards: this.house.houseCards.values.map(hc => hc.serializeToClient())
        });

        this.entireGame.broadcastToClients({
            type: "update-deleted-house-cards",
            houseCards: this.game.deletedHouseCards.values.map(hc => hc.serializeToClient())
        });

        this.ingame.log({
            type: "robert-arryn-used",
            house: this.house.id,
            affectedHouse: enemy.id,
            removedHouseCard: enemyHouseCardToRemove ? enemyHouseCardToRemove.id : null
        });
    }

    onSelectHouseCardFinish(_ironThroneHolder: House, houseCard: HouseCard | null): void {
        this.ingame.log({
            type: "ties-decided",
            house: this.game.ironThroneHolder.id
        });

        this.executeRobertsAbility(houseCard);
        this.parentGameState.onHouseCardResolutionFinish(this.house);
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
            house: this.house.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedRobertArrynAbilityGameState): RobertArrynAbilityGameState {
        const robertArrynAbilityGameState = new RobertArrynAbilityGameState(afterCombat);

        robertArrynAbilityGameState.house = afterCombat.game.houses.get(data.house);
        robertArrynAbilityGameState.childGameState = robertArrynAbilityGameState.deserializeChildGameState(data.childGameState);

        return robertArrynAbilityGameState;
    }

    deserializeChildGameState(data: SerializedRobertArrynAbilityGameState["childGameState"]): RobertArrynAbilityGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedRobertArrynAbilityGameState {
    type: "robert-arryn-ability";
    house: string;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
