import GameState from "../../GameState";
import Player from "../Player";
import House from "../game-data-structure/House";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import Game from "../game-data-structure/Game";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";

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
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSimpleChoiceGameState {
        return {
            type: "simple-choice",
            houseId: this.house.id,
            description: this.description,
            choices: this.choices
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        if (message.type == "choose-choice") {
            if (this.house != player.house) {
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

    getPhaseName(): string {
        return "Choice";
    }

    onServerMessage(message: ServerMessage) {

    }

    choose(choice: number) {
        this.entireGame.sendMessageToServer({
            type: "choose-choice",
            choice: choice
        });
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
