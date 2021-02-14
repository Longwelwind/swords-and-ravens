import GameState from "../../../../../../GameState";
import Player from "../../../../../Player";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import { ServerMessage } from "../../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../../messages/ClientMessage";

export default class StannisBaratheonDwDAbilityGameState extends GameState<
    BeforeCombatHouseCardAbilitiesGameState["childGameState"]
    > {
    onPlayerMessage(_player: Player, _message: ClientMessage): void {
    }

    onServerMessage(_message: ServerMessage): void {
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedStannisBaratheonDwdAbilityGameState {
        return {
            type: "stannis-baratheon-dwd-ability",
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], _data: SerializedStannisBaratheonDwdAbilityGameState): StannisBaratheonDwDAbilityGameState {
        const stannisBaratheonDwdAbilityGameState = new StannisBaratheonDwDAbilityGameState(houseCardResolution);
        return stannisBaratheonDwdAbilityGameState;
    }
}

export interface SerializedStannisBaratheonDwdAbilityGameState {
    type: "stannis-baratheon-dwd-ability";
}
