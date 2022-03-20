import GameState from "../../../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../../IngameGameState";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import { stannisBaratheonASoS } from "../../../../../game-data-structure/house-card/houseCardAbilities";
import HouseCardModifier from "../../../../../game-data-structure/house-card/HouseCardModifier";

export default class StannisBaratheonASoSAbilityGameState extends GameState<
    BeforeCombatHouseCardAbilitiesGameState["childGameState"], SimpleChoiceGameState
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
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Activate", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 1) {
            this.combatGameState.ingameGameState.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: stannisBaratheonASoS.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        const oldThroneOwner = this.game.ironThroneHolder;
        this.game.usurper = house;
        this.entireGame.broadcastToClients({
            type: "update-usurper",
            house: house.id
        });

        const houseCardModifier = new HouseCardModifier();
        houseCardModifier.swordIcons = 1;

        this.combatGameState.houseCardModifiers.set(stannisBaratheonASoS.id, houseCardModifier);

        this.entireGame.broadcastToClients({
            type: "update-house-card-modifier",
            id: stannisBaratheonASoS.id,
            modifier: houseCardModifier
        });

        this.ingame.log({
            type: "stannis-baratheon-asos-used",
            house: house.id,
            oldThroneOwner: oldThroneOwner.id
        });

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedStannisBaratheonASoSAbilityGameState {
        return {
            type: "stannis-baratheon-asos-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedStannisBaratheonASoSAbilityGameState): StannisBaratheonASoSAbilityGameState {
        const stannisAbility = new StannisBaratheonASoSAbilityGameState(houseCardResolution);

        stannisAbility.childGameState = stannisAbility.deserializeChildGameState(data.childGameState);

        return stannisAbility;
    }

    deserializeChildGameState(data: SerializedStannisBaratheonASoSAbilityGameState["childGameState"]): StannisBaratheonASoSAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);

    }
}

export interface SerializedStannisBaratheonASoSAbilityGameState {
    type: "stannis-baratheon-asos-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
