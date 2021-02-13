import GameState from "../../../../../../GameState";
import CombatGameState from "../../CombatGameState";
import HouseCardResolutionGameState, {SerializedHouseCardResolutionGameState} from "../../house-card-resolution-game-state/HouseCardResolutionGameState";
import Game from "../../../../../game-data-structure/Game";
import HouseCard from "../../../../../game-data-structure/house-card/HouseCard";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import PostCombatGameState from "../PostCombatGameState";
import PatchfaceAbilityGameState, {SerializedPatchfaceAbilityGameState} from "./patchface-ability-game-state/PatchfaceAbilityGameState";
import MelisandreAbilityGameState, {SerializedMelisandreAbilityGameState} from "./melisandre-ability-game-state/MelisandreAbilityGameState";
import RodrikTheReaderAbilityGameState, {SerializedRodrikTheReaderAbilityGameState} from "./rodrik-the-reader-ability-game-state/RodrikTheReaderAbilityGameState";

export default class AfterCombatHouseCardAbilitiesGameState extends GameState<
    PostCombatGameState,
    HouseCardResolutionGameState<
        AfterCombatHouseCardAbilitiesGameState,
        PatchfaceAbilityGameState | MelisandreAbilityGameState | RodrikTheReaderAbilityGameState
    >
>  {
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
            new HouseCardResolutionGameState<AfterCombatHouseCardAbilitiesGameState, PatchfaceAbilityGameState | MelisandreAbilityGameState>(this)
        ).firstStart();
    }

    onHouseCardResolutionFinish(): void {
        this.postCombatGameState.onAfterCombatHouseCardAbilitiesFinish();
    }

    resolveHouseCard(house: House, houseCard: HouseCard): void {
        if (!houseCard.ability) {
            this.childGameState.onHouseCardResolutionFinish(house);
            return;
        }

        houseCard.ability.afterCombat(this, house, houseCard);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedAfterCombatHouseCardAbilitiesGameState {
        return {
            type: "after-combat-house-card-abilities",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(postCombat: PostCombatGameState, data: SerializedAfterCombatHouseCardAbilitiesGameState): AfterCombatHouseCardAbilitiesGameState {
        const afterWinnerDetermination = new AfterCombatHouseCardAbilitiesGameState(postCombat);

        afterWinnerDetermination.childGameState = afterWinnerDetermination.deserializeChildGameState(data.childGameState);

        return afterWinnerDetermination;
    }

    deserializeChildGameState(data: SerializedAfterCombatHouseCardAbilitiesGameState["childGameState"]): AfterCombatHouseCardAbilitiesGameState["childGameState"] {
        return HouseCardResolutionGameState.deserializeFromServer(this, data);
    }

    deserializeHouseCardResolutionChild(houseCardResolution: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedAfterCombatHouseCardAbilitiesGameState["childGameState"]["childGameState"]): AfterCombatHouseCardAbilitiesGameState["childGameState"]["childGameState"] {
        switch (data.type) {
            case "patchface-ability":
                return PatchfaceAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "melisandre-ability":
                return MelisandreAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "rodrik-the-reader-ability":
                return RodrikTheReaderAbilityGameState.deserializeFromServer(houseCardResolution, data);
        }
    }
}

export interface SerializedAfterCombatHouseCardAbilitiesGameState {
    type: "after-combat-house-card-abilities";
    childGameState: SerializedHouseCardResolutionGameState<SerializedPatchfaceAbilityGameState | SerializedMelisandreAbilityGameState | SerializedRodrikTheReaderAbilityGameState>;
}
