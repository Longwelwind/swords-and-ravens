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
import { branStark } from "../../../../../../game-data-structure/house-card/houseCardAbilities";

export default class BranStarkAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<BranStarkAbilityGameState>
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
        // Though Bran Stark should always be discarded here, very theoretical it might happen that Robert Arryn has removed him.
        if (this.getChoosableHouseCards(house).length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: branStark.id
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

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, this.getChoosableHouseCards(house));
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: branStark.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard | null, resolvedAutomatically: boolean): void {
        if (houseCard == null) {
            throw new Error("BranStarkAbilityGameState does not allow houseCard to be null");
        }

        houseCard.state = HouseCardState.AVAILABLE;

        this.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            cardIds: [houseCard.id],
            state: HouseCardState.AVAILABLE
        });

        this.ingame.log({
            type: "bran-stark-used",
            house: house.id,
            houseCard: houseCard.id
        }, resolvedAutomatically);

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    getChoosableHouseCards(house: House): HouseCard[] {
        return house.houseCards.values.filter(hc => hc.state == HouseCardState.USED);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedBranStarkAbilityGameState {
        return {
            type: "bran-stark-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedBranStarkAbilityGameState): BranStarkAbilityGameState {
        const branStarkAbilityGameState = new BranStarkAbilityGameState(afterCombat);

        branStarkAbilityGameState.childGameState = branStarkAbilityGameState.deserializeChildGameState(data.childGameState);

        return branStarkAbilityGameState;
    }

    deserializeChildGameState(data: SerializedBranStarkAbilityGameState["childGameState"]): SelectHouseCardGameState<BranStarkAbilityGameState> | SimpleChoiceGameState {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedBranStarkAbilityGameState {
    type: "bran-stark-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
