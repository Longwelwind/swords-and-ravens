import WildlingAttackGameState from "../WildlingAttackGameState";
import House from "../../../game-data-structure/House";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";

export default class AKingBeyondTheWallWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<
    SimpleChoiceGameState
> {
    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    executeForLowestBidder(house: House): void {
        this.game.influenceTracks.forEach((t, i) => {
            _.pull(t, house);
            t.push(house);

            this.entireGame.broadcastToClients({
                type: "change-tracker",
                trackerI: i,
                tracker: t.map(h => h.id)
            });
        });

        this.proceedNextHouse(house);
    }

    executeForEveryoneElse(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, "", [
            "Fiefdoms Track", "King's Court Track"
        ]);
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        const track = choice == 0 ? this.game.fiefdomsTrack : this.game.kingsCourtTrack;

        _.pull(track, house);
        track.push(house);

        this.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: choice + 1,
            tracker: track.map(h => h.id)
        });

        this.proceedNextHouse(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(admin: boolean, player: Player | null): SerializedAKingBeyondTheWallWildlingVictoryGameState {
        return {
            type: "a-king-beyond-the-wall-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(wildlingAttack: WildlingAttackGameState, data: SerializedAKingBeyondTheWallWildlingVictoryGameState): AKingBeyondTheWallWildlingVictoryGameState {
        const aKingBeyondTheWall = new AKingBeyondTheWallWildlingVictoryGameState(wildlingAttack);

        aKingBeyondTheWall.childGameState = aKingBeyondTheWall.deserializeChildGameState(data.childGameState);

        return aKingBeyondTheWall;
    }

    deserializeChildGameState(data: SerializedAKingBeyondTheWallWildlingVictoryGameState["childGameState"]): AKingBeyondTheWallWildlingVictoryGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedAKingBeyondTheWallWildlingVictoryGameState {
    type: "a-king-beyond-the-wall-wildling-victory";
    childGameState: SerializedSimpleChoiceGameState;
}
