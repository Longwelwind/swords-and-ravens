import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import ReplaceOrderGameState, {SerializedReplaceOrderGameState} from "./replace-order-game-state/ReplaceOrderGameState";
import SeeTopWildlingCardGameState, {SerializedSeeTopWildlingCardGameState} from "./see-top-wildling-card-game-state/SeeTopWildlingCardGameState";
import IngameGameState from "../../IngameGameState";
import World from "../../game-data-structure/World";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import EntireGame from "../../../EntireGame";

export default class UseRavenGameState extends GameState<ActionGameState, ReplaceOrderGameState | SeeTopWildlingCardGameState> {
    get actionGameState(): ActionGameState {
        return this.parentGameState;
    }

    get ingameGameState(): IngameGameState {
        return this.actionGameState.ingameGameState;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    get ravenHolder(): House {
        return this.game.kingsCourtTrack[0];
    }

    get entireGame(): EntireGame {
        return this.actionGameState.entireGame;
    }

    firstStart(): void {
        this.setChildGameState(new ReplaceOrderGameState(this)).firstStart();
    }

    onReplaceOrderGameStateEnd(): void {
        this.actionGameState.onUseRavenGameStateEnd();
    }

    onSeeTopWildlingCardGameStateEnd(): void {
        this.actionGameState.onUseRavenGameStateEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "choose-see-top-wildling-card") {
            if (player.house == this.ravenHolder) {
                this.setChildGameState(new SeeTopWildlingCardGameState(this)).firstStart();
            }
        } else {
            this.childGameState.onPlayerMessage(player, message);
        }
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedUseRavenGameState {
        return {
            type: "use-raven",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(actionGameState: ActionGameState, data: SerializedUseRavenGameState): UseRavenGameState {
        const useRavenGameState = new UseRavenGameState(actionGameState);

        useRavenGameState.childGameState = useRavenGameState.deserializeChildGameState(data.childGameState);

        return useRavenGameState;
    }

    deserializeChildGameState(data: SerializedUseRavenGameState["childGameState"]): ReplaceOrderGameState | SeeTopWildlingCardGameState {
        if (data.type == "replace-order") {
            return ReplaceOrderGameState.deserializeFromServer(this, data);
        } else if (data.type == "see-top-wildling-card") {
            return SeeTopWildlingCardGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedUseRavenGameState {
    type: "use-raven";
    childGameState: SerializedReplaceOrderGameState | SerializedSeeTopWildlingCardGameState;
}
