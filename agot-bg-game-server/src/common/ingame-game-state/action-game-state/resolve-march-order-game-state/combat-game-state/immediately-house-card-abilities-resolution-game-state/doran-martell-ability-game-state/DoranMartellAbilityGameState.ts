import ImmediatelyHouseCardAbilitiesResolutionGameState from "../ImmediatelyHouseCardAbilitiesResolutionGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import GameState from "../../../../../../GameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import _ from "lodash";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../../IngameGameState";

export default class DoranMartellAbilityGameState extends GameState<
    ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"],
    SimpleChoiceGameState
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

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const enemy = this.combatGameState.getEnemy(this.childGameState.house);

        // Remember the house that currently would resolve next march order
        const nextHouse = this.getHouseThatWouldResolveNextMarchOrder();

        // Put the enemy at the end of the influence track
        const influenceTrack = this.game.getInfluenceTrackByI(choice);
        const newInfluenceTrack = _.concat(_.without(influenceTrack, enemy), enemy);
        this.ingame.setInfluenceTrack(choice, newInfluenceTrack);

        if (choice == 0) {
            // Add the skippedTurnForHouse property if next player in order loses their turn.
            const nextHouseAfterDoran = this.getHouseThatWouldResolveNextMarchOrder();

            if (nextHouse && nextHouse != nextHouseAfterDoran) {
                this.ingame.log({
                    type: "doran-used",
                    house: this.childGameState.house.id,
                    affectedHouse: enemy.id,
                    influenceTrack: choice,
                    skippedHouse: nextHouse.id,
                }, resolvedAutomatically);
                this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
                return;
            }
        }

        this.ingame.log({
            type: "doran-used",
            house: this.childGameState.house.id,
            affectedHouse: enemy.id,
            influenceTrack: choice
        }, resolvedAutomatically);

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    firstStart(house: House): void {
        const enemy = this.combatGameState.getEnemy(house);
        if (this.game.influenceTracks.every(track => enemy == _.last(track))) {
            this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
                house,
                "",
                ["Iron Throne"]
            );
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Iron Throne", "Fiefdoms", "King's Court"]
        );
    }

    getHouseThatWouldResolveNextMarchOrder(): House | null {
        const turnOrder = this.game.getTurnOrder();
        const numberOfHouses = turnOrder.length;

        let currentIndex = this.combatGameState.parentGameState.currentTurnOrderIndex;

        // Check each house in order to find one that has an available March order.
        // Check at most once for each house
        for (let i = 0;i < numberOfHouses;i++) {
            currentIndex = (currentIndex + 1) % numberOfHouses;
            const currentHouseToCheck = turnOrder[currentIndex];

            const regions = this.combatGameState.actionGameState.getRegionsWithMarchOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }
        }

        // If no house has any march order available, return null
        return null;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDoranMartellAbilityGameState {
        return {
            type: "doran-martell-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], data: SerializedDoranMartellAbilityGameState): DoranMartellAbilityGameState {
        const doranMartellAbilityGameState = new DoranMartellAbilityGameState(houseCardResolution);

        doranMartellAbilityGameState.childGameState = doranMartellAbilityGameState.deserializeChildGameState(data.childGameState);

        return doranMartellAbilityGameState;
    }

    deserializeChildGameState(data: SerializedDoranMartellAbilityGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedDoranMartellAbilityGameState {
    type: "doran-martell-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
