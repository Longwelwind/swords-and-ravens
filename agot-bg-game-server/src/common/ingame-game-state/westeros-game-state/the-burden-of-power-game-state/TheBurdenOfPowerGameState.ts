import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import { mustering } from "../../game-data-structure/westeros-card/westerosCardTypes";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";

export default class TheBurdenOfPowerGameState extends GameState<WesterosGameState, SimpleChoiceGameState> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(this.game.ironThroneHolder,
            "The holder of the Iron Throne token chooses whether a) the Wilding track is reduced to the \x220\x22 position, or b) everyone musters units in Strongholds and Castles.",
            ["Reduce the Wildling track to 0", "Mustering"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        this.parentGameState.ingame.log({
            type: "the-burden-of-power-choice",
            house: this.childGameState.house.id,
            choice
        });

        if (choice == 0) {
            this.game.wildlingStrength = 0;
            this.entireGame.broadcastToClients({
                type: "change-wildling-strength",
                wildlingStrength: 0
            });
            this.parentGameState.onWesterosCardEnd();
        } else if (choice == 1) {
            mustering.execute(this.parentGameState);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedTheBurdenOfPowerGameState {
        return {
            type: "the-burden-of-power",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedTheBurdenOfPowerGameState): TheBurdenOfPowerGameState {
        const burdenOfPower = new TheBurdenOfPowerGameState(westeros);

        burdenOfPower.childGameState = burdenOfPower.deserializeChildGameState(data.childGameState);

        return burdenOfPower;
    }

    deserializeChildGameState(data: SerializedTheBurdenOfPowerGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedTheBurdenOfPowerGameState {
    type: "the-burden-of-power";
    childGameState: SerializedSimpleChoiceGameState;
}
