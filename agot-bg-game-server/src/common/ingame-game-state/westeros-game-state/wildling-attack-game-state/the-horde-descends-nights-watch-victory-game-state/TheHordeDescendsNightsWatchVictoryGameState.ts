import GameState from "../../../../GameState";
import WildlingAttackGameState from "../WildlingAttackGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import PlayerMusteringGameState, {
    PlayerMusteringType,
    SerializedPlayerMusteringGameState
} from "../../mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import House from "../../../game-data-structure/House";
import IngameGameState from "../../../IngameGameState";

export default class TheHordeDescendsNightsWatchVictoryGameState extends GameState<
    WildlingAttackGameState,
    PlayerMusteringGameState
    > {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(): void {
        this.setChildGameState(new PlayerMusteringGameState(this))
            .firstStart(this.parentGameState.highestBidder, PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD);
    }

    onPlayerMusteringEnd(_house: House): void {
        this.parentGameState.onWildlingCardExecuteEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(admin: boolean, player: Player | null): SerializedTheHordeDescendsNightsWatchVictoryGameState {
        return {
            type: "the-horde-descends-nights-watch-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: WildlingAttackGameState, data: SerializedTheHordeDescendsNightsWatchVictoryGameState): TheHordeDescendsNightsWatchVictoryGameState {
        const mammothRiders = new TheHordeDescendsNightsWatchVictoryGameState(parent);

        mammothRiders.childGameState = mammothRiders.deserializeChildGameState(data.childGameState);

        return mammothRiders;
    }

    deserializeChildGameState(data: SerializedTheHordeDescendsNightsWatchVictoryGameState["childGameState"]): TheHordeDescendsNightsWatchVictoryGameState["childGameState"] {
        return PlayerMusteringGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedTheHordeDescendsNightsWatchVictoryGameState {
    type: "the-horde-descends-nights-watch-victory";
    childGameState: SerializedPlayerMusteringGameState;
}
