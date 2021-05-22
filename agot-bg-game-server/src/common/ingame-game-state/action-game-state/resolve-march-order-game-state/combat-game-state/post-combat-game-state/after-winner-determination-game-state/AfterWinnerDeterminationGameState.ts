import GameState from "../../../../../../GameState";
import CombatGameState from "../../CombatGameState";
import HouseCardResolutionGameState, {SerializedHouseCardResolutionGameState} from "../../house-card-resolution-game-state/HouseCardResolutionGameState";
import Game from "../../../../../game-data-structure/Game";
import HouseCard from "../../../../../game-data-structure/house-card/HouseCard";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import RenlyBaratheonAbilityGameState, { SerializedRenlyBaratheonAbilityGameState } from "./renly-baratheon-ability-game-state/RenlyBaratheonAbilityGameState";
import PostCombatGameState from "../PostCombatGameState";
import CerseiLannisterAbilityGameState, {SerializedCerseiLannisterAbilityGameState} from "./cersei-lannister-ability-game-state/CerseiLannisterAbilityGameState";
import JonSnowBaratheonAbilityGameState, {SerializedJonSnowBaratheonAbilityGameState} from "./jon-snow-baratheon-ability-game-state/JonSnowBaratheonAbilityGameState";
import SerIlynPayneAbilityGameState, {SerializedSerIlynPayneAbilityGameState} from "./ser-ilyn-payne-ability-game-state/SerIlynPayneAbilityGameState";
import SerGerrisDrinkwaterAbilityGameState, {SerializedSerGerrisDrinkwaterAbilityGameState} from "./ser-gerris-drinkwater-ability-game-state/SerGerrisDrinkwaterAbilityGameState";
import ReekAbilityGameState, {SerializedReekAbilityGameState} from "./reek-ability-game-state/ReekAbilityGameState";
import RodrikTheReaderAbilityGameState, { SerializedRodrikTheReaderAbilityGameState } from "./rodrik-the-reader-ability-game-state/RodrikTheReaderAbilityGameState";
import BericDondarrionAbilityGameState, { SerializedBericDondarrionAbilityGameState } from "./beric-dondarrion-ability-game-state/BericDondarrionAbilityGameState";
import AlayneStoneAbilityGameState, { SerializedAlayneStoneAbilityGameState } from "./alayne-stone-ability-game-state/AlayneStoneAbilityGameState";
import LysaArrynModAbilityGameState, { SerializedLysaArrynModAbilityGameState } from "./lysa-arryn-mod-game-state/LysaArrynModAbilityGameState";

export default class AfterWinnerDeterminationGameState extends GameState<
    PostCombatGameState,
    HouseCardResolutionGameState<
        AfterWinnerDeterminationGameState,
        RenlyBaratheonAbilityGameState | CerseiLannisterAbilityGameState | JonSnowBaratheonAbilityGameState
        | SerIlynPayneAbilityGameState | SerGerrisDrinkwaterAbilityGameState | ReekAbilityGameState | RodrikTheReaderAbilityGameState
        | BericDondarrionAbilityGameState | AlayneStoneAbilityGameState | LysaArrynModAbilityGameState
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
            new HouseCardResolutionGameState<AfterWinnerDeterminationGameState, RenlyBaratheonAbilityGameState | CerseiLannisterAbilityGameState | JonSnowBaratheonAbilityGameState
            | SerIlynPayneAbilityGameState | SerGerrisDrinkwaterAbilityGameState | ReekAbilityGameState | RodrikTheReaderAbilityGameState | BericDondarrionAbilityGameState
            | AlayneStoneAbilityGameState | LysaArrynModAbilityGameState>(this)
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
            case "cersei-lannister-ability":
                return CerseiLannisterAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "jon-snow-baratheon-ability":
                return JonSnowBaratheonAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "ser-ilyn-payne-ability":
                return SerIlynPayneAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "ser-gerris-drinkwater-ability":
                return SerGerrisDrinkwaterAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "reek-ability":
                return ReekAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "rodrik-the-reader-ability":
                return RodrikTheReaderAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "beric-dondarrion-ability":
                return BericDondarrionAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "alayne-stone-ability":
                return AlayneStoneAbilityGameState.deserializeFromServer(houseCardResolution, data);
            case "lysa-arryn-mod-ability":
                return LysaArrynModAbilityGameState.deserializeFromServer(houseCardResolution, data);
        }
    }
}

export interface SerializedAfterWinnerDeterminationGameState {
    type: "after-winner-determination";
    childGameState: SerializedHouseCardResolutionGameState<
        SerializedRenlyBaratheonAbilityGameState | SerializedCerseiLannisterAbilityGameState
        | SerializedJonSnowBaratheonAbilityGameState | SerializedSerIlynPayneAbilityGameState
        | SerializedSerGerrisDrinkwaterAbilityGameState | SerializedReekAbilityGameState | SerializedRodrikTheReaderAbilityGameState
        | SerializedBericDondarrionAbilityGameState | SerializedAlayneStoneAbilityGameState | SerializedLysaArrynModAbilityGameState
    >;
}
