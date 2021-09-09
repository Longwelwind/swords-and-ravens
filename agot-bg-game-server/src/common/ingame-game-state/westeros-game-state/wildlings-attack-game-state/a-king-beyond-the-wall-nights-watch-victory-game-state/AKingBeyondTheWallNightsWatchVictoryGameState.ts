import GameState from "../../../../GameState";
import WildlingsAttackGameState from "../WildlingsAttackGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";

export default class AKingBeyondTheWallNightsWatchVictoryGameState extends GameState<
    WildlingsAttackGameState, SimpleChoiceGameState
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
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

        const newTrack = _.concat(house, _.without(this.game.getInfluenceTrackByI(choice), house));
        this.ingame.setInfluenceTrack(choice, newTrack);

        this.ingame.log({
            type: "a-king-beyond-the-wall-highest-top-track",
            house: house.id,
            trackI: choice
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

    static deserializeFromServer(parent: WildlingsAttackGameState, data: SerializedAKingBeyondTheWallNightsWatchVictoryGameState): AKingBeyondTheWallNightsWatchVictoryGameState {
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
