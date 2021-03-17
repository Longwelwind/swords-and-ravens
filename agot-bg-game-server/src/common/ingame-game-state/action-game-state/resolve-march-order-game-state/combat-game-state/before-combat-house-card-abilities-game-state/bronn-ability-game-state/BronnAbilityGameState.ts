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

    get controllerOfEnemy(): House {
        return this.combatGameState.ingameGameState.getControllerOfHouse(this.enemy).house;
    }

    firstStart(house: House): void {
        this.enemy = this.combatGameState.getEnemy(house);

        if (this.controllerOfEnemy.powerTokens < 2) {
            this.combatGameState.ingameGameState.log({
                type: "house-card-ability-not-used",
                house: this.enemy.id,
                houseCard: bronn.id
            });
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

        bronnHouseCard.combatStrength = 0;

        this.entireGame.broadcastToClients({
            type: "manipulate-combat-house-card",
            manipulatedHouseCards: [bronnHouseCard].map(hc => [hc.id, hc.serializeToClient()])
        });

        this.ingame.changePowerTokens(this.controllerOfEnemy, -2);

        this.ingame.log({
            type: "bronn-used",
            house: this.controllerOfEnemy.id
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
