import GameState from "../../../GameState";
import House from "../../game-data-structure/House";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import PayDebtsGameState from "../PayDebtsGameState";
import User from "../../../../server/User";
import Unit from "../../game-data-structure/Unit";
import groupBy from "../../../../utils/groupBy";
import BetterMap from "../../../../utils/BetterMap";
import Region from "../../game-data-structure/Region";
import _ from "lodash";

export default class ResolveSinglePayDebtGameState extends GameState<PayDebtsGameState> {
    house: House;
    debt: number;

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get resolver(): House {
        const fiefdomsWithoutVassals = this.ingame.game.fiefdomsTrack.filter(h => !this.ingame.isVassalHouse(h));
        return fiefdomsWithoutVassals.filter(h => h != this.house)[0];
    }

    get availableUnitsOfHouse(): Unit[] {
        return this.ingame.world.getUnitsOfHouse(this.house);
    }

    firstStart(house: House, debt: number): void {
        this.house = house;
        this.debt = debt;

        const availableUnits = this.availableUnitsOfHouse;
        if (availableUnits.length <= debt) {
            this.removeUnitsAndProceedNextResolve(availableUnits, true);
        } else if (availableUnits.every(u => u.region == availableUnits[0].region && u.type == availableUnits[0].type)) {
            this.removeUnitsAndProceedNextResolve(_.take(availableUnits, debt), true);
        }
    }

    removeUnitsAndProceedNextResolve(units: Unit[], resolvedAutomatically = false): void {
        const unitsPerRegion = groupBy(units, unit => unit.region);

        unitsPerRegion.forEach((units, region) => {
            units.forEach(u => region.units.delete(u.id));
            this.ingame.broadcastRemoveUnits(region, units);
        });

        this.parentGameState.ingame.log({
            type: "debt-paid",
            house: this.house.id,
            resolver: this.resolver.id,
            units: unitsPerRegion.map((r, us) => [r.id, us.map(u => u.type.id)])
        }, resolvedAutomatically);

        this.parentGameState.proceedNextResolve();
    }

    sendPayDebt(unitsToRemove: [Region, Unit[]][]): void {
        this.entireGame.sendMessageToServer({
            type: "reconcile-armies",
            unitsToRemove: unitsToRemove.map(([region, units]) => [region.id, units.map(u => u.id)])
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "reconcile-armies") {
            if (this.ingame.getControllerOfHouse(this.resolver) != player) {
                return;
            }

            const removedUnits = new BetterMap(message.unitsToRemove.map(([regionId, unitIds]) => {
                const region = this.ingame.game.world.regions.get(regionId);
                const units = unitIds.map(uid => region.units.get(uid));
                return [region, units];
            }));

            // Check that enough units have been selected and that all removed units are from same house
            const flatRemovedUnits = _.flatMap(removedUnits.values);
            if (flatRemovedUnits.length < this.debt || flatRemovedUnits.some(u => u.allegiance != this.house)) {
                return;
            }

            this.removeUnitsAndProceedNextResolve(flatRemovedUnits);
        }
    }

    onServerMessage(_message: ServerMessage): void {
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.resolver).user];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedResolveSinglePayDebtGameState {
        return {
            type: "resolve-single-pay-debt",
            house: this.house.id,
            debt: this.debt
        };
    }

    static deserializeFromServer(parent: PayDebtsGameState, data: SerializedResolveSinglePayDebtGameState): ResolveSinglePayDebtGameState {
        const resolveSinglePayDebt = new ResolveSinglePayDebtGameState(parent);
        resolveSinglePayDebt.house = parent.ingame.game.houses.get(data.house);
        resolveSinglePayDebt.debt = data.debt;
        return resolveSinglePayDebt;
    }
}

export interface SerializedResolveSinglePayDebtGameState {
    type: "resolve-single-pay-debt";
    house: string;
    debt: number;
}
