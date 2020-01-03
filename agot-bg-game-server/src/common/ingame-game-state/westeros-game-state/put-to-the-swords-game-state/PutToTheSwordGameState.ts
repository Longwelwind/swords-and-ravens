import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import {rainsOfAutumn, stormOfSwords} from "../../game-data-structure/westeros-card/westerosCardTypes";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";

export default class PutToTheSwordGameState extends GameState<WesterosGameState, SimpleChoiceGameState> {
    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart() {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            this.game.valyrianSteelBladeHolder,
            "The holder of the Valyrian Blade Steel can choose between No March +1 orders, no Defense orders or none",
            ["No march +1 orders", "No defense orders", "None"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number) {
        this.parentGameState.ingameGameState.log({
            type: "put-to-the-sword-choice",
            house: this.childGameState.house.id,
            choice
        });

        if (choice == 0) {
            rainsOfAutumn.execute(this.parentGameState);
        } else if (choice == 1) {
            stormOfSwords.execute(this.parentGameState);
        } else if (choice == 2) {
            this.parentGameState.onWesterosCardEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage) {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPutToTheSwordGameState {
        return {
            type: "put-to-the-sword",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedPutToTheSwordGameState): PutToTheSwordGameState {
        const putToTheSword = new PutToTheSwordGameState(westeros);

        putToTheSword.childGameState = putToTheSword.deserializeChildGameState(data.childGameState);

        return putToTheSword;
    }

    deserializeChildGameState(data: SerializedPutToTheSwordGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedPutToTheSwordGameState {
    type: "put-to-the-sword";
    childGameState: SerializedSimpleChoiceGameState;
}
