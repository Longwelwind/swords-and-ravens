import GameState from "../../../../GameState";
import Player from "../../../Player";
import {ClientMessage, RavenAction} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import UseRavenGameState from "../UseRavenGameState";
import EntireGame from "../../../../EntireGame";
import House from "../../../game-data-structure/House";
import User from "../../../../../server/User";

export default class ChooseRavenActionGameState extends GameState<UseRavenGameState> {
    get useRavenGameState(): UseRavenGameState {
        return this.parentGameState;
    }

    get entireGame(): EntireGame {
        return this.useRavenGameState.entireGame;
    }

    get ravenHolder(): House {
        return this.useRavenGameState.ravenHolder;
    }

    firstStart(): void {

    }

    chooseRavenAction(action: RavenAction): void {
        this.entireGame.sendMessageToServer({
            type: "choose-raven-action",
            action: action
        });
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingameGameState.getControllerOfHouse(this.ravenHolder).user];
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "choose-raven-action") {
            if (player.house != this.ravenHolder) {
                return;
            }

            const ravenAction = message.action;

            this.useRavenGameState.onChooseRavenActionGameStateEnd(ravenAction);
        }
    }

    onServerMessage(_message: ServerMessage): void {
    }

    getPhaseName(): string {
        return "Choose raven action";
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedChooseRavenActionGameState {
        return {
            type: "choose-raven-action"
        }
    }

    static deserializeFromServer(useRavenGameState: UseRavenGameState, _data: SerializedChooseRavenActionGameState): ChooseRavenActionGameState {
        return new ChooseRavenActionGameState(useRavenGameState);
    }
}

export interface SerializedChooseRavenActionGameState {
    type: "choose-raven-action";
}
