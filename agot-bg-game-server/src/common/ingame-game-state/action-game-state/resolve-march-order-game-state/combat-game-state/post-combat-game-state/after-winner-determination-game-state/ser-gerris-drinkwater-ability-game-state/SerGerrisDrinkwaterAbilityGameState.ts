import GameState from "../../../../../../../GameState";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../../game-data-structure/Game";
import CombatGameState from "../../../CombatGameState";
import House from "../../../../../../game-data-structure/House";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import ActionGameState from "../../../../../ActionGameState";
import IngameGameState from "../../../../../../IngameGameState";
import BetterMap from "../../../../../../../../utils/BetterMap";
import { serGerrisDrinkwater } from "../../../../../../../../common/ingame-game-state/game-data-structure/house-card/houseCardAbilities";
import _ from "lodash";

export default class SerGerrisDrinkwaterAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get actionGameState(): ActionGameState {
        return this.combatGameState.actionGameState;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    getChoices(house: House): BetterMap<string, number> {
        const choices = new BetterMap<string, number>();
        choices.set("Ignore", -1);

        for (let trackI = 0; trackI < this.game.influenceTracks.length; trackI++) {
            const influenceTrack = this.game.getInfluenceTrackByI(trackI);
            if (_.first(influenceTrack) != house) {
                choices.set(this.game.getNameInfluenceTrack(trackI), trackI);
            }
        }

        return choices;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            this.getChoices(house).keys
        );
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: serGerrisDrinkwater.id
            }, resolvedAutomatically);
            this.parentGameState.onHouseCardResolutionFinish(house);
        } else {
            const trackI = this.getChoices(house).values[choice];
            const influenceTrack = this.game.getInfluenceTrackByI(trackI);
            const position = influenceTrack.indexOf(house);
            influenceTrack.splice(position-1, 0, influenceTrack.splice(position, 1)[0]);
            this.parentGameState.entireGame.broadcastToClients({
                type: "change-tracker",
                trackerI: trackI,
                tracker: influenceTrack.map(h => h.id)
            });

            this.ingame.log({
                type: "ser-gerris-drinkwater-used",
                house: this.childGameState.house.id,
                influenceTrack: trackI
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSerGerrisDrinkwaterAbilityGameState {
        return {
            type: "ser-gerris-drinkwater-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinnerDeterminationChild: AfterWinnerDeterminationGameState["childGameState"], data: SerializedSerGerrisDrinkwaterAbilityGameState): SerGerrisDrinkwaterAbilityGameState {
        const cerseiLannisterAbility = new SerGerrisDrinkwaterAbilityGameState(afterWinnerDeterminationChild);

        cerseiLannisterAbility.childGameState = cerseiLannisterAbility.deserializeChildGameState(data.childGameState);

        return cerseiLannisterAbility;
    }

    deserializeChildGameState(data: SerializedSerGerrisDrinkwaterAbilityGameState["childGameState"]): SerGerrisDrinkwaterAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedSerGerrisDrinkwaterAbilityGameState {
    type: "ser-gerris-drinkwater-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
