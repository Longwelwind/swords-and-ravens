import CombatGameState from "../CombatGameState";
import GameState from "../../../../../GameState";
import House from "../../../../game-data-structure/House";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import Game from "../../../../game-data-structure/Game";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import EntireGame from "../../../../../EntireGame";
import IngameGameState from "../../../../IngameGameState";
import User from "../../../../../../server/User";

export default class UseValyrianSteelBladeGameState extends GameState<CombatGameState> {
    house: House;

    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.combatGameState.game;
    }

    get entireGame(): EntireGame {
        return this.combatGameState.entireGame;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        this.house = house;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "use-valyrian-steel-blade") {
            if (this.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            if (message.use) {
                this.combatGameState.valyrianSteelBladeUser = this.house;
                this.combatGameState.game.valyrianSteelBladeUsed = true;

                this.combatGameState.ingameGameState.log({
                    type: "combat-valyrian-sword-used",
                    house: player.house.id
                });

                this.entireGame.broadcastToClients({
                    type: "change-valyrian-steel-blade-use",
                    used: true
                });
            }

            this.combatGameState.onUseValyrianSteelBladeGameStateEnd();
        }
    }

    getWaitedUsers(): User[] {
        return [this.ingame.getControllerOfHouse(this.house).user];
    }

    choose(use: boolean): void {
        this.entireGame.sendMessageToServer({
            type: "use-valyrian-steel-blade",
            use: use
        });
    }

    onServerMessage(_message: ServerMessage): void {

    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedUseValyrianSteelBladeGameState {
        return {
            type: "use-valyrian-steel-blade",
            houseId: this.house.id
        }
    }

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedUseValyrianSteelBladeGameState): UseValyrianSteelBladeGameState {
        const useValyrianSteelBladeGameState = new UseValyrianSteelBladeGameState(combatGameState);

        useValyrianSteelBladeGameState.house = combatGameState.game.houses.get(data.houseId);

        return useValyrianSteelBladeGameState;
    }
}

export interface SerializedUseValyrianSteelBladeGameState {
    type: "use-valyrian-steel-blade";
    houseId: string;
}
