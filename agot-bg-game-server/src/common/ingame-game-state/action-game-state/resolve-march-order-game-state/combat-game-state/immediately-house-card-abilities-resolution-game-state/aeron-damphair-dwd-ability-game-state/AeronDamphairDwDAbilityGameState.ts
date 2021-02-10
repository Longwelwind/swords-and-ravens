import GameState from "../../../../../../GameState";
import ImmediatelyHouseCardAbilitiesResolutionGameState from "../ImmediatelyHouseCardAbilitiesResolutionGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../../IngameGameState";


export default class AeronDamphairDwDAbilityGameState extends GameState<
    ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], SimpleChoiceGameState
> {
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
        const choices: string[] = ["0"];

        for(let i = 1;i<=house.powerTokens;i++) {
            choices.push(i.toString());
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            choices,
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        const houseCombatData = this.combatGameState.houseCombatDatas.get(house);
        const aeronDamphairHouseCard = houseCombatData.houseCard;

        // This should normally never happen as there's no way for the houseCard of a house to
        // be null if this game state was triggered.
        if (aeronDamphairHouseCard == null) {
            throw new Error();
        }

        aeronDamphairHouseCard.combatStrength += choice;

        this.ingame.changePowerTokens(house, -choice);
        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);

        this.ingame.log({
            type: "aeron-damphair-used",
            house: this.childGameState.house.id,
            tokens: choice,
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedAeronDamphairDwDAbilityGameState {
        return {
            type: "aeron-damphair-dwd-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], data: SerializedAeronDamphairDwDAbilityGameState): AeronDamphairDwDAbilityGameState {
        const aeronDamphairDwDAbilityGameState = new AeronDamphairDwDAbilityGameState(houseCardResolution);

        aeronDamphairDwDAbilityGameState.childGameState = aeronDamphairDwDAbilityGameState.deserializeChildGameState(data.childGameState);

        return aeronDamphairDwDAbilityGameState;
    }

    deserializeChildGameState(data: SerializedAeronDamphairDwDAbilityGameState["childGameState"]): AeronDamphairDwDAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);

    }
}

export interface SerializedAeronDamphairDwDAbilityGameState {
    type: "aeron-damphair-dwd-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
