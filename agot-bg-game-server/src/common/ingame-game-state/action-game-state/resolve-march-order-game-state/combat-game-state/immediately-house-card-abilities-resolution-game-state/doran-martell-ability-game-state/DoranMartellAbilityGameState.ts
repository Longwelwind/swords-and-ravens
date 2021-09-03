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

    onSimpleChoiceGameStateEnd(choice: number): void {
        const enemy = this.combatGameState.getEnemy(this.childGameState.house);

        // Put the enemy at the end of the influence track
        const influenceTrack = this.game.getInfluenceTrackByI(choice);
        let newInfluenceTrack = _.concat(_.without(influenceTrack, enemy), enemy);
        newInfluenceTrack = this.ingame.getInfluenceTrackWithRespectTargaryenIsAlwaysLast(newInfluenceTrack);
        this.game.setInfluenceTrack(choice, newInfluenceTrack);

        this.ingame.log({
            type: "doran-used",
            house: this.childGameState.house.id,
            affectedHouse: enemy.id,
            influenceTrack: choice
        });

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: choice,
            tracker: newInfluenceTrack.map(h => h.id)
        });

        this.parentGameState.onHouseCardResolutionFinish(this.childGameState.house);
    }

    firstStart(house: House): void {
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
