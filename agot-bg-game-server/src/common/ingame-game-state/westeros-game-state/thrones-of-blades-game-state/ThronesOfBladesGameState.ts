import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import {
    mustering,
    supply
} from "../../game-data-structure/westeros-card/westerosCardTypes";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";

export default class ThronesOfBladesGameState extends GameState<WesterosGameState, SimpleChoiceGameState> {
    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(this.game.ironThroneHolder,
            "The holden of the Iron Throne can choose between Mustering, Supply or None.",
            ["Mustering", "Supply", "None"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (choice == 0) {
            mustering.execute(this.parentGameState);
        } else if (choice == 1) {
            supply.execute(this.parentGameState);
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

    serializeToClient(admin: boolean, player: Player | null): SerializedThronesOfBladesGameState {
        return {
            type: "thrones-of-blades",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedThronesOfBladesGameState): ThronesOfBladesGameState {
        const putToTheSword = new ThronesOfBladesGameState(westeros);

        putToTheSword.childGameState = putToTheSword.deserializeChildGameState(data.childGameState);

        return putToTheSword;
    }

    deserializeChildGameState(data: SerializedThronesOfBladesGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedThronesOfBladesGameState {
    type: "thrones-of-blades";
    childGameState: SerializedSimpleChoiceGameState;
}
