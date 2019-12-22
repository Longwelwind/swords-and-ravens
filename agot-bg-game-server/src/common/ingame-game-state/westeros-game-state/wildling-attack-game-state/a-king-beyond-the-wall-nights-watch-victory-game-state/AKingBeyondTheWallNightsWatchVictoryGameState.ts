import GameState from "../../../../GameState";
import WildlingAttackGameState from "../WildlingAttackGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import _ from "lodash";

export default class AKingBeyondTheWallNightsWatchVictoryGameState extends GameState<
    WildlingAttackGameState, SimpleChoiceGameState
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            this.parentGameState.highestBidder,
            "",
            ["Iron Throne Track", "Fiefdoms Track", "King's Court Track"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.parentGameState.highestBidder;
        const track = this.game.influenceTracks[choice];

        _.pull(track, house);
        track.unshift(house);

        this.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: choice,
            tracker: track.map(h => h.id)
        });

        this.parentGameState.onWildlingCardExecuteEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(admin: boolean, player: Player | null): SerializedAKingBeyondTheWallNightsWatchVictoryGameState {
        return {
            type: "a-king-beyond-the-wall-nights-watch-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: WildlingAttackGameState, data: SerializedAKingBeyondTheWallNightsWatchVictoryGameState): AKingBeyondTheWallNightsWatchVictoryGameState {
        const aKingBeyondTheWall = new AKingBeyondTheWallNightsWatchVictoryGameState(parent);

        aKingBeyondTheWall.childGameState = aKingBeyondTheWall.deserializeChildGameState(data.childGameState);

        return aKingBeyondTheWall;
    }

    deserializeChildGameState(data: SerializedAKingBeyondTheWallNightsWatchVictoryGameState["childGameState"]): AKingBeyondTheWallNightsWatchVictoryGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedAKingBeyondTheWallNightsWatchVictoryGameState {
    type: "a-king-beyond-the-wall-nights-watch-victory";
    childGameState: SerializedSimpleChoiceGameState;
}
