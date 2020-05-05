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
import { getUniqueCombinations } from "../../../../../utils/getUniqueCombinations";
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

            if (!this.isEnoughToReconcile(removedUnits)) {
                // The player has not given enough units to remove to match his supply
                return;
            }

            if (this.isTooMuchReconciled(removedUnits).status) {
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

    getPossibleUnitsToBeRemoved(house: House): Unit[] {
        const regionsWithArmies = this.game.world.getControlledRegions(house).filter(r => r.units.size > 1);
        return _.flatMap(regionsWithArmies, r => r.units.values);
    }

    reconcileArmies(removedUnits: BetterMap<Region, Unit[]>): void {
        this.entireGame.sendMessageToServer({
            type: "reconcile-armies",
            unitsToRemove: removedUnits.entries.map(([region, units]) => [region.id, units.map(u => u.id)])
        });
    }

    isTooMuchReconciled(removedUnits: BetterMap<Region, Unit[]>): {status: boolean; reason: string} {
        if (removedUnits.size == 0) {
            return {status: false, reason: "nothing-removed"};
        }

        // Check if a single unit has been removed
        if (removedUnits.keys.some(r => r.units.size <= 1)) {
            return {status: true, reason: "single-unit-removed"};
        }

        // Check if user removed all units from a region
        if (removedUnits.entries.some(([region, units]) => region.units.size == units.length)) {
            return {status: true, reason: "removed-all-units-from-region"};
        }

        // Check incremental if a part of removedUnits would also be a valid reconcilement
        const combinations = getUniqueCombinations<Region>(Array.of(removedUnits.keys));
        for(const regions of combinations) {
            if(regions.length == removedUnits.size) {
                // The original combination of removedUnits must be skipped
                continue;
            }

            const newRemovedUnits = new BetterMap<Region, Unit[]>();
            regions.forEach(r => {
                newRemovedUnits.set(r, removedUnits.get(r));
            });

            if (this.isEnoughToReconcile(newRemovedUnits)) {
                return {status: true, reason: "too-much-armies-removed"};
            }
        };

        return { status: false, reason: "valid-reconcilement"};
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
