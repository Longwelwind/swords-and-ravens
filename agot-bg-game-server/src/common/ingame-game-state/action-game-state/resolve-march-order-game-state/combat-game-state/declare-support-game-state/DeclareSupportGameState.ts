import CombatGameState from "../CombatGameState";
import GameState from "../../../../../GameState";
import House from "../../../../game-data-structure/House";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import EntireGame from "../../../../../EntireGame";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../IngameGameState";
import Game from "../../../../game-data-structure/Game";
import User from "../../../../../../server/User";

export default class DeclareSupportGameState extends GameState<CombatGameState> {
    house: House;

    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get entireGame(): EntireGame {
        return this.combatGameState.entireGame;
    }

    get ingameGameState(): IngameGameState {
        return this.combatGameState.ingameGameState;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    firstStart(house: House): void {
        this.house = house;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "declare-support") {
            if (player.house != this.house) {
                console.warn();
                return;
            }

            const supportedHouse = message.supportedHouseId ? this.game.houses.get(message.supportedHouseId) : null;

            this.combatGameState.declareSupport(this.house, supportedHouse, true);

            this.combatGameState.onDeclareSupportGameStateEnd();
        }
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "support-declared") {
            const house = this.game.houses.get(message.houseId);
            const supportedHouse = message.supportedHouseId ? this.game.houses.get(message.supportedHouseId) : null;

            this.combatGameState.supporters.set(house, supportedHouse);
        }
    }

    getWaitedUsers(): User[] {
        return [this.ingameGameState.getControllerOfHouse(this.house).user];
    }

    choose(house: House | null): void {
        this.entireGame.sendMessageToServer({
            type: "declare-support",
            supportedHouseId: house ? house.id : null
        });
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedDeclareSupportGameState {
        return {
            type: "support",
            houseId: this.house.id
        };
    }

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedDeclareSupportGameState): DeclareSupportGameState {
        const declareSupportGameState = new DeclareSupportGameState(combatGameState);

        declareSupportGameState.house = combatGameState.game.houses.get(data.houseId);

        return declareSupportGameState;
    }
}

export interface SerializedDeclareSupportGameState {
    type: "support";
    houseId: string;
}
