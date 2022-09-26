import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../select-units-game-state/SelectUnitsGameState";
import Player from "../../../Player";
import House from "../../../game-data-structure/House";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import Unit from "../../../game-data-structure/Unit";
import Region from "../../../game-data-structure/Region";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import WildlingsAttackGameState from "../WildlingsAttackGameState";
import IngameGameState from "../../../IngameGameState";
import { TakeControlOfEnemyPortResult } from "../../../port-helper/PortHelper";
import TakeControlOfEnemyPortGameState, { SerializedTakeControlOfEnemyPortGameState } from "../../../take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";
import ActionGameState from "../../../action-game-state/ActionGameState";

export default class MammothRidersWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<SelectUnitsGameState<MammothRidersWildlingVictoryGameState> | TakeControlOfEnemyPortGameState> {
    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    get action(): ActionGameState | null {
        return null;
    }

    executeForLowestBidder(house: House): void {
        this.executeForHouse(house, 3);
    }

    executeForEveryoneElse(house: House): void {
        this.executeForHouse(house, 2);
    }

    executeForHouse(house: House, count: number): void {
        const units = this.game.world.getUnitsOfHouse(house);

        count = Math.min(count, units.length);

        if (units.length > 0) {
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, units, count);
        } else {
            this.ingame.log({
                type: "mammoth-riders-destroy-units",
                house: house.id,
                units: []
            }, true);

            this.proceedNextHouse(house);
        }
    }

    onTakeControlOfEnemyPortGameStateRequired(takeControlOfEnemyPortResult: TakeControlOfEnemyPortResult, previousHouse: House): void {
        this.setChildGameState(new TakeControlOfEnemyPortGameState(this)).firstStart(takeControlOfEnemyPortResult.port, takeControlOfEnemyPortResult.newController, previousHouse);
    }

    onTakeControlOfEnemyPortFinish(previousHouse: House | null): void {
        if (!previousHouse) {
            throw new Error("previousHouse must be set here!");
        }
        this.proceedNextHouse(previousHouse);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][], resolvedAutomatically: boolean): void {
        selectedUnits.forEach(([region, units]) => {
            units.forEach(u => region.units.delete(u.id));

            this.entireGame.broadcastToClients({
                type: "remove-units",
                unitIds: units.map(u => u.id),
                regionId: region.id
            });
        });

        this.ingame.log({
            type: "mammoth-riders-destroy-units",
            house: house.id,
            units: selectedUnits.map(([region, units]) => [region.id, units.map(u => u.type.id)])
        }, resolvedAutomatically);

        this.proceedNextHouse(house);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedMammothRidersWildlingVictoryGameState {
        return {
            type: "mammoth-riders-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedMammothRidersWildlingVictoryGameState): MammothRidersWildlingVictoryGameState {
        const mammothRiders = new MammothRidersWildlingVictoryGameState(wildlingsAttack);

        mammothRiders.childGameState = mammothRiders.deserializeChildGameState(data.childGameState);

        return mammothRiders;
    }

    deserializeChildGameState(data: SerializedMammothRidersWildlingVictoryGameState["childGameState"]): MammothRidersWildlingVictoryGameState["childGameState"] {
        switch (data.type) {
            case "select-units":
                return SelectUnitsGameState.deserializeFromServer(this, data);
            case "take-control-of-enemy-port":
                return TakeControlOfEnemyPortGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedMammothRidersWildlingVictoryGameState {
    type: "mammoth-riders-wildling-victory";
    childGameState: SerializedSelectUnitsGameState | SerializedTakeControlOfEnemyPortGameState;
}
