import ResolveMarchOrderGameState from "../ResolveMarchOrderGameState";
import GameState from "../../../../GameState";
import House from "../../../game-data-structure/House";
import World from "../../../game-data-structure/World";
import Region from "../../../game-data-structure/Region";
import Unit from "../../../game-data-structure/Unit";
import EntireGame from "../../../../EntireGame";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import Player from "../../../Player";
import ActionGameState from "../../ActionGameState";
import _ from "lodash";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import {observable} from "mobx";
import Game from "../../../game-data-structure/Game";
import BetterMap from "../../../../../utils/BetterMap";
import RegionKind from "../../../game-data-structure/RegionKind";
import User from "../../../../../server/User";
import MarchOrderType from "../../../game-data-structure/order-types/MarchOrderType";
import { land, port } from "../../../game-data-structure/regionTypes";
import { destroyAllShipsInPort } from "../../../../ingame-game-state/port-helper/PortHelper";
import IngameGameState from "../../../IngameGameState";

export default class ResolveSingleMarchOrderGameState extends GameState<ResolveMarchOrderGameState> {
    @observable house: House;
    supportersAgainstNeutralForce: BetterMap<Region, House[]> | null = null;

    constructor(resolveMarchOrderGameState: ResolveMarchOrderGameState) {
        super(resolveMarchOrderGameState);
    }

    get entireGame(): EntireGame {
        return this.resolveMarchOrderGameState.entireGame;
    }

    get ingame(): IngameGameState {
        return this.actionGameState.parentGameState;
    }

    get actionGameState(): ActionGameState {
        return this.resolveMarchOrderGameState.parentGameState;
    }

