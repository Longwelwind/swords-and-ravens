import GameState from "../../../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../../IngameGameState";
import { serDavosSeaworthASoS } from "../../../../../game-data-structure/house-card/houseCardAbilities";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import HouseCardModifier from "../../../../../game-data-structure/house-card/HouseCardModifier";

export default class SerDavosSeaworthASoSAbilityGameState extends GameState<BeforeCombatHouseCardAbilitiesGameState["childGameState"], SimpleChoiceGameState> {
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
        // If the house doesn't have 2 Power tokens
        // don't even ask
        if (house.powerTokens < 2) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: serDavosSeaworthASoS.id
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
            // Remove 2 power tokens
            this.ingame.changePowerTokens(house, -2);

            this.ingame.log({
                type: "ser-davos-seaworth-asos-fortification-gained",
                house: house.id,
            });

            const houseCardModifier = new HouseCardModifier();
            houseCardModifier.towerIcons = 1;

            this.combatGameState.houseCardModifiers.set(serDavosSeaworthASoS.id, houseCardModifier);

            this.entireGame.broadcastToClients({
                type: "update-house-card-modifier",
                id: serDavosSeaworthASoS.id,
                modifier: houseCardModifier
            });
        } else {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: serDavosSeaworthASoS.id
            });
        }
        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSerDavosSeaworthASoSAbilityGameState {
        return {
            type: "ser-davos-seaworth-asos-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedSerDavosSeaworthASoSAbilityGameState): SerDavosSeaworthASoSAbilityGameState {
        const serDavosGameState = new SerDavosSeaworthASoSAbilityGameState(houseCardResolution);

        serDavosGameState.childGameState = serDavosGameState.deserializeChildGameState(data.childGameState);

        return serDavosGameState;
    }

    deserializeChildGameState(data: SerializedSerDavosSeaworthASoSAbilityGameState["childGameState"]): SerDavosSeaworthASoSAbilityGameState["childGameState"] {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedSerDavosSeaworthASoSAbilityGameState {
    type: "ser-davos-seaworth-asos-ability";
    childGameState: SerializedSimpleChoiceGameState;
}
