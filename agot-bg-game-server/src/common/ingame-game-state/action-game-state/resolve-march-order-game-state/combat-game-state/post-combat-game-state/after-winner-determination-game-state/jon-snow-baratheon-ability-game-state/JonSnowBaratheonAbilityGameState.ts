import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../../game-data-structure/Game";
import CombatGameState from "../../../CombatGameState";
import House from "../../../../../../game-data-structure/House";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import ActionGameState from "../../../../../ActionGameState";
import IngameGameState from "../../../../../../IngameGameState";
import { jonSnow } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import BetterMap from "../../../../../../../../utils/BetterMap";

export default class JonSnowBaratheonAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState
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

    get choices(): BetterMap<string, number> {
        const choices = new BetterMap<string, number>();
        choices.set("Ignore", 0);
        if (this.parentGameState.game.wildlingStrength >= 2) {
            choices.set("Decrease one space", -2);
        }

        if (this.parentGameState.game.wildlingStrength <= 8) {
            choices.set("Increase one space", 2);
        }

        return choices;
    }

    firstStart(house: House): void {
        const choices = this.choices.keys;

        if (choices.length == 1) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: jonSnow.id
            }, true);

            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this))
            .firstStart(
                house,
                "",
                choices
            );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: jonSnow.id
            });
        } else {
            const changeToApply = this.choices.values[choice];

            this.game.updateWildlingStrength(changeToApply);

            this.ingame.log({
                type: "jon-snow-used",
                house: house.id,
                wildlingsStrength: changeToApply,
            });

            this.entireGame.broadcastToClients({
                type: "change-wildling-strength",
                wildlingStrength: this.parentGameState.game.wildlingStrength
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

    serializeToClient(admin: boolean, player: Player | null): SerializedJonSnowBaratheonAbilityGameState {
        return {
            type: "jon-snow-baratheon-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedJonSnowBaratheonAbilityGameState): JonSnowBaratheonAbilityGameState {
        const jonSnowBaratheonAbility = new JonSnowBaratheonAbilityGameState(afterWinnerDeterminationChild);

        jonSnowBaratheonAbility.childGameState = jonSnowBaratheonAbility.deserializeChildGameState(data.childGameState);

        return jonSnowBaratheonAbility;
    }

    deserializeChildGameState(data: SerializedJonSnowBaratheonAbilityGameState["childGameState"]): JonSnowBaratheonAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedJonSnowBaratheonAbilityGameState {
    type: "jon-snow-baratheon-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
