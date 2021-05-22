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
import { lysaArrynMod } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import { HouseCardState } from "../../../../../../game-data-structure/house-card/HouseCard";

export default class LysaArrynModAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState
> {
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
                ["Ignore", "Return Lysa Arryn to hand"]
            );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: lysaArrynMod.id
            });
        } else {
            const lysaArrynHc = house.houseCards.get("lysa-arryn-mod");
            lysaArrynHc.state = HouseCardState.AVAILABLE;
            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [lysaArrynHc.id],
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

    serializeToClient(admin: boolean, player: Player | null): SerializedLysaArrynModAbilityGameState {
        return {
            type: "lysa-arryn-mod-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedLysaArrynModAbilityGameState): LysaArrynModAbilityGameState {
        const lysaArrynModGameState = new LysaArrynModAbilityGameState(afterWinnerDeterminationChild);

        lysaArrynModGameState.childGameState = lysaArrynModGameState.deserializeChildGameState(data.childGameState);

        return lysaArrynModGameState;
    }

    deserializeChildGameState(data: SerializedLysaArrynModAbilityGameState["childGameState"]): LysaArrynModAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedLysaArrynModAbilityGameState {
    type: "lysa-arryn-mod-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
