import GameState from "../../../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import SelectHouseCardGameState, {SerializedSelectHouseCardGameState} from "../../../../../select-house-card-game-state/SelectHouseCardGameState";
import HouseCard, {HouseCardState} from "../../../../../game-data-structure/house-card/HouseCard";
import IngameGameState from "../../../../../IngameGameState";
import { viserysTargaryen } from "../../../../../game-data-structure/house-card/houseCardAbilities";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import HouseCardModifier from "../../../../../game-data-structure/house-card/HouseCardModifier";

export default class ViserysTargaryenAbilityGameState extends GameState<
BeforeCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<ViserysTargaryenAbilityGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        if (this.getAvailableHouseCards(house).length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: viserysTargaryen.id
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
            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, this.getAvailableHouseCards(house));
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: viserysTargaryen.id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        // todo:
        this.ingame.log({
            type: "viserys-targaryen-used",
            house: house.id,
            houseCard: houseCard.id
        });

        houseCard.state = HouseCardState.USED;

        // No need to handle the last house card being discarded here as we are in BeforeCombat and Viserys at this point is available
        this.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            cardIds: [houseCard.id],
            state: HouseCardState.USED
        });

        const houseCardModifier = new HouseCardModifier();
        houseCardModifier.combatStrength = houseCard.combatStrength;

        this.combatGameState.houseCardModifiers.set(viserysTargaryen.id, houseCardModifier);

        this.entireGame.broadcastToClients({
            type: "update-house-card-modifier",
            id: viserysTargaryen.id,
            modifier: houseCardModifier
        });

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    getAvailableHouseCards(house: House): HouseCard[] {
        return house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedViserysTargaryenAbilityGameState {
        return {
            type: "viserys-targaryen-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedViserysTargaryenAbilityGameState): ViserysTargaryenAbilityGameState {
        const viserysTargaryenGameState = new ViserysTargaryenAbilityGameState(houseCardResolution);

        viserysTargaryenGameState.childGameState = viserysTargaryenGameState.deserializeChildGameState(data.childGameState);

        return viserysTargaryenGameState;
    }

    deserializeChildGameState(data: SerializedViserysTargaryenAbilityGameState["childGameState"]): ViserysTargaryenAbilityGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedViserysTargaryenAbilityGameState {
    type: "viserys-targaryen-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
