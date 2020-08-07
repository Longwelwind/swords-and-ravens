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

        // Check if we can fast-track this state by checking that no involved house card forces the VSB decision
        // and that VSB holders current battle strength is one less than his opponent
        const forcedByHouseCard = this.combatGameState.houseCombatDatas.values.some(hcd => hcd.houseCard != null
             && hcd.houseCard.ability != null
             && hcd.houseCard.ability.forcesValyrianSteelBladeDecision(this.combatGameState, house));

        if (forcedByHouseCard) {
            return;
        }

        const vsbBattleStrength = this.combatGameState.getTotalCombatStrength(house);
        const opponent = this.combatGameState.houseCombatDatas.keys.filter(h => h != house)[0];
        const opponentsBattleStrength = this.combatGameState.getTotalCombatStrength(opponent);

        if (opponentsBattleStrength - vsbBattleStrength != 1) {
            // Using VSB would make no sense as battle is already won or VSB doesn't help to win it.
            // So we end this state with VSB not used
            this.combatGameState.onUseValyrianSteelBladeGameStateEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "use-valyrian-steel-blade") {
            if (player.house != this.house) {
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
