import GameState from "../../GameState";
import Player from "../Player";
import House from "../game-data-structure/House";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import Game from "../game-data-structure/Game";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";
import _ from "lodash";

interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;
    onSimpleChoiceGameStateEnd: (choice: number) => void;
}

export default class SimpleChoiceGameState extends GameState<ParentGameState> {
    description: string;
    choices: string[];
    house: House;

    firstStart(house: House, description: string, choices: string[]): void {
        this.description = description;
        this.house = house;
        this.choices = choices;

        if (choices.length == 0) {
            throw new Error("SimpleChoiceGameState called with choices.length == 0!");
        }

        if (choices.length == 1) {
            // In case there is just one possible choice, e.g. when you can't convert a ship
            // but just delete it in TakeControlOfEnemyPortGameState, automatically resolve this choice.
            this.parentGameState.onSimpleChoiceGameStateEnd(0);
        }
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSimpleChoiceGameState {
        return {
            type: "simple-choice",
            houseId: this.house.id,
            description: this.description,
            choices: this.choices
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "choose-choice") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const choice = message.choice;

            if (choice < 0 || this.choices.length <= choice) {
                return;
            }

            this.parentGameState.onSimpleChoiceGameStateEnd(choice);
        }
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    onServerMessage(_message: ServerMessage): void {

    }

    choose(choice: number): void {
        this.entireGame.sendMessageToServer({
            type: "choose-choice",
            choice: choice
        });
    }

    actionAfterVassalReplacement(newVassal: House): void {
        if (!this.description.includes("The holder of the Iron Throne must choose between")) {
            super.actionAfterVassalReplacement(newVassal);
            return;
        }

        this.parentGameState.setChildGameState(new SimpleChoiceGameState(this.parentGameState)).firstStart(
            this.parentGameState.ingame.game.ironThroneHolder,
            this.description,
            _.without(this.choices, newVassal.name));
    }

    static deserializeFromServer(parentGameState: ParentGameState, data: SerializedSimpleChoiceGameState): SimpleChoiceGameState {
        const multipleChoiceGameState = new SimpleChoiceGameState(parentGameState);

        multipleChoiceGameState.house = parentGameState.game.houses.get(data.houseId);
        multipleChoiceGameState.description = data.description;
        multipleChoiceGameState.choices = data.choices;

        return multipleChoiceGameState;
    }
}

export interface SerializedSimpleChoiceGameState {
    type: "simple-choice";
    houseId: string;
    description: string;
    choices: string[];
}
