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
import { melisandreDwd } from "../../../../../../game-data-structure/house-card/houseCardAbilities";

export default class MelisandreAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<MelisandreAbilityGameState>
> {
    get game(): Game {
        return this.combat.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    firstStart(house: House): void {
        if (this.getChoosableHouseCards(house).length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: melisandreDwd.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Activate", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, this.getChoosableHouseCards(house));
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: melisandreDwd.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard | null): void {
        if (houseCard == null || !this.getChoosableHouseCards(house).includes(houseCard)) {
            return;
        }

        houseCard.state = HouseCardState.AVAILABLE;
        house.powerTokens += -houseCard.combatStrength;

        this.combat.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            cardIds: [houseCard.id],
            state: HouseCardState.AVAILABLE
        });

        this.combat.entireGame.broadcastToClients({
            type: "change-power-token",
            houseId: house.id,
            powerTokenCount: house.powerTokens
        });

        this.ingame.log({
            type: "melisandre-dwd-used",
            house: house.id,
            houseCard: houseCard.id
        });

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    getChoosableHouseCards(house: House): HouseCard[] {
        return house.houseCards.values.filter(hc => hc.state == HouseCardState.USED && hc.combatStrength <= house.powerTokens);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedMelisandreAbilityGameState {
        return {
            type: "melisandre-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedMelisandreAbilityGameState): MelisandreAbilityGameState {
        const melisandreAbilityGameState = new MelisandreAbilityGameState(afterCombat);

        melisandreAbilityGameState.childGameState = melisandreAbilityGameState.deserializeChildGameState(data.childGameState);

        return melisandreAbilityGameState;
    }

    deserializeChildGameState(data: SerializedMelisandreAbilityGameState["childGameState"]): SelectHouseCardGameState<MelisandreAbilityGameState> | SimpleChoiceGameState {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedMelisandreAbilityGameState {
    type: "melisandre-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
