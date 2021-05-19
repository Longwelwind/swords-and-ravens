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
import { qyburn } from "../../../../../game-data-structure/house-card/houseCardAbilities";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import HouseCardModifier from "../../../../../game-data-structure/house-card/HouseCardModifier";

export default class QyburnAbilityGameState extends GameState<
BeforeCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectHouseCardGameState<QyburnAbilityGameState>
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
        // If the house doesn't have 2 power tokens
        // or there are no discarded house cards
        // don't even ask
        const availableHouseCards = this.getAvailableHouseCards();
        if (house.powerTokens < 2 || availableHouseCards.length == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: qyburn.id
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
            const possibleHouseCards = this.getAvailableHouseCards();

            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, possibleHouseCards);
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: qyburn.id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        this.ingame.log({
            type: "qyburn-used",
            house: house.id,
            houseCard: houseCard.id
        });

        // Mark the new house card as the one used by the house
        const houseCardModifier = new HouseCardModifier();
        houseCardModifier.combatStrength = houseCard.combatStrength;
        houseCardModifier.swordIcons = houseCard.swordIcons;
        houseCardModifier.towerIcons = houseCard.towerIcons;

        this.combatGameState.houseCardModifiers.set(qyburn.id, houseCardModifier);

        this.entireGame.broadcastToClients({
            type: "update-house-card-modifier",
            id: qyburn.id,
            modifier: houseCardModifier
        });

        // Remove 2 power tokens
        this.ingame.changePowerTokens(house, -2);

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    getAvailableHouseCards(): HouseCard[] {
        let availableHouseCards: HouseCard[] = [];
        this.game.houses.forEach(h => {
                const cards = h.houseCards.values.filter(hc => hc.state == HouseCardState.USED);
                availableHouseCards = availableHouseCards.concat(cards);
            });
        return availableHouseCards;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedQyburnAbilityGameState {
        return {
            type: "qyburn-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedQyburnAbilityGameState): QyburnAbilityGameState {
        const qyburnAbilityGameState = new QyburnAbilityGameState(houseCardResolution);

        qyburnAbilityGameState.childGameState = qyburnAbilityGameState.deserializeChildGameState(data.childGameState);

        return qyburnAbilityGameState;
    }

    deserializeChildGameState(data: SerializedQyburnAbilityGameState["childGameState"]): QyburnAbilityGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedQyburnAbilityGameState {
    type: "qyburn-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
