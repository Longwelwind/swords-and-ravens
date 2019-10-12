import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import ChooseRavenActionGameState, {SerializedChooseRavenActionGameState} from "./choose-raven-action-game-state/ChooseRavenActionGameState";
import ReplaceOrderGameState, {SerializedReplaceOrderGameState} from "./replace-order-game-state/ReplaceOrderGameState";
import SeeTopWildlingCardGameState, {SerializedSeeTopWildlingCardGameState} from "./see-top-wildling-card-game-state/SeeTopWildlingCardGameState";
import IngameGameState from "../../IngameGameState";
import World from "../../game-data-structure/World";
import Game from "../../game-data-structure/Game";
import House from "../../game-data-structure/House";
import Player from "../../Player";
import {ClientMessage, RavenAction} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import EntireGame from "../../../EntireGame";

export default class UseRavenGameState extends GameState<ActionGameState, ChooseRavenActionGameState | ReplaceOrderGameState | SeeTopWildlingCardGameState> {
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

    firstStart() {
        this.setChildGameState(new ChooseRavenActionGameState(this));
    }

    onChooseRavenActionGameStateEnd(ravenAction: RavenAction) {
        if (ravenAction == RavenAction.REPLACE_ORDER) {
            this.setChildGameState(new ReplaceOrderGameState(this));
        } else if (ravenAction == RavenAction.SEE_TOP_WILDLING_CARD) {
            this.setChildGameState(new SeeTopWildlingCardGameState(this)).firstStart();
        } else {
            this.actionGameState.onUseRavenGameStateEnd();
        }
    }

    onReplaceOrderGameStateEnd() {
        this.actionGameState.onUseRavenGameStateEnd();
    }

    onSeeTopWildlingCardGameStateEnd() {
        this.actionGameState.onUseRavenGameStateEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage) {
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

    deserializeChildGameState(data: SerializedUseRavenGameState["childGameState"]): ChooseRavenActionGameState | ReplaceOrderGameState | SeeTopWildlingCardGameState {
        if (data.type == "choose-raven-action") {
            return ChooseRavenActionGameState.deserializeFromServer(this, data);
        } else if (data.type == "replace-order") {
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
    childGameState: SerializedChooseRavenActionGameState | SerializedReplaceOrderGameState | SerializedSeeTopWildlingCardGameState;
}
