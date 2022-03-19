import GameState from "../../../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../../IngameGameState";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import { bronn } from "../../../../../../../common/ingame-game-state/game-data-structure/house-card/houseCardAbilities";
import HouseCardModifier from "../../../../../game-data-structure/house-card/HouseCardModifier";

export default class BronnAbilityGameState extends GameState<
    BeforeCombatHouseCardAbilitiesGameState["childGameState"], SimpleChoiceGameState
> {
    enemy: House;

    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        this.enemy = this.combatGameState.getEnemy(house);

        // According to Jason Waldons answer the commander cannot use Bronn's ability:
        // "Since vassals do not possess and thus cannot spend power tokens (page 7 of the Mother of Dragons rulebook),
        // Bronn's effect cannot be resolved on behalf of a vassal."
        if (this.ingame.isVassalHouse(this.enemy) || this.enemy.powerTokens < 2) {
            this.combatGameState.ingameGameState.log({
                type: "house-card-ability-not-used",
                house: this.enemy.id,
                houseCard: bronn.id
            }, true);
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            this.enemy,
            "",
            ["Activate", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.combatGameState.getEnemy(this.enemy);

        if (choice == 1) {
            this.combatGameState.ingameGameState.log({
                type: "house-card-ability-not-used",
                house: this.enemy.id,
                houseCard: bronn.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        const houseCombatData = this.combatGameState.houseCombatDatas.get(house);
        const bronnHouseCard = houseCombatData.houseCard;

        // This should normally never happen as there's no way for the houseCard of a house to
        // be null if this game state was triggered.
        if (bronnHouseCard == null) {
            throw new Error();
        }

        const houseCardModifier = new HouseCardModifier();
        houseCardModifier.combatStrength = -bronnHouseCard.combatStrength;

        this.combatGameState.houseCardModifiers.set(bronn.id, houseCardModifier);

        this.entireGame.broadcastToClients({
            type: "update-house-card-modifier",
            id: bronn.id,
            modifier: houseCardModifier
        });

        this.ingame.changePowerTokens(this.enemy, -2);

        this.ingame.log({
            type: "bronn-used",
            house: this.enemy.id
        });

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedBronnAbilityGameState {
        return {
            type: "bronn-ability",
            childGameState: this.childGameState.serializeToClient(admin, player),
            enemy: this.enemy.id
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedBronnAbilityGameState): BronnAbilityGameState {
        const bronnAbility = new BronnAbilityGameState(houseCardResolution);

        bronnAbility.childGameState = bronnAbility.deserializeChildGameState(data.childGameState);
        bronnAbility.enemy = houseCardResolution.game.houses.get(data.enemy);

        return bronnAbility;
    }

    deserializeChildGameState(data: SerializedBronnAbilityGameState["childGameState"]): BronnAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);

    }
}

export interface SerializedBronnAbilityGameState {
    type: "bronn-ability";
    childGameState: SerializedSimpleChoiceGameState;
    enemy: string;
}
