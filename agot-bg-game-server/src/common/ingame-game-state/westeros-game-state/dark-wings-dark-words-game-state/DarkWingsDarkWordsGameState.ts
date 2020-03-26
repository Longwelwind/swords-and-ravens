import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import {
    clashOfKings, gameOfThrones,
} from "../../game-data-structure/westeros-card/westerosCardTypes";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";

export default class DarkWingsDarkWordsGameState extends GameState<WesterosGameState, SimpleChoiceGameState> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(this.game.ravenHolder,
            "The holder of the Raven Token can choose between CoK, GoT or None.",
            [
                "Clash of Kings (Players bid for each Influence track)",
                "Game of Thrones (Players gain Power Tokens for controlled Crown icons and ports with ships)",
                "None"
            ]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        this.parentGameState.ingame.log({
            type: "dark-wings-dark-words-choice",
            house: this.childGameState.house.id,
            choice
        });

        if (choice == 0) {
            clashOfKings.execute(this.parentGameState);
        } else if (choice == 1) {
            gameOfThrones.execute(this.parentGameState);
        } else if (choice == 2) {
            this.parentGameState.onWesterosCardEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDarkWingsDarkWordsGameState {
        return {
            type: "dark-wings-dark-words",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedDarkWingsDarkWordsGameState): DarkWingsDarkWordsGameState {
        const putToTheSword = new DarkWingsDarkWordsGameState(westeros);

        putToTheSword.childGameState = putToTheSword.deserializeChildGameState(data.childGameState);

        return putToTheSword;
    }

    deserializeChildGameState(data: SerializedDarkWingsDarkWordsGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedDarkWingsDarkWordsGameState {
    type: "dark-wings-dark-words";
    childGameState: SerializedSimpleChoiceGameState;
}
