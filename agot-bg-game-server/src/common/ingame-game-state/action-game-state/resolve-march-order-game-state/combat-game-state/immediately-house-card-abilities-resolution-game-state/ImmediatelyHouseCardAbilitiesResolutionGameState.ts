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

export default class ImmediatelyHouseCardAbilitiesResolutionGameState extends GameState<
    CombatGameState,
    HouseCardResolutionGameState<
        ImmediatelyHouseCardAbilitiesResolutionGameState,
        QueenOfThornsAbilityGameState
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
            new HouseCardResolutionGameState<ImmediatelyHouseCardAbilitiesResolutionGameState, QueenOfThornsAbilityGameState>(this)
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
        }
    }

    static deserializeFromServer(combat: CombatGameState, data: SerializedImmediatelyHouseCardAbilitiesResolutionGameState): ImmediatelyHouseCardAbilitiesResolutionGameState {
        const immediately = new ImmediatelyHouseCardAbilitiesResolutionGameState(combat);

        immediately.childGameState = immediately.deserializeChildGameState(data.childGameState);

        return immediately;
    }

    deserializeChildGameState(data: SerializedImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"]): HouseCardResolutionGameState<ImmediatelyHouseCardAbilitiesResolutionGameState, QueenOfThornsAbilityGameState> {
        return HouseCardResolutionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedImmediatelyHouseCardAbilitiesResolutionGameState {
    type: "immediately-house-card-abilities-resolution";
    childGameState: SerializedHouseCardResolutionGameState<SerializedQueenOfThornsAbilityGameState>;
}
