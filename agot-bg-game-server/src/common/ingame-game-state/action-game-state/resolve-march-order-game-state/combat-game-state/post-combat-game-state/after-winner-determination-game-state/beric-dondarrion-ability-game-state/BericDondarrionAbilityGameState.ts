import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import Game from "../../../../../../game-data-structure/Game";
import Player from "../../../../../../Player";
import { ClientMessage } from "../../../../../../../../messages/ClientMessage";
import { ServerMessage } from "../../../../../../../../messages/ServerMessage";
import House from "../../../../../../game-data-structure/House";
import Unit from "../../../../../../game-data-structure/Unit";
import PostCombatGameState from "../../PostCombatGameState";
import CombatGameState from "../../../CombatGameState";
import _ from "lodash";
import Region from "../../../../../../game-data-structure/Region";
import IngameGameState from "../../../../../../IngameGameState";
import ChooseCasualtiesGameState, { SerializedChooseCasualtiesGameState } from "../../choose-casualties-game-state/ChooseCasualtiesGameState";

export default class BericDondarrionAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    ChooseCasualtiesGameState
    > {
    house: House
    get game(): Game {
        return this.parentGameState.game;
    }

    get postCombat(): PostCombatGameState {
        return this.parentGameState.parentGameState.parentGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        this.house = house;
        const winnerArmy = this.postCombat.attacker == this.postCombat.winner ? this.combat.attackingArmy : this.combat.defendingArmy;
        const casualties = Math.min(1, winnerArmy.length);

        this.setChildGameState(new ChooseCasualtiesGameState(this.postCombat)).firstStart(this.postCombat.winner, winnerArmy, casualties);
    }

    onChooseCasualtiesGameStateEnd(region: Region, selectedCasualties: Unit[]): void {
        this.postCombat.onChooseCasualtiesGameStateEnd(region, selectedCasualties);

        this.parentGameState.onHouseCardResolutionFinish(this.house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedBericDondarrionAbilityGameState {
        return {
            type: "beric-dondarrion-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedBericDondarrionAbilityGameState): BericDondarrionAbilityGameState {
        const bericDondarrionAbility = new BericDondarrionAbilityGameState(afterWinnerDeterminationChild);

        bericDondarrionAbility.childGameState = bericDondarrionAbility.deserializeChildGameState(data.childGameState);

        return bericDondarrionAbility;
    }

    deserializeChildGameState(data: SerializedBericDondarrionAbilityGameState["childGameState"]): ChooseCasualtiesGameState {
        return ChooseCasualtiesGameState.deserializeFromServer(this.postCombat, data); // TODO: Check this line, feels wrong
    }
}

export interface SerializedBericDondarrionAbilityGameState {
    type: "beric-dondarrion-ability";
    childGameState: SerializedChooseCasualtiesGameState;
}
