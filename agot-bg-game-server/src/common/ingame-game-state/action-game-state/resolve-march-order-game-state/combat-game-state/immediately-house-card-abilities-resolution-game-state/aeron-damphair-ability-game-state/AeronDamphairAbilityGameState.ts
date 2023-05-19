import GameState from "../../../../../../GameState";
import ImmediatelyHouseCardAbilitiesResolutionGameState from "../ImmediatelyHouseCardAbilitiesResolutionGameState";
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
import { aeronDamphair } from "../../../../../game-data-structure/house-card/houseCardAbilities";

export default class AeronDamphairAbilityGameState extends GameState<
    ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<AeronDamphairAbilityGameState>
> {
    reduceCombatStrengthOfNewHouseCard: boolean;

    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House, reduceCombatStrengthOfNewHouseCard: boolean): void {
        // If the house doesn't have 2 Power tokens, or doesn't have other available
        // House cards, don't even ask.
        this.reduceCombatStrengthOfNewHouseCard = reduceCombatStrengthOfNewHouseCard;
        const availableHouseCards = this.getAvailableHouseCards(house);
        if (house.powerTokens < 2 || availableHouseCards.length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: aeronDamphair.id
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
            const possibleHouseCards = this.getAvailableHouseCards(house);

            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, possibleHouseCards);
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: aeronDamphair.id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        // Discard Aeron Damphair, which should normally be the current House card
        // of "house".
        const houseCombatData = this.combatGameState.houseCombatDatas.get(house);
        const aeronDamphairHouseCard = houseCombatData.houseCard;

        // This should normally never happen as there's no way for the houseCard of a house to
        // be null if this game state was triggered.
        if (aeronDamphairHouseCard == null) {
            throw new Error();
        }

        aeronDamphairHouseCard.state = HouseCardState.USED;

        this.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            cardIds: [aeronDamphairHouseCard.id],
            state: HouseCardState.USED
        });

        // Mark the new House card as the one used by the house
        houseCombatData.houseCard = houseCard;

        this.entireGame.broadcastToClients({
            type: "change-combat-house-card",
            houseCardIds: [[house.id, houseCard.id]]
        });

        // Remove 2 power tokens
        this.ingame.changePowerTokens(house, -2);

        if (this.reduceCombatStrengthOfNewHouseCard) {
            this.combatGameState.specialHouseCardModifier = { houseCard: houseCard, combatStrength: -1 };
            this.entireGame.broadcastToClients({
                type: "update-special-house-card-modifier",
                houseCardId: this.combatGameState.specialHouseCardModifier.houseCard.id,
                combatStrength: this.combatGameState.specialHouseCardModifier.combatStrength
            });
        }

        this.ingame.log({
            type: "aeron-damphair-house-card-changed",
            house: house.id,
            newHouseCard: houseCard.id,
            reducedCombatStrength: this.reduceCombatStrengthOfNewHouseCard
        });

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house, false);
    }

    getAvailableHouseCards(house: House): HouseCard[] {
        const aeronDamphair = this.combatGameState.houseCombatDatas.get(house).houseCard;
        return house.houseCards.values.filter(hc => hc != aeronDamphair && hc.state == HouseCardState.AVAILABLE);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedAeronDamphairAbilityGameState {
        return {
            type: "aeron-damphair-ability",
            reduceCombatStrengthOfNewHouseCard: this.reduceCombatStrengthOfNewHouseCard,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], data: SerializedAeronDamphairAbilityGameState): AeronDamphairAbilityGameState {
        const aeronDamphairAbilityGameState = new AeronDamphairAbilityGameState(houseCardResolution);

        aeronDamphairAbilityGameState.reduceCombatStrengthOfNewHouseCard = data.reduceCombatStrengthOfNewHouseCard;
        aeronDamphairAbilityGameState.childGameState = aeronDamphairAbilityGameState.deserializeChildGameState(data.childGameState);

        return aeronDamphairAbilityGameState;
    }

    deserializeChildGameState(data: SerializedAeronDamphairAbilityGameState["childGameState"]): AeronDamphairAbilityGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedAeronDamphairAbilityGameState {
    type: "aeron-damphair-ability";
    reduceCombatStrengthOfNewHouseCard: boolean;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
