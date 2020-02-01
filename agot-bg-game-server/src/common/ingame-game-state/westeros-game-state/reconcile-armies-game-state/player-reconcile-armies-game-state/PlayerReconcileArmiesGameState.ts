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
import unitMusteringRules from "../../../game-data-structure/unitMusteringRules";
import _ from "lodash";

const unitCosts: BetterMap<UnitType, number> = new BetterMap(unitMusteringRules.filter(r => r.from == null).map(r => [r.to, r.cost]));

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

    firstStart(house: House) {
        this.house = house;
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        if (message.type == "reconcile-armies") {
            if (this.house != player.house) {
                return;
            }

            const removedUnits: BetterMap<Region, Unit[]> = new BetterMap(message.unitsToRemove.map(([regionId, unitIds]) => {
                const region = this.game.world.regions.get(regionId);
                const units = unitIds.map(uid => region.units.get(uid));
                return [region, units];
            }));

            if (!this.checkReconcilement(removedUnits).reconciled) {
                // The player has not given enough units to remove to match his supply
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

    onServerMessage(message: ServerMessage) {

    }

    reconcileArmies(removedUnits: BetterMap<Region, Unit[]>) {
        this.entireGame.sendMessageToServer({
            type: "reconcile-armies",
            unitsToRemove: removedUnits.entries.map(([region, units]) => [region.id, units.map(u => u.id)])
        });
    }

    checkReconcilement(removedUnits: BetterMap<Region, Unit[]>): {reconciled: boolean; reason: string | null} {
        const regionWithArmies = this.game.world.getControlledRegions(this.house).filter(r => r.units.size > 1);
        const currentArmiesSortedByCosts = regionWithArmies.map(r => [r, r.units.values.sort((a, b) => unitCosts.get(a.type) - unitCosts.get(b.type))] as [Region, Unit[]]);
        
        // check if too much or not enough armies are removed
        const allowedArmySizes = this.game.getAllowedArmySizes(this.house);
        let armySizesCheckResult = this.checkArmySizes(this.game.getArmySizes(this.house, new BetterMap<Region, UnitType[]>(), removedUnits).filter(unitCount => unitCount > 1), allowedArmySizes);

        if(!armySizesCheckResult.reconciled) {
            return armySizesCheckResult;
        }

        // check if there is an army which would cause lower costs
        for (const [rmvdUnitsRegion, rmvdUnits] of removedUnits.entries) {
            if(rmvdUnitsRegion.units.size == 1) {
                return {reconciled: false, reason: "A single unit which does not count into supply has been destroyed."}; 
            }

            const originalArmy = rmvdUnitsRegion.units.values;
            // calculate the chosen costs
            const removedCosts = _.sum(rmvdUnits.map(u => u.type).map(t => unitCosts.get(t)));
            // find armies of same size for chosen casualties
            const sortedArmiesWithSameSize = currentArmiesSortedByCosts.filter(([_, units]) => originalArmy.length == units.length);
            // check if there is an army which would cause lower costs
            for (const [r, units] of sortedArmiesWithSameSize) {
                // calculate all possible costs, return true if any of them is lower then the chosen one
                for(let i=0;i<units.length;i++) {
                    const possibleRemovedUnits = new BetterMap<Region, Unit[]>();
                    // this whole process has to be done as we can't just slice the original removed unit count.
                    // e.g. the switch from supply 3,2,2 to 3,2 is tricky:
                    // let's consider following armies with their cost values: (1,1,1) (2,1) (1,1): 
                    // removing the (1,1) army would satisfy the supply limit but it's more expensive than removing the 1 from (2,1)
                    // but when we think we have to remove 2 units the (2,1) would be more expensive and therefore it would accept (1,1)
                    // so we have to slice the our sorted army step by step
                    possibleRemovedUnits.set(r, units.slice(0, i+1));
                    // and re-check the army sizes here again. reason can be safely ignored here.
                    let armySizesCheckResult = this.checkArmySizes(
                        this.game.getArmySizes(this.house,
                        new BetterMap<Region, UnitType[]>(),
                        possibleRemovedUnits)
                        .filter(unitCount => unitCount > 1), allowedArmySizes);

                    if(!armySizesCheckResult.reconciled) {
                        // this is no possible reconcilement => goto next region
                        continue;
                    }

                    const possibleCost = _.sum(possibleRemovedUnits.get(r).map(u => unitCosts.get(u.type))); 
                    if (possibleCost < removedCosts) {
                        // there are lower casualties possible
                        return {reconciled: true, reason: "Warning! There are lower casualties possible."};
                    }
                }                
            };
        }

        // we came here? => that is a valid reconcilement
        return {reconciled: true, reason: null};
    }

    private checkArmySizes(armySizes: number[], allowedArmySizes: number[]): {reconciled: boolean; reason: string | null} {
        if (armySizes.length > allowedArmySizes.length) {
            return {reconciled: false, reason: "Not enough armies have been destroyed yet."};
        }

        if (armySizes.length < allowedArmySizes.length) {
            return {reconciled: false, reason: "Too much armies have been destroyed."};
        }

        for (let i=0;i<armySizes.length;i++) {
            if (armySizes[i] < allowedArmySizes[i]) {
                return {reconciled: false, reason: "Too much armies have been destroyed."};
            } else if (armySizes[i] > allowedArmySizes[i]) {
                return {reconciled: false, reason: "Not enough armies have been destroyed yet."};
            }
        };

        return {reconciled: true, reason: null};
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
