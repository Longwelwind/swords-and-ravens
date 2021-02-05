import GameState from "../../../../GameState";
import ReconcileArmiesGameState from "../ReconcileArmiesGameState";
import House from "../../../game-data-structure/House";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Unit from "../../../game-data-structure/Unit";
import Region from "../../../game-data-structure/Region";
import Game from "../../../game-data-structure/Game";
import BetterMap from "../../../../../utils/BetterMap";
import EntireGame from "../../../../EntireGame";
import UnitType from "../../../game-data-structure/UnitType";
import User from "../../../../../server/User";
import _ from "lodash";

export default class PlayerReconcileArmiesGameState extends GameState<ReconcileArmiesGameState<any>> {
    house: House;

    get reconcileArmiesGameState(): ReconcileArmiesGameState<any> {
        return this.parentGameState;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    firstStart(house: House): void {
        this.house = house;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "reconcile-armies") {
            if (this.house != player.house) {
                return;
            }

            const removedUnits: BetterMap<Region, Unit[]> = new BetterMap(message.unitsToRemove.map(([regionId, unitIds]) => {
                const region = this.game.world.regions.get(regionId);
                const units = unitIds.map(uid => region.units.get(uid));
                return [region, units];
            }));

            // Check that all removed units are from player
            if (_.flatMap(removedUnits.values).some(u => u.allegiance != this.house)) {
                return;
            }

            if (!this.isEnoughToReconcile(removedUnits)) {
                // The player has not given enough units to remove to match his supply
                return;
            }

            if (this.isTooMuchReconciled(removedUnits)) {
                // The player has removed too much armies
                return;
            }

            removedUnits.forEach((units, region) => {
                units.forEach(u => region.units.delete(u.id));

                this.entireGame.broadcastToClients({
                    type: "remove-units",
                    regionId: region.id,
                    unitIds: units.map(u => u.id)
                });
            });

            this.parentGameState.ingame.log({
                type: "armies-reconciled",
                house: this.house.id,
                armies: removedUnits.map((r, us) => [r.id, us.map(u => u.type.id)])
            });

            this.reconcileArmiesGameState.onPlayerReconcileArmiesGameStateEnd(this.house);
        }
    }

    onServerMessage(_message: ServerMessage): void {
        return;
    }

    getAllArmyUnitsOfHouse(house: House): Unit[] {
        return _.flatMap(this.game.world.getControlledRegions(house).filter(r => r.units.size > 1).map(r => r.units.values));
    }

    reconcileArmies(removedUnits: BetterMap<Region, Unit[]>): void {
        this.entireGame.sendMessageToServer({
            type: "reconcile-armies",
            unitsToRemove: removedUnits.entries.map(([region, units]) => [region.id, units.map(u => u.id)])
        });
    }

    isTooMuchReconciled(removedUnits: BetterMap<Region, Unit[]>): boolean {
        // Check incremental if a reconcilement with one unit less would be also sufficient
        const allRemovedUnitIds = _.flatMap(removedUnits.values).map(u => u.id);
        for (const uid of allRemovedUnitIds) {
            const newRemovedUnits = new BetterMap(removedUnits.entries);
            newRemovedUnits.keys.forEach(region => {
                const newUnits = newRemovedUnits.get(region).filter(u => u.id != uid);
                newRemovedUnits.set(region, newUnits);
            });

            if (this.isEnoughToReconcile(newRemovedUnits)) {
                // This reconcilement would be also valid => isTooMuchReconciled is true
                return true;
            }
        }

        return false;
    }

    isEnoughToReconcile(removedUnits: BetterMap<Region, Unit[]>): boolean {
        return !this.game.hasTooMuchArmies(this.house, new BetterMap<Region, UnitType[]>(), removedUnits);
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    serializeToClient(): SerializedPlayerReconcileArmiesGameState {
        return {
            house: this.house.id
        }
    }

    static deserializeFromServer(reconcileArmies: ReconcileArmiesGameState<any>, data: SerializedPlayerReconcileArmiesGameState): PlayerReconcileArmiesGameState {
        const playerReconcileArmies = new PlayerReconcileArmiesGameState(reconcileArmies);

        playerReconcileArmies.house = reconcileArmies.game.houses.get(data.house);

        return playerReconcileArmies;
    }
}

export interface SerializedPlayerReconcileArmiesGameState {
    house: string;
}
