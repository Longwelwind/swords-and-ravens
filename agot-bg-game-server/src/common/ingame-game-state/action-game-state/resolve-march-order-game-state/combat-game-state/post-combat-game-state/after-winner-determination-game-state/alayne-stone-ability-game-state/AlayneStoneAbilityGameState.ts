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
import { alayneStone } from "../../../../../../game-data-structure/house-card/houseCardAbilities";

export default class AlayneStoneAbilityGameState extends GameState<
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

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this))
            .firstStart(
                house,
                "",
                ["Ignore", "Activate"]
            );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: alayneStone.id
            });
        } else {
            this.ingame.changePowerTokens(house, -2);
            const enemy = this.ingame.getControllerOfHouse(this.combatGameState.getEnemy(house)).house;
            const lostPowerTokens = enemy.powerTokens;
            this.ingame.changePowerTokens(enemy, -lostPowerTokens);
            this.ingame.log({
                type: "alayne-stone-used",
                house: house.id,
                affectedHouse: enemy.id,
                lostPowerTokens: lostPowerTokens
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

    serializeToClient(admin: boolean, player: Player | null): SerializedAlayneStoneAbilityGameState {
        return {
            type: "alayne-stone-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedAlayneStoneAbilityGameState): AlayneStoneAbilityGameState {
        const alayneStoneAbilityGameState = new AlayneStoneAbilityGameState(afterWinnerDeterminationChild);

        alayneStoneAbilityGameState.childGameState = alayneStoneAbilityGameState.deserializeChildGameState(data.childGameState);

        return alayneStoneAbilityGameState;
    }

    deserializeChildGameState(data: SerializedAlayneStoneAbilityGameState["childGameState"]): AlayneStoneAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedAlayneStoneAbilityGameState {
    type: "alayne-stone-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
