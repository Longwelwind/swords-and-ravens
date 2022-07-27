import GameState from "../../../../../../../GameState";
import AfterCombatHouseCardAbilitiesGameState from "../AfterCombatHouseCardAbilitiesGameState";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import SelectHouseCardGameState, {SerializedSelectHouseCardGameState} from "../../../../../../select-house-card-game-state/SelectHouseCardGameState";
import House from "../../../../../../game-data-structure/House";
import CombatGameState from "../../../CombatGameState";
import Game from "../../../../../../game-data-structure/Game";
import HouseCard, {HouseCardState} from "../../../../../../game-data-structure/house-card/HouseCard";
import IngameGameState from "../../../../../../IngameGameState";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import { patchface } from "../../../../../../game-data-structure/house-card/houseCardAbilities";

export default class PatchfaceAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<PatchfaceAbilityGameState>
> {
    get game(): Game {
        return this.combat.game;
    }

    get ingame(): IngameGameState {
        return this.combat.ingameGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    firstStart(house: House): void {
        if (this.getChoosableHouseCards(house).length == 0) { // Vassal house cards
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: patchface.id
            }, true);

            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Activate", "Ignore"]
        );
    }

    getChoosableHouseCards(house: House): HouseCard[] {
        const enemy = this.combat.getEnemy(house);
        return enemy.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, this.getChoosableHouseCards(house));
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: patchface.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard, resolvedAutomatically: boolean): void {
        const affectedHouse = this.game.houses.values.find(h => h.houseCards.values.includes(houseCard)) as House;

        this.ingame.log({
            type: "patchface-used",
            house: house.id,
            affectedHouse: affectedHouse.id,
            houseCard: houseCard.id
        }, resolvedAutomatically);

        this.parentGameState.parentGameState.parentGameState.markHouseAsUsed(affectedHouse, houseCard, true);

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPatchfaceAbilityGameState {
        return {
            type: "patchface-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedPatchfaceAbilityGameState): PatchfaceAbilityGameState {
        const patchfaceAbilityGameState = new PatchfaceAbilityGameState(afterCombat);

        patchfaceAbilityGameState.childGameState = patchfaceAbilityGameState.deserializeChildGameState(data.childGameState);

        return patchfaceAbilityGameState;
    }

    deserializeChildGameState(data: SerializedPatchfaceAbilityGameState["childGameState"]): SelectHouseCardGameState<PatchfaceAbilityGameState> | SimpleChoiceGameState {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedPatchfaceAbilityGameState {
    type: "patchface-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
