import GameState from "../../../../../../GameState";
import CombatGameState from "../../CombatGameState";
import HouseCardResolutionGameState, { SerializedHouseCardResolutionGameState } from "../../house-card-resolution-game-state/HouseCardResolutionGameState";
import Game from "../../../../../game-data-structure/Game";
import HouseCard from "../../../../../game-data-structure/house-card/HouseCard";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import { ServerMessage } from "../../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../../messages/ClientMessage";
import RenlyBaratheonAbilityGameState, { SerializedRenlyBaratheonAbilityGameState } from "./renly-baratheon-ability-game-state/RenlyBaratheonAbilityGameState";
import PostCombatGameState from "../PostCombatGameState";
import CerseiLannisterAbilityGameState, { SerializedCerseiLannisterAbilityGameState } from "./cersei-lannister-ability-game-state/CerseiLannisterAbilityGameState";
import BericDondarrionAbilityGameState, { SerializedBericDondarrionAbilityGameState } from "./beric-dondarrion-ability-game-state/BericDondarrionAbilityGameState";

export default class AfterWinnerDeterminationGameState extends GameState<
    PostCombatGameState,
    HouseCardResolutionGameState<
        AfterWinnerDeterminationGameState,
        RenlyBaratheonAbilityGameState | CerseiLannisterAbilityGameState | BericDondarrionAbilityGameState
    >>
{
    get postCombatGameState(): PostCombatGameState {
        return this.parentGameState;
    }

    get combatGameState(): CombatGameState {
        return this.postCombatGameState.parentGameState;
    }

    get game(): Game {
        return this.combatGameState.game;
    }

    firstStart(): void {
        this.setChildGameState(
            new HouseCardResolutionGameState<AfterWinnerDeterminationGameState, RenlyBaratheonAbilityGameState>(this)
        ).firstStart();
    }

    onHouseCardResolutionFinish(): void {
        this.postCombatGameState.onAfterWinnerDeterminationFinish();
    }

    resolveHouseCard(house: House, houseCard: HouseCard): void {
        if (!houseCard.ability) {
            this.childGameState.onHouseCardResolutionFinish(house);
            return;
        }

        houseCard.ability.afterWinnerDetermination(this, house, houseCard);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedAfterWinnerDeterminationGameState {
        return {
            type: "after-winner-determination",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(postCombat: PostCombatGameState, data: SerializedAfterWinnerDeterminationGameState): AfterWinnerDeterminationGameState {
        const afterWinnerDetermination = new AfterWinnerDeterminationGameState(postCombat);

        afterWinnerDetermination.childGameState = afterWinnerDetermination.deserializeChildGameState(data.childGameState);

        return afterWinnerDetermination;
    }

    deserializeChildGameState(data: SerializedAfterWinnerDeterminationGameState["childGameState"]): AfterWinnerDeterminationGameState["childGameState"] {
        return HouseCardResolutionGameState.deserializeFromServer(this, data);
    }

    deserializeHouseCardResolutionChild(houseCardResolution: AfterWinnerDeterminationGameState["childGameState"], data: SerializedAfterWinnerDeterminationGameState["childGameState"]["childGameState"]): AfterWinnerDeterminationGameState["childGameState"]["childGameState"] {
        switch (data.type) {
            case "renly-baratheon-ability":
                return RenlyBaratheonAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "beric-dondarrion-ability":
                return BericDondarrionAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "cersei-lannister-ability":
                return CerseiLannisterAbilityGameState.deserializeFromServer(houseCardResolution, data);
        }
    }
}

export interface SerializedAfterWinnerDeterminationGameState {
    type: "after-winner-determination";
    childGameState: SerializedHouseCardResolutionGameState<
        SerializedRenlyBaratheonAbilityGameState | SerializedCerseiLannisterAbilityGameState | SerializedBericDondarrionAbilityGameState
    >;
}
