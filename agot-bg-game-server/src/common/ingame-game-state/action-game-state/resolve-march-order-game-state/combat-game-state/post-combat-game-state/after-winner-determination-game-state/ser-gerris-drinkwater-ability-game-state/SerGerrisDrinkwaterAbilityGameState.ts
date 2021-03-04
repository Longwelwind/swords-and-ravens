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

export default class SerGerrisDrinkwaterAbilityGameState extends GameState<
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
        const choices: string[] = ["Ignore"];

        let influenceTrack = this.game.getInfluenceTrackByI(0);
        if (influenceTrack[0] != house) {
            choices.push("Iron Throne")
        }

        influenceTrack = this.game.getInfluenceTrackByI(1);
        if (influenceTrack[0] != house) {
            choices.push("Fiefdoms")
        }

        influenceTrack = this.game.getInfluenceTrackByI(2);
        if (influenceTrack[0] != house) {
            choices.push("King's Court")
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            choices
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.parentGameState.onHouseCardResolutionFinish(house);
        } else {
            const influenceTrack = this.game.getInfluenceTrackByI(choice-1);
            const position = influenceTrack.indexOf(house);
            influenceTrack.splice(position-1, 0, influenceTrack.splice(position, 1)[0]);
            this.parentGameState.onHouseCardResolutionFinish(house);

            // event ze gerris dodal +1

            this.parentGameState.entireGame.broadcastToClients({
                type: "change-tracker",
                trackerI: choice-1,
                tracker: influenceTrack.map(h => h.id)
            });
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSerGerrisDrinkwaterAbilityGameState {
        return {
            type: "ser-gerris-drinkwater-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedSerGerrisDrinkwaterAbilityGameState): SerGerrisDrinkwaterAbilityGameState {
        const cerseiLannisterAbility = new SerGerrisDrinkwaterAbilityGameState(afterWinnerDeterminationChild);

        cerseiLannisterAbility.childGameState = cerseiLannisterAbility.deserializeChildGameState(data.childGameState);

        return cerseiLannisterAbility;
    }

    deserializeChildGameState(data: SerializedSerGerrisDrinkwaterAbilityGameState["childGameState"]): SerGerrisDrinkwaterAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedSerGerrisDrinkwaterAbilityGameState {
    type: "ser-gerris-drinkwater-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
