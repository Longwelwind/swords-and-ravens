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
import popRandom from "../../../../../../utils/popRandom";

export default class UseValyrianSteelBladeGameState extends GameState<CombatGameState> {
    house: House;
    forNewTidesOfBattleCard: boolean;

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

    firstStart(house: House, forNewTidesOfBattleCard: boolean): void {
        this.house = house;
        this.forNewTidesOfBattleCard = forNewTidesOfBattleCard;

        if (!forNewTidesOfBattleCard && this.canBeSkipped(house)) {
            // Using VSB would make no sense as battle is already won or VSB doesn't help to win it.
            // So we end this state with VSB not used
            this.combatGameState.onUseValyrianSteelBladeGameStateEnd();
        }
    }

    canBeSkipped(house: House): boolean {
        // Check if we can fast-track this state by checking that no involved house card forces the VSB decision
        // and that VSB holders current battle strength is one less than his opponent
        const forcedByHouseCard = this.combatGameState.houseCombatDatas.values.some(hcd => hcd.houseCard != null
            && hcd.houseCard.ability != null
            && hcd.houseCard.ability.forcesValyrianSteelBladeDecision(this.combatGameState, house));

       if (forcedByHouseCard) {
           return false;
       }

        const vsbBattleStrength = this.combatGameState.getTotalCombatStrength(house);
        const enemy = this.combatGameState.getEnemy(house);
        const enemyBattleStrength = this.combatGameState.getTotalCombatStrength(enemy);

        // Due to vassals the VSB holder not necessarily must be in front of fief
        if (this.game.isAheadInTrack(this.game.fiefdomsTrack, house, enemy)) {
            return enemyBattleStrength - vsbBattleStrength != 1;
        } else {
            return enemyBattleStrength - vsbBattleStrength != 0;
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "use-valyrian-steel-blade") {
            if (this.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            if (player.house != this.game.valyrianSteelBladeHolder) {
                return;
            }

            if (message.use) {
                if (this.forNewTidesOfBattleCard) {
                    this.combatGameState.houseCombatDatas.get(this.house).tidesOfBattleCard = popRandom(this.combatGameState.tidesOfBattleDeck);
                } else {
                    this.combatGameState.valyrianSteelBladeUser = this.house;
                }

                this.combatGameState.game.valyrianSteelBladeUsed = true;

                this.combatGameState.ingameGameState.log({
                    type: "combat-valyrian-sword-used",
                    house: player.house.id,
                    forNewTidesOfBattleCard: this.forNewTidesOfBattleCard
                });

                this.entireGame.broadcastToClients({
                    type: "change-valyrian-steel-blade-use",
                    used: true
                });
            }

            if (this.forNewTidesOfBattleCard) {
                if (!this.combatGameState.proceedValyrianSteelBladeUsage()) {
                    this.combatGameState.onUseValyrianSteelBladeGameStateEnd();
                }
            } else {
                this.combatGameState.onUseValyrianSteelBladeGameStateEnd();
            }
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

    actionAfterVassalReplacement(_newVassal: House): void {
        // It may be possible that this.house no longer use the VSB
        if (this.ingame.getControllerOfHouse(this.house).house != this.game.valyrianSteelBladeHolder) {
            // Then we simply proceed
            this.combatGameState.onUseValyrianSteelBladeGameStateEnd();
        }
    }

    onServerMessage(_message: ServerMessage): void {

    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedUseValyrianSteelBladeGameState {
        return {
            type: "use-valyrian-steel-blade",
            houseId: this.house.id,
            forNewTidesOfBattleCard: this.forNewTidesOfBattleCard
        }
    }

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedUseValyrianSteelBladeGameState): UseValyrianSteelBladeGameState {
        const useValyrianSteelBladeGameState = new UseValyrianSteelBladeGameState(combatGameState);

        useValyrianSteelBladeGameState.house = combatGameState.game.houses.get(data.houseId);
        useValyrianSteelBladeGameState.forNewTidesOfBattleCard = data.forNewTidesOfBattleCard;

        return useValyrianSteelBladeGameState;
    }
}

export interface SerializedUseValyrianSteelBladeGameState {
    type: "use-valyrian-steel-blade";
    houseId: string;
    forNewTidesOfBattleCard: boolean;
}
