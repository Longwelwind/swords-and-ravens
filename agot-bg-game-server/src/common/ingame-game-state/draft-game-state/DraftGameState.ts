import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import Player from "../Player";
import AgreeOnGameStartGameState, { SerializedAgreeOnGameStartGameState } from "./agree-on-game-start-game-state/AgreeOnGameStartGameState";
import DraftMapGameState, { SerializedDraftMapGameState } from "./draft-map-game-state/DraftMapGameState";
import { ServerMessage } from "../../../messages/ServerMessage";
import { ClientMessage } from "../../../messages/ClientMessage";
import Game from "../game-data-structure/Game";
import World from "../game-data-structure/World";
import EntireGame from "../../../common/EntireGame";
import House from "../game-data-structure/House";

export default class DraftGameState extends GameState<IngameGameState, DraftMapGameState | AgreeOnGameStartGameState> {
    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get participatingHouses(): House[] {
        return this.game.nonVassalHouses;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(): void {
        this.setChildGameState(new DraftMapGameState(this)).firstStart();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDraftGameState {
        return {
            type: "draft",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    deserializeChildGameState(data: SerializedDraftGameState["childGameState"]): DraftGameState["childGameState"] {
        if (data.type == "draft-map") {
            return DraftMapGameState.deserializeFromServer(this, data);
        } else if (data.type == "agree-on-game-start") {
            return AgreeOnGameStartGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedDraftGameState): DraftGameState {
        const draft = new DraftGameState(ingame);
        draft.childGameState = draft.deserializeChildGameState(data.childGameState);
        return draft;
    }
}

export interface SerializedDraftGameState {
    type: "draft";
    childGameState: SerializedDraftMapGameState | SerializedAgreeOnGameStartGameState
}
