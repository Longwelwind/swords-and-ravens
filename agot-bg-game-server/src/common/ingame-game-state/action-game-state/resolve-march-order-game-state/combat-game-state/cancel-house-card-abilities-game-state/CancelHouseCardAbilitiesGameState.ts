import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import HouseCardResolutionGameState, {SerializedHouseCardResolutionGameState} from "../house-card-resolution-game-state/HouseCardResolutionGameState";
import Game from "../../../../game-data-structure/Game";
import House from "../../../../game-data-structure/House";
import HouseCard from "../../../../game-data-structure/house-card/HouseCard";
import Player from "../../../../Player";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import TyrionLannisterAbilityGameState, {SerializedTyrionLannisterAbilityGameState} from "./tyrion-lannister-ability-game-state/TyrionLannisterAbilityGameState";

export default class CancelHouseCardAbilitiesGameState extends GameState<
    CombatGameState,
    HouseCardResolutionGameState<
        CancelHouseCardAbilitiesGameState,
        TyrionLannisterAbilityGameState
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
            new HouseCardResolutionGameState<CancelHouseCardAbilitiesGameState, TyrionLannisterAbilityGameState>(this)
        ).firstStart();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    resolveHouseCard(house: House, houseCard: HouseCard): void {
        houseCard.ability?.cancel(this, house, houseCard);
    }

    onHouseCardResolutionFinish(): void {
        this.parentGameState.onCancelHouseCardAbilitiesFinish();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedCancelHouseCardAbilitiesGameState {
        return {
            type: "cancel-house-card-abilities",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    deserializeHouseCardResolutionChild(
        houseCardResolution: CancelHouseCardAbilitiesGameState["childGameState"],
        data: SerializedCancelHouseCardAbilitiesGameState["childGameState"]["childGameState"]
    ): CancelHouseCardAbilitiesGameState["childGameState"]["childGameState"] {
        switch (data.type) {
            case "tyrion-lannister-ability":
                return TyrionLannisterAbilityGameState.deserializeFromServer(houseCardResolution, data);
        }
    }

    static deserializeFromServer(combat: CombatGameState, data: SerializedCancelHouseCardAbilitiesGameState): CancelHouseCardAbilitiesGameState {
        const cancelHouseCardAbilitiesGameState = new CancelHouseCardAbilitiesGameState(combat);

        cancelHouseCardAbilitiesGameState.childGameState = cancelHouseCardAbilitiesGameState.deserializeChildGameState(data.childGameState);

        return cancelHouseCardAbilitiesGameState;
    }

    deserializeChildGameState(data: SerializedCancelHouseCardAbilitiesGameState["childGameState"]): CancelHouseCardAbilitiesGameState["childGameState"] {
        return HouseCardResolutionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedCancelHouseCardAbilitiesGameState {
    type: "cancel-house-card-abilities";
    childGameState: SerializedHouseCardResolutionGameState<
        SerializedTyrionLannisterAbilityGameState
    >;
}
