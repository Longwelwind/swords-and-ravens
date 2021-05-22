import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../../game-data-structure/Game";
import CombatGameState from "../../../CombatGameState";
import House from "../../../../../../game-data-structure/House";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import ActionGameState from "../../../../../ActionGameState";
import IngameGameState from "../../../../../../IngameGameState";
import { reek } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import { HouseCardState } from "../../../../../../../ingame-game-state/game-data-structure/house-card/HouseCard";

export default class ReekAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState
> {
    wildingsTrackChange: number[] | null;

    get game(): Game {
        return this.parentGameState.game;
    }

    get actionGameState(): ActionGameState {
        return this.combatGameState.actionGameState;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this))
            .firstStart(
                house,
                "",
                ["Ignore", "Return Reek to Hand"]
            );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: reek.id
            });
        } else {
            const reekHc = house.houseCards.get("reek");
            reekHc.state = HouseCardState.AVAILABLE;
            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [reekHc.id],
                state: HouseCardState.AVAILABLE
            });

        }
        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedReekAbilityGameState {
        return {
            type: "reek-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedReekAbilityGameState): ReekAbilityGameState {
        const reekAbilityGameState = new ReekAbilityGameState(afterWinnerDeterminationChild);

        reekAbilityGameState.childGameState = reekAbilityGameState.deserializeChildGameState(data.childGameState);

        return reekAbilityGameState;
    }

    deserializeChildGameState(data: SerializedReekAbilityGameState["childGameState"]): ReekAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedReekAbilityGameState {
    type: "reek-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
