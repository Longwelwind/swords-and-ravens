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
        
        // Put the enemy at the end of the influence track
        const influenceTrack = this.game.getInfluenceTrackByI(choice);

        this.ingame.log({
            type: "doran-used",
            house: this.childGameState.house.id,
            affectedHouse: enemy.id,
            influenceTrack: choice
        }, resolvedAutomatically);

        if (choice === 0) {
            // Add the 'doran-delayed-turn' notification if next player in order loses their turn.
            const indexOfCurrentHouse = _.indexOf(influenceTrack, this.childGameState.house)

            const nextHouse = influenceTrack.at(indexOfCurrentHouse + 1);

            const hasTargPlayer = !!this.game.targaryen

            const isNotLastNonTargPlayer = (hasTargPlayer && indexOfCurrentHouse < influenceTrack.length - 2) 
            || (!hasTargPlayer && indexOfCurrentHouse < influenceTrack.length - 1)

            // Notification is not required if the current house is last in turn order when effect is triggered.
            if (nextHouse && isNotLastNonTargPlayer) {
                this.ingame.log({
                    type: "doran-delayed-turn",
                    house: this.childGameState.house.id,
                    affectedHouse: nextHouse.id,
                    influenceTrack: choice
                }, resolvedAutomatically);
            }
        }

        const newInfluenceTrack = _.concat(_.without(influenceTrack, enemy), enemy);
        this.ingame.setInfluenceTrack(choice, newInfluenceTrack);

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
