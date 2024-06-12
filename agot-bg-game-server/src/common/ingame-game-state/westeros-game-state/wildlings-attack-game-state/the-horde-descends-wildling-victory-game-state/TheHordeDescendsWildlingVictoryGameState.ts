import WildlingsAttackGameState from "../WildlingsAttackGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../select-units-game-state/SelectUnitsGameState";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import Region from "../../../game-data-structure/Region";
import Unit from "../../../game-data-structure/Unit";
import House from "../../../game-data-structure/House";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";
import TakeControlOfEnemyPortGameState, { SerializedTakeControlOfEnemyPortGameState } from "../../../take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";
import { TakeOverPort } from "../../../port-helper/PortHelper";
import ActionGameState from "../../../action-game-state/ActionGameState";


export default class TheHordeDescendsWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<
    SelectUnitsGameState<TheHordeDescendsWildlingVictoryGameState> | TakeControlOfEnemyPortGameState
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get wildlingsAttack(): WildlingsAttackGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    get action(): ActionGameState | null {
        return null;
    }

    executeForLowestBidder(house: House): void {
        const strongholdUnits = _.flatMap(
            this.game.getUnitsOfHouse(house).filter(([region, _]) => region.hasStructure && region.units.size >=2).map(([_, units]) => units)
        );

        if (strongholdUnits.length >= 2) {
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, strongholdUnits, 2, false, true);
        } else {
            const units = this.game.world.getUnitsOfHouse(house);

            const count = Math.min(2, units.length);

            if (count == 0) {
                this.ingame.log({
                    type: "the-horde-descends-units-killed",
                    house: house.id,
                    units: []
                }, true);

                this.proceedNextHouse(house);
                return;
            }

            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, units, count);
        }
    }

    executeForEveryoneElse(house: House): void {
        const units = this.game.world.getUnitsOfHouse(house);

        if (units.length == 0) {
            this.ingame.log({
                type: "the-horde-descends-units-killed",
                house: house.id,
                units: []
            }, true);

            this.proceedNextHouse(house);
            return;
        }

        this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, units, 1);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][], resolvedAutomatically: boolean): void {
        selectedUnits.forEach(([region, units]) => {
            units.forEach(u => region.units.delete(u.id));
            this.ingame.broadcastRemoveUnits(region, units);
        });

        this.ingame.log({
            type: "the-horde-descends-units-killed",
            house: house.id,
            units: selectedUnits.map(([region, units]) => [region.id, units.map(u => u.type.id)])
        }, resolvedAutomatically);

        this.proceedNextHouse(house);
    }

    onTakeControlOfEnemyPortGameStateRequired(takeOver: TakeOverPort, previousHouse: House): void {
        this.setChildGameState(new TakeControlOfEnemyPortGameState(this)).firstStart(takeOver.port, takeOver.newController, previousHouse);
    }

    onTakeControlOfEnemyPortFinish(previousHouse: House | null): void {
        if (!previousHouse) {
            throw new Error("previousHouse must be set here!");
        }
        this.proceedNextHouse(previousHouse);
    }


    serializeToClient(admin: boolean, player: Player | null): SerializedTheHordeDescendsWildlingVictoryGameState {
        return {
            type: "the-horde-descends-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedTheHordeDescendsWildlingVictoryGameState): TheHordeDescendsWildlingVictoryGameState {
        const theHordeDescends = new TheHordeDescendsWildlingVictoryGameState(wildlingsAttack);

        theHordeDescends.childGameState = theHordeDescends.deserializeChildGameState(data.childGameState);

        return theHordeDescends;
    }

    deserializeChildGameState(data: SerializedTheHordeDescendsWildlingVictoryGameState["childGameState"]): TheHordeDescendsWildlingVictoryGameState["childGameState"] {
        switch (data.type) {
            case "select-units":
                return SelectUnitsGameState.deserializeFromServer(this, data);
            case "take-control-of-enemy-port":
                return TakeControlOfEnemyPortGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedTheHordeDescendsWildlingVictoryGameState {
    type: "the-horde-descends-wildling-victory";
    childGameState: SerializedSelectUnitsGameState | SerializedTakeControlOfEnemyPortGameState;
}
