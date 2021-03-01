import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import HouseCardResolutionGameState, {SerializedHouseCardResolutionGameState} from "../house-card-resolution-game-state/HouseCardResolutionGameState";
import Game from "../../../../game-data-structure/Game";
import House from "../../../../game-data-structure/House";
import HouseCard from "../../../../game-data-structure/house-card/HouseCard";
import Player from "../../../../Player";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import QyburnAbilityGameState, { SerializedQyburnAbilityGameState } from "./qyburn-ability-game-state/QyburnAbilityGameState";
import AeronDamphairDwDAbilityGameState, { SerializedAeronDamphairDwDAbilityGameState } from "./aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";

export default class BeforeCombatHouseCardAbilitiesGameState extends GameState<
    CombatGameState,
    HouseCardResolutionGameState<
    BeforeCombatHouseCardAbilitiesGameState,
    AeronDamphairDwDAbilityGameState | QyburnAbilityGameState
    >
> {
    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        this.setChildGameState(
            new HouseCardResolutionGameState<BeforeCombatHouseCardAbilitiesGameState, AeronDamphairDwDAbilityGameState | QyburnAbilityGameState>(this)
        ).firstStart();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    resolveHouseCard(house: House, houseCard: HouseCard): void {
        if (!houseCard.ability) {
            this.childGameState.onHouseCardResolutionFinish(house);
            return;
        }

        houseCard.ability.beforeCombatResolution(this, house, houseCard);
    }

    onHouseCardResolutionFinish(): void {
        this.parentGameState.onBeforeCombatResolutionFinish();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedBeforeCombatHouseCardAbilitiesGameState {
        return {
            type: "before-combat-house-card-abilities-resolution",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    deserializeHouseCardResolutionChild(
        houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"],
        data: SerializedBeforeCombatHouseCardAbilitiesGameState["childGameState"]["childGameState"]
    ): BeforeCombatHouseCardAbilitiesGameState["childGameState"]["childGameState"] {
        switch (data.type) {
            case "aeron-damphair-dwd-ability":
                return AeronDamphairDwDAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "qyburn-ability":
                return QyburnAbilityGameState.deserializeFromServer(houseCardResolution, data);
        }
    }

    static deserializeFromServer(combat: CombatGameState, data: SerializedBeforeCombatHouseCardAbilitiesGameState): BeforeCombatHouseCardAbilitiesGameState {
        const beforeCombatHouseCardAbilitiesResolutionGameState = new BeforeCombatHouseCardAbilitiesGameState(combat);

        beforeCombatHouseCardAbilitiesResolutionGameState.childGameState = beforeCombatHouseCardAbilitiesResolutionGameState.deserializeChildGameState(data.childGameState);

        return beforeCombatHouseCardAbilitiesResolutionGameState;
    }

    deserializeChildGameState(data: SerializedBeforeCombatHouseCardAbilitiesGameState["childGameState"]): BeforeCombatHouseCardAbilitiesGameState["childGameState"] {
        return HouseCardResolutionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedBeforeCombatHouseCardAbilitiesGameState {
    type: "before-combat-house-card-abilities-resolution";
    childGameState: SerializedHouseCardResolutionGameState<
    SerializedAeronDamphairDwDAbilityGameState | SerializedQyburnAbilityGameState
    >;
}
