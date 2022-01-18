import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import { mustering, supply } from "../../game-data-structure/westeros-card/westerosCardTypes";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";

export default class AThroneOfBladesGameState extends GameState<WesterosGameState, SimpleChoiceGameState> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(this.game.ironThroneHolder,
            "The holder of the Iron Throne token can choose between Mustering, Supply, or nothing at all.",
            ["Mustering", "Supply", "Nothing"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        this.parentGameState.ingame.log({
            type: "a-throne-of-blades-choice",
            house: this.childGameState.house.id,
            choice
        });

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

    serializeToClient(admin: boolean, player: Player | null): SerializedAThroneOfBladesGameState {
        return {
            type: "a-throne-of-blades",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedAThroneOfBladesGameState): AThroneOfBladesGameState {
        const aThroneOfBlades = new AThroneOfBladesGameState(westeros);

        aThroneOfBlades.childGameState = aThroneOfBlades.deserializeChildGameState(data.childGameState);

        return aThroneOfBlades;
    }

    deserializeChildGameState(data: SerializedAThroneOfBladesGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedAThroneOfBladesGameState {
    type: "a-throne-of-blades";
    childGameState: SerializedSimpleChoiceGameState;
}
