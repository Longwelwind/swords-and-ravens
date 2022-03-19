import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import HouseCardResolutionGameState, {SerializedHouseCardResolutionGameState} from "../house-card-resolution-game-state/HouseCardResolutionGameState";
import QueenOfThornsAbilityGameState, {SerializedQueenOfThornsAbilityGameState} from "./queen-of-thorns-ability-game-state/QueenOfThornsAbilityGameState";
import Game from "../../../../game-data-structure/Game";
import House from "../../../../game-data-structure/House";
import HouseCard from "../../../../game-data-structure/house-card/HouseCard";
import Player from "../../../../Player";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import DoranMartellAbilityGameState, {SerializedDoranMartellAbilityGameState} from "./doran-martell-ability-game-state/DoranMartellAbilityGameState";
import AeronDamphairAbilityGameState, {SerializedAeronDamphairAbilityGameState} from "./aeron-damphair-ability-game-state/AeronDamphairAbilityGameState";
import MaceTyrellAbilityGameState, {SerializedMaceTyrellAbilityGameState} from "./mace-tyrell-ability-game-state/MaceTyrellAbilityGameState";
import TyrionLannisterAbilityGameState, { SerializedTyrionLannisterAbilityGameState } from "../cancel-house-card-abilities-game-state/tyrion-lannister-ability-game-state/TyrionLannisterAbilityGameState";

export default class ImmediatelyHouseCardAbilitiesResolutionGameState extends GameState<
    CombatGameState,
    HouseCardResolutionGameState<
        ImmediatelyHouseCardAbilitiesResolutionGameState,
        QueenOfThornsAbilityGameState | DoranMartellAbilityGameState
        | AeronDamphairAbilityGameState | MaceTyrellAbilityGameState | TyrionLannisterAbilityGameState
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
            new HouseCardResolutionGameState<ImmediatelyHouseCardAbilitiesResolutionGameState, QueenOfThornsAbilityGameState | DoranMartellAbilityGameState
            | AeronDamphairAbilityGameState | MaceTyrellAbilityGameState | TyrionLannisterAbilityGameState>(this)
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

        houseCard.ability.immediatelyResolution(this, house, houseCard);
    }

    onHouseCardResolutionFinish(): void {
        this.parentGameState.onImmediatelyResolutionFinish();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedImmediatelyHouseCardAbilitiesResolutionGameState {
        return {
            type: "immediately-house-card-abilities-resolution",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    deserializeHouseCardResolutionChild(
        houseCardResolution: ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"],
        data: SerializedImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"]["childGameState"]
    ): ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"]["childGameState"] {
        switch (data.type) {
            case "queen-of-thorns":
                return QueenOfThornsAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "doran-martell-ability":
                return DoranMartellAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "aeron-damphair-ability":
                return AeronDamphairAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "mace-tyrell-ability":
                return MaceTyrellAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "tyrion-lannister-ability":
                return TyrionLannisterAbilityGameState.deserializeFromServer(houseCardResolution, data);
        }
    }

    static deserializeFromServer(combat: CombatGameState, data: SerializedImmediatelyHouseCardAbilitiesResolutionGameState): ImmediatelyHouseCardAbilitiesResolutionGameState {
        const immediately = new ImmediatelyHouseCardAbilitiesResolutionGameState(combat);

        immediately.childGameState = immediately.deserializeChildGameState(data.childGameState);

        return immediately;
    }

    deserializeChildGameState(data: SerializedImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"]): ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"] {
        return HouseCardResolutionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedImmediatelyHouseCardAbilitiesResolutionGameState {
    type: "immediately-house-card-abilities-resolution";
    childGameState: SerializedHouseCardResolutionGameState<
        SerializedQueenOfThornsAbilityGameState | SerializedDoranMartellAbilityGameState
        | SerializedAeronDamphairAbilityGameState | SerializedMaceTyrellAbilityGameState | SerializedTyrionLannisterAbilityGameState
    >;
}