    get resolveMarchOrderGameState(): ResolveMarchOrderGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.resolveMarchOrderGameState.game;
    }

    get world(): World {
        return this.resolveMarchOrderGameState.world;
    }

    /**
     * Server
     */

    firstStart(house: House, supportersPerRegion: BetterMap<Region, House[]> | null = null): void {
        this.house = house;
        this.supportersAgainstNeutralForce = supportersPerRegion;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "resolve-march-order") {
            if (this.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const startingRegion = this.world.regions.get(message.startingRegionId);

            const moves = message.moves.map(([regionId, unitIds]) => [
                this.world.regions.get(regionId),
                unitIds.map(uid => startingRegion.units.get(uid))
            ] as [Region, Unit[]]);

            // Check that there is indeed a march order there
            if (!this.getRegionsWithMarchOrder().includes(startingRegion)) {
                return;
            }

            if (!this.areValidMoves(startingRegion, moves)) {
                // todo: Add reason
                return;
            }

            // Check that at most one move triggers a fight
            const movesThatTriggerAttack = this.getMovesThatTriggerAttack(moves);
            // This has been checked earlier in "this.areValidMoves" but it's never bad
            // to check twice
            if (movesThatTriggerAttack.length > 1) {
                console.warn("More than one move that triggers a fight");
                return;
            }

            const movesThatDontTriggerAttack = _.difference(moves, movesThatTriggerAttack);

            // Check if the player was capable of placing a power token
            let leftPowerToken: boolean | null = null;
            const canLeavePowerToken = this.canLeavePowerToken(startingRegion, new BetterMap(moves)).success;
            const isVassal = this.ingame.isVassalHouse(this.house);

            if ((message.leavePowerToken && canLeavePowerToken) || (isVassal && canLeavePowerToken)) {
                startingRegion.controlPowerToken = this.house;
                if (!isVassal) {
                    this.house.powerTokens -= 1;

                    this.entireGame.broadcastToClients({
                        type: "change-power-token",
                        houseId: this.house.id,
                        powerTokenCount: this.house.powerTokens
                    });
                }

                this.entireGame.broadcastToClients({
                    type: "change-control-power-token",
                    regionId: startingRegion.id,
                    houseId: this.house.id
                });

                leftPowerToken = true;
            }

            if (canLeavePowerToken && !message.leavePowerToken) {
                leftPowerToken = false;
            }

            const doNotLogMarchResolved = movesThatDontTriggerAttack.length == 0 && movesThatTriggerAttack.length > 0;

            if (!doNotLogMarchResolved) {
                this.actionGameState.ingame.log({
                    type: "march-resolved",
                    house: this.house.id,
                    startingRegion: startingRegion.id,
                    moves: movesThatDontTriggerAttack.map(([r, us]) => [r.id, us.map(u => u.type.id)]),
                    orderType: this.actionGameState.ordersOnBoard.has(startingRegion) ? this.actionGameState.ordersOnBoard.get(startingRegion).type.id : undefined
                });
            }

            // Execute the moves that don't trigger a fight
            movesThatDontTriggerAttack.forEach(([region, units]) => {
                this.resolveMarchOrderGameState.moveUnits(startingRegion, units, region);
            });

            // It may be possible, that a user left a castle with ships in port empty.
            // If so, the ships in the port have to be destroyed.
            // It would be nice to use findOrphanedShipsAndDestroyThem here.
            // But for time being we have to reimplement this a bit different
            // as the units which will march to combat stay in the startingRegion until the combat is resolved.
            // Therefore getController() calls inside findOrphanedShipsAndDestroyThem() will prevent
            // us from finding orphaned ships.
            // On the other hand destroying the ships after the march has been fully resolved is too late
            // as a possible attacker may have retreated to the starting region
            // which would prevent the destruction of the ships.
            // So there is no other way as checking this situations explicity now:
            this.destroyPossibleShipsInAdjacentPortIfNecessary(startingRegion, movesThatTriggerAttack);

            // If there was a move that trigger a fight, do special processing
            if (movesThatTriggerAttack.length > 0) {
                // There should be only one attack move
                const [region, army] = movesThatTriggerAttack[0];

                // 2 kind of attack moves possible:
                const enemy = region.getController();
                if (enemy) {
                    // Attack against an other house

                    this.actionGameState.ingame.log({
                        type: "attack",
                        attacker: this.house.id,
                        attacked: enemy.id,
                        attackingRegion: startingRegion.id,
                        attackedRegion: region.id,
                        units: army.map(u => u.type.id),
                        orderType: this.actionGameState.ordersOnBoard.has(startingRegion) ? this.actionGameState.ordersOnBoard.get(startingRegion).type.id : undefined
                    });

                    if (leftPowerToken != null) {
                        this.ingame.log({
                            type: "leave-power-token-choice",
                            house: this.house.id,
                            region: startingRegion.id,
                            leftPowerToken: leftPowerToken
                        });
                    }

                    this.resolveMarchOrderGameState.proceedToCombat(
                        startingRegion, region, this.house, enemy, army, this.actionGameState.ordersOnBoard.get(startingRegion)
                    );
                    return;
                } else {
                    // Attack against a neutral force
                    // That the player put up enough strength against the neutral force was
                    // already checked earlier. No need to re-check it now, just process the attack.
                    this.actionGameState.ingame.log({
                        type: "attack",
                        attacker: this.house.id,
                        attacked: null,
                        attackingRegion: startingRegion.id,
                        attackedRegion: region.id,
                        units: army.map(u => u.type.id),
                        orderType: this.actionGameState.ordersOnBoard.has(startingRegion) ? this.actionGameState.ordersOnBoard.get(startingRegion).type.id : undefined
                    });

                    const oldGarrisonStrength = region.garrison;
                    region.garrison = 0;
                    this.resolveMarchOrderGameState.moveUnits(startingRegion, army, region);

                    this.entireGame.broadcastToClients({
                        type: "change-garrison",
                        region: region.id,
                        newGarrison: region.garrison
                    });

                    this.ingame.log({
                        type: "garrison-removed",
                        region: region.id,
                        strength: oldGarrisonStrength
                    });
                }
            }

            if (leftPowerToken != null) {
                this.ingame.log({
                    type: "leave-power-token-choice",
                    house: this.house.id,
                    region: startingRegion.id,
                    leftPowerToken: leftPowerToken
                });
            }

            // Remove the order
            this.actionGameState.removeOrderFromRegion(startingRegion, false, this.house, false, "yellow");
            this.resolveMarchOrderGameState.onResolveSingleMarchOrderGameStateFinish(this.house);
        }
    }

    private destroyPossibleShipsInAdjacentPortIfNecessary(startingRegion: Region, movesThatTriggerAttack: [Region, Unit[]][]): void {
        // Check if user left a simple castle empty
        // If so, destroy all existing ships in possible adjacent port
        // This has to be done now as user would keep control of the ships in case he initiates a battle but loses it

        if (startingRegion.superControlPowerToken) {
            // Regain ships to the original owner of a capital is handled later
            // in parentGameState onResolveSingleMarchOrderFinished
            return;
        }

        if (startingRegion.controlPowerToken == this.house) {
            // Starting region is controlled by a Power Token and no ships need to be destroyed
            return;
        }

        // Check if there is a port with ships adjacent to the starting region
        const portOfStartingRegion = this.game.world.getAdjacentPortOfCastle(startingRegion);
        if (!portOfStartingRegion || portOfStartingRegion.units.size == 0) {
            return;
        }

        // Now let's check if user still controls the starting region

        // In case there are no pending combats we simply can use getController()
        if(movesThatTriggerAttack.length == 0 && startingRegion.getController() == this.house) {
            return;
        }

        // In case of a pending combat it's a bit more complicated
        // as the attacking units are still present in the starting region
        // and thus getController() can't be used. We have to check if all units
        // marched to combat. As all non combat moves have already been executed we check
        // if original units count is equal to attacking units count.
        if (_.flatMap(movesThatTriggerAttack.map(([_, units]) => units)).length != startingRegion.units.size) {
            return;
        }

        // User really left a castle with ships empty. The ships must be destroyed.
        const destroyedShipCount = destroyAllShipsInPort(portOfStartingRegion, this.ingame, this.parentGameState.actionGameState);

        this.parentGameState.ingameGameState.log({
            type: "ships-destroyed-by-empty-castle",
            castle: startingRegion.id,
            house: this.house.id,
            port: portOfStartingRegion.id,
            shipCount: destroyedShipCount
        });
    }

    onServerMessage(_message: ServerMessage): void {
        return;
    }

    areValidMoves(startingRegion: Region, moves: [Region, Unit[]][]): boolean {
        const movingUnits = _.flatMap(moves.map(([_, u]) => u));
        const validUnits = this.getValidMarchUnits(startingRegion);

        if (!movingUnits.every(u => validUnits.includes(u))) {
            return false;
        }

        // Check if each unit is assigned to only one target region
        if (movingUnits.length != _.uniqBy(movingUnits, u => u.id).length) {
            return false;
        }

        return moves.every(
            ([regionToward, army], i) => this.getValidTargetRegions(startingRegion, moves.slice(0, i), army).includes(regionToward)
        );
    }

    getValidMarchUnits(startingRegion: Region): Unit[] {
        return startingRegion.units.values.filter(u => !u.wounded);
    }

    getWaitedUsers(): User[] {
        return [this.actionGameState.ingame.getControllerOfHouse(this.house).user];
    }

    /**
     * Gives the list of regions that `movingArmy` can move to, given a starting region
     * and a list of already valid `moves`.
     * @param startingRegion
     * @param moves
     * @param movingArmy
     */
    getValidTargetRegions(startingRegion: Region, moves: [Region, Unit[]][], movingArmy: Unit[]): Region[] {
        const movesThatTriggerAttack = this.getMovesThatTriggerAttack(moves);
        const movesThatDontTriggerAttack = _.difference(moves, movesThatTriggerAttack);
        const attackMoveAlreadyPresent = movesThatTriggerAttack.length > 0;

        return this.world.getReachableRegions(startingRegion, this.house, movingArmy)
            // Filter out destinations that are already used
            .filter(r => !moves.map(([r, _a]) => r).includes(r))
            // Check that this new move doesn't trigger another attack
            .filter(r => attackMoveAlreadyPresent ? !this.doesMoveTriggerAttack(r) : true)
            // Check that if the destination a port, the adjacent land area must
            // be controlled by the resolver
            .filter(r => r.type == port ? this.world.getAdjacentLandOfPort(r).getController() == this.house : true)
            // Check that the non-combat moves doesn't exceed supply limits
            .filter(r => !this.doesMoveExceedSupply(startingRegion, new BetterMap(movesThatDontTriggerAttack.concat([[r, movingArmy]]))))
            // If the move is an attack on a neutral force, then there must be sufficient combat strength
            // to overcome the neutral force
            .filter(r => {
                if (r.garrison > 0 && r.getController() == null) {
                    return this.hasEnoughToAttackNeutralForce(startingRegion, movingArmy, r, movesThatDontTriggerAttack);
                }

                return true;
            })
            // A commander cannot march into regions of one of its vassal. A vassal cannot march into regions of its commander
            // or into regions of an other vassal of its commander
            .filter(r => !this.ingame.getOtherVassalFamilyHouses(this.house).includes(r.getController()))
            // Vassals cannot march into ports
            .filter(r => r.type == port ? !this.ingame.isVassalHouse(this.house) : true);
    }

    // Client-side only
    getUsedButStillValidTargetRegions(startingRegion: Region, moves: BetterMap<Region, Unit[]>, movingArmy: Unit[]): Region[] {
        return moves.keys.filter(region => {
            const oldArmy = moves.get(region);
            const movesWithoutOldArmy = moves.entries.filter(([r, _u]) => r != region);
            // If valid target regions still include the region, the selected units can march into it
            return this.getValidTargetRegions(startingRegion, movesWithoutOldArmy, _.concat(oldArmy, movingArmy)).includes(region);
        });
    }

    getReachableNeutralForces(): Region[] {
        return _.flatMap(this.getRegionsWithMarchOrder()
            // Neutral forces just can be taken by land units
            .filter(r => r.type == land)
            // We assume the whole army wants to move as getReachableRegions just uses walksOn to filter for land or sea regions
            // and we filtered for land previously
            .map(startingRegion => this.world.getReachableRegions(startingRegion, this.house, startingRegion.units.values))
        // Neutral forces have a garrison but no controller
        ).filter(r => r.garrison > 0 && !r.isBlocked && r.getController() == null);
    }

    getPossibleSupportingHousesAgainstNeutralForces(): BetterMap<Region, House[]> | null {
        const reachableNeutralForces = this.getReachableNeutralForces();
        if (reachableNeutralForces.length == 0) {
            return null;
        }

        const result = new BetterMap<Region, House[]>();

        reachableNeutralForces.forEach(neutralForce => {
            const supportingRegions = this.actionGameState.getPossibleSupportingRegions(neutralForce).filter(({region}) =>
                region.getController() != this.house && !this.ingame.getOtherVassalFamilyHouses(this.house).includes(region.getController()));
            const houses = _.uniq(supportingRegions.map(({region}) => region.getController() as House));

            if (houses.length > 0) {
                result.set(neutralForce, houses);
            }
        });

        return result.size > 0 ? result : null;
    }

    getMovesThatTriggerAttack(moves: [Region, Unit[]][]): [Region, Unit[]][] {
        // Moves that trigger an attack are those that go into ennemy territory
        // or a neutral force.
        return moves.filter(([region, _army]) => this.doesMoveTriggerAttack(region));
    }

    doesMoveTriggerAttack(regionToward: Region): boolean {
        const controller = regionToward.getController();
        if (controller != null) {
            if (controller != this.house) {
                // A move that goes into an enemy-controlled territory with no units,
                // but with a garrison is considered an attack.
                return regionToward.units.size > 0 || regionToward.garrison > 0;
            }
        } else {
            return regionToward.garrison > 0;
        }

        return false;
    }

    getRegionsWithMarchOrder(): Region[] {
        return this.actionGameState.getRegionsWithMarchOrderOfHouse(this.house);
    }

    hasEnoughToAttackNeutralForce(startingRegion: Region, army: Unit[], targetRegion: Region, movesThatDontTriggerAttack: [Region, Unit[]][]): boolean {
        const marchOrder = this.actionGameState.ordersOnBoard.get(startingRegion);

        if (!(marchOrder.type instanceof MarchOrderType)) {
            throw new Error();
        }

        return this.getCombatStrengthOfArmyAgainstNeutralForce(army, targetRegion.hasStructure)
            + this.getSupportCombatStrengthAgainstNeutralForce(targetRegion, movesThatDontTriggerAttack)
            + this.getForeignSupportCombatStrengthAgainstNeutralForce(targetRegion)
            + marchOrder.type.attackModifier >= targetRegion.garrison;
    }

    private getCombatStrengthOfArmyAgainstNeutralForce(army: Unit[], attackingAStructure: boolean, additionalSupportingUnits: Unit[] | null = null): number {
        let strength = army
            .map(u => u.getCombatStrength(attackingAStructure))
            .reduce(_.add, 0);

        if (additionalSupportingUnits) {
            strength += additionalSupportingUnits.map(u => u.getCombatStrength(attackingAStructure)).reduce(_.add, 0);
        }

        return strength;
    }

    private getSupportCombatStrengthAgainstNeutralForce(attackedRegion: Region, movesThatDontTriggerAttack: [Region, Unit[]][]): number {
        const movesThatDontTriggerAttackMap = new BetterMap(movesThatDontTriggerAttack);
        return this.actionGameState.getPossibleSupportingRegions(attackedRegion)
            .filter(({region}) => region.getController() == this.house || this.ingame.getOtherVassalFamilyHouses(this.house).includes(region.getController()))
            .map(({region, support}) => this.getCombatStrengthOfArmyAgainstNeutralForce(region.units.values, attackedRegion.hasStructure, movesThatDontTriggerAttackMap.tryGet(region, null)) + support.supportModifier)
            .reduce(_.add, 0);
    }

    private getForeignSupportCombatStrengthAgainstNeutralForce(attackedRegion: Region): number {
        if (!this.supportersAgainstNeutralForce || !this.supportersAgainstNeutralForce.has(attackedRegion)) {
            return 0;
        }

        const supporters = this.supportersAgainstNeutralForce.get(attackedRegion);
        return this.actionGameState.getPossibleSupportingRegions(attackedRegion)
            .filter(({region}) => supporters.includes(region.getController() as House))
            .map(({region, support}) => this.getCombatStrengthOfArmyAgainstNeutralForce(region.units.values, attackedRegion.hasStructure) + support.supportModifier)
            .reduce(_.add, 0);
    }

    sendMoves(startingRegion: Region, moves: BetterMap<Region, Unit[]>, leavePowerToken: boolean): void {
        this.entireGame.sendMessageToServer({
            type: "resolve-march-order",
            moves: moves.entries.map(([region, units]) => [region.id, units.map(u => u.id)]),
            startingRegionId: startingRegion.id,
            leavePowerToken: leavePowerToken
        });
    }

    doesMoveExceedSupply(startingRegion: Region, moves: BetterMap<Region, Unit[]>): boolean {
        return this.game.hasTooMuchArmies(
            this.house,
            new BetterMap(moves.entries.map(([region, units]) => [region, units.map(u => u.type)])),
            new BetterMap([
                [startingRegion, ([] as Unit[]).concat(...moves.values)]
            ])
        );
    }

    canLeavePowerToken(startingRegion: Region, moves: BetterMap<Region, Unit[]>): {success: boolean; reason: string} {
        if (startingRegion.superControlPowerToken == this.house) {
            return {success: false, reason: "already-capital"};
        }

        if (startingRegion.controlPowerToken) {
            return {success: false, reason: "already-power-token"};
        }

        if (startingRegion.type.kind != RegionKind.LAND) {
            return {success: false, reason: "not-a-land"};
        }

        // The player can place a power token if all units go out
        if (!this.haveAllUnitsLeft(startingRegion, moves)) {
            return {success: false, reason: "no-all-units-go"}
        }

        if (this.ingame.isVassalHouse(this.house)) {
            return {success: true, reason: "vassals-always-leave-power-token"}
        }

        if (this.house.powerTokens == 0) {
            return {success: false, reason: "no-power-token-available"};
        }

        return {success: true, reason: "ok"};
    }

    haveAllUnitsLeft(startingRegion: Region, moves: BetterMap<Region, Unit[]>): boolean {
        return _.sum(moves.values.map(us => us.length)) == startingRegion.units.size;
    }

    callForSupportAgainstNeutralForces(): void {
        this.entireGame.sendMessageToServer({
            type: "call-for-support-against-neutral-force"
        });
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedResolveSingleMarchOrderGameState {
        return {
            type: "resolve-single-march",
            houseId: this.house.id,
            supportersAgainstNeutralForce: this.supportersAgainstNeutralForce
                ? this.supportersAgainstNeutralForce.entries.map(([r, houses]) => [r.id, houses.map(h => h.id)])
                : null
        };
    }

    static deserializeFromServer(resolveMarchOrderGameState: ResolveMarchOrderGameState, data: SerializedResolveSingleMarchOrderGameState): ResolveSingleMarchOrderGameState {
        const resolveSingleMarchOrderGameState = new ResolveSingleMarchOrderGameState(resolveMarchOrderGameState);

        resolveSingleMarchOrderGameState.house = resolveMarchOrderGameState.game.houses.get(data.houseId);
        resolveSingleMarchOrderGameState.supportersAgainstNeutralForce = data.supportersAgainstNeutralForce
            ? new BetterMap(data.supportersAgainstNeutralForce.map(([rid, hids]) =>
                [resolveMarchOrderGameState.world.regions.get(rid), hids.map(hid => resolveMarchOrderGameState.game.houses.get(hid))]))
            : null;

        return resolveSingleMarchOrderGameState;
    }
}

export interface SerializedResolveSingleMarchOrderGameState {
    type: "resolve-single-march";
    houseId: string;
    supportersAgainstNeutralForce: [string, string[]][] | null;
}
