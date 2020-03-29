import GameState from "../../../../GameState";
import House from "../../../game-data-structure/House";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import Game from "../../../game-data-structure/Game";
import unitTypes from "../../../game-data-structure/unitTypes";
import Region from "../../../game-data-structure/Region";
import UnitType from "../../../game-data-structure/UnitType";
import Unit from "../../../game-data-structure/Unit";
import unitMusteringRules, {getCostOfMusteringRule} from "../../../game-data-structure/unitMusteringRules";
import BetterMap from "../../../../../utils/BetterMap";
import * as _ from "lodash";
import EntireGame from "../../../../EntireGame";
import ResolveConsolidatePowerGameState
    from "../../../action-game-state/resolve-consolidate-power-game-state/ResolveConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../../../game-data-structure/order-types/ConsolidatePowerOrderType";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import RegionKind from "../../../game-data-structure/RegionKind";
import IngameGameState from "../../../IngameGameState";
import User from "../../../../../server/User";
import Order from "../../../game-data-structure/Order";

type MusteringRule = (Mustering & {cost: number});

export type Mustering = {from: Unit | null; region: Region; to: UnitType};

export enum PlayerMusteringType {
    MUSTERING_WESTEROS_CARD = 0,
    STARRED_CONSOLIDATE_POWER = 1,
    THE_HORDE_DESCENDS_WILDLING_CARD = 2
}

interface ParentGameState extends GameState<any, any> {
    game: Game;
    entireGame: EntireGame;
    ingame: IngameGameState;

    onPlayerMusteringEnd(house: House, musterings: Region[]): void;
}

/**
 * This GameState handles mustering for the Westeros card "Mustering", a mustering from a consolidated power
 * token and a mustering from the Wildling card "The Horde Descends".
 */
export default class PlayerMusteringGameState extends GameState<ParentGameState> {
    house: House;
    type: PlayerMusteringType;

    get game(): Game {
        return this.parentGameState.game;
    }

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    get resolveConsolidatePowerGameState(): ResolveConsolidatePowerGameState {
        if(this.type != PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
            throw new Error("ResolveConsolidatePowerGameState requested but type != STARRED_CONSOLIDATE_POWER");
        }

        return this.parentGameState as ResolveConsolidatePowerGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(house: House, type: PlayerMusteringType): void {
        this.house = house;
        this.type = type;

        if (this.game.world.getControlledRegions(house).filter(r => r.hasStructure).length == 0) {
            this.parentGameState.ingame.log({
                type: "player-mustered",
                house: house.id,
                musterings: []
            });

            this.parentGameState.onPlayerMusteringEnd(house, []);
        }
    }

    onServerMessage(_: ServerMessage): void {

    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "muster") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const musterings = new BetterMap(
                message.units.map(([regionId, recruitements]) => {
                    return [
                        this.game.world.regions.get(regionId),
                        recruitements.map(({from, to, region}) => {
                            const musteringRegion = this.game.world.regions.get(region);

                            return {
                                from: from ? musteringRegion.units.get(from) : null,
                                region: musteringRegion,
                                to: unitTypes.get(to)
                            };
                        })
                    ] as [Region, Mustering[]];
                })
            );

            if (this.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER
                || this.type == PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD
            ) {
                // If the mustering is from a starred consolidate power or "The hord descends",
                // there can only be mustering from one region
                if (musterings.size > 1) {
                    return;
                }
            }

            if (!this.isMusteringValid(musterings)) {
                return;
            }

            for (const [originatingRegion, recruitements] of musterings.entries) {
                // Check that the originating region is controlled by the house
                if (originatingRegion.getController() != this.house) {
                    return;
                }

                if (this.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
                    // If the mustering is from a starred consolidate power, then there
                    // must be a starred consolidate power in the region
                    if (!(this.parentGameState instanceof ResolveConsolidatePowerGameState)) {
                        return;
                    }

                    const order = this.getConsolidatePowerOrder(originatingRegion);
                    if(!order) {
                        return;
                    }

                    if (musterings.entries[0][1].length > 0 && !order.type.starred) {
                        return;
                    }
                }

                // A unit has not been twiced used for transformation
                const transformedUnits = recruitements.filter(({from}) => from).map(({from}) => from);
                if (_.uniq(transformedUnits).length != transformedUnits.length) {
                    return;
                }
            }

            // Remove units that will be used to upgrade, and add mustered units
            musterings.entries.forEach(([_, recruitements]) => {
                recruitements.forEach(({from, to, region}) => {
                    if (from) {
                        this.ingame.transformUnits(region, [from], to);
                    } else {
                        const unit = this.game.createUnit(region, to, this.house);

                        region.units.set(unit.id, unit);
                        this.entireGame.broadcastToClients({
                            type: "add-units",
                            units: [[region.id, [unit.serializeToClient()]]]
                        })
                    }
                });
            });

            if (this.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
                if (musterings.size > 0) {
                    const entry = musterings.entries[0];
                    const startingRegion = entry[0];
                    if (entry[1].length == 0) {
                        // The CP was resolved to get Power tokens
                        this.resolveConsolidatePowerGameState.resolveConsolidatePowerOrderForPt(startingRegion, this.house);
                        this.resolveConsolidatePowerGameState.onPlayerMusteringEnd(this.house, [startingRegion]);
                        return;
                    }
                }
            }

            this.parentGameState.ingame.log({
                type: "player-mustered",
                house: this.house.id,
                musterings: musterings.map((region, musterings) =>
                    [region.id, musterings.map(m => ({region: m.region.id, from: m.from ? m.from.type.id : null, to: m.to.id}))]
                )
            });

            this.parentGameState.onPlayerMusteringEnd(this.house, musterings.entries.map(([region, _]) => region));
        }
    }

    muster(musterings: BetterMap<Region, Mustering[]>): void {
        this.entireGame.sendMessageToServer({
            type: "muster",
            units: musterings.entries.map(([region, recruitements]) => [
                region.id,
                recruitements.map(({from, to, region}) => ({from: from ? from.id : null, to: to.id, region: region.id}))
            ])
        });
    }

    private getConsolidatePowerOrder(region: Region): Order | null {
        if (this.type != PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
            throw new Error("isConsolidatePowerOrderPresent() called but type != STARRED_CONSOLIDATE_POWER");
        }

        const order = this.resolveConsolidatePowerGameState.actionGameState.ordersOnBoard.tryGet(region, null);
        if(!order) {
            return null;
        }

        if(order.type instanceof ConsolidatePowerOrderType) {
            return order;
        }

        return null;
    }

    hasConsolidatePowerOrder(region: Region): boolean {
        if(this.getConsolidatePowerOrder(region)) {
            return true;
        }

        return false;
    }

    hasStarredConsolidatePowerOrder(region: Region): boolean {
        const order = this.getConsolidatePowerOrder(region);

        if (order) {
            return order.type.starred;
        }

        return false;
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    isMusteringValid(musterings: BetterMap<Region, Mustering[]>): boolean {
        // Incremental approach:
        // Start from an empty map of musterings, and check that the first mustering rule is a valid rule,
        // Then from a map with the first entry, check that the second mustering rule is a valid rule,
        // ...
        return musterings.entries.every(([originatingRegion, recruitements], mi) => {
            return recruitements.every((recruitement, ri) => {
                // Create the map of the previous musterings
                const previousMusterings = new BetterMap(
                    musterings.entries.slice(0, mi).concat([[originatingRegion, recruitements.slice(0, ri)]])
                );

                const validMusteringRules = this.getValidMusteringRules(originatingRegion, previousMusterings);
                // Check if the valid mustering rules contains this recruitement,
                // if not, then this rule is invalid
                return validMusteringRules
                    .find(r => r.region == recruitement.region
                        && r.rules.find(r => r.from == recruitement.from && r.to == recruitement.to) != null
                    ) != null;
            });
        });
    }

    getValidMusteringRules(originatingRegion: Region, musterings: BetterMap<Region, Mustering[]>): {region: Region; rules: MusteringRule[]}[] {
        const possibleRecruitementRegions = [originatingRegion]
            .concat(this.game.world.getNeighbouringRegions(originatingRegion)
                .filter(r => r.type.kind == RegionKind.SEA)
            )
            // Can't recruit in a enemy-controled territory
            .filter(r => r.getController() == null || r.getController() == this.house)
            // Can't recruit into a blocked region, e.g. an adjacent blocked sea
            .filter(r => r.garrison > 0 ? r.getController() == this.house : true);

        const pointsLeft = this.getPointsLeft(originatingRegion, musterings);

        return possibleRecruitementRegions.map(recruitmentRegion => {

            return {
                region: recruitmentRegion,
                rules: unitMusteringRules
                    // Is the cost too high
                    .filter(rule => pointsLeft >= rule.cost)
                    // Is it a unit that can walk on this region
                    .filter(rule => rule.to.walksOn == recruitmentRegion.type.kind)
                    // If it's an upgrade, is there a unit that can be used to upgrade
                    .filter(rule => rule.from
                        ? this.getPotentialUnitForUpgrading(musterings, recruitmentRegion, rule.from) != null
                        : true)
                    // Check that the mustering doesn't hit unit limits
                    .filter(rule => {
                        const flattenedMusterings = _.flatMap(musterings.values);
                        // Take into accounts units that have already been mustered
                        const alreadyMusteredUnits = flattenedMusterings.filter(m => m.to == rule.to).length;
                        // Musterings might have freed units that can be used to realize musterings
                        const freedUnits = flattenedMusterings.filter(m => m.from && m.from.type == rule.to).length;
                        return this.game.getAvailableUnitsOfType(this.house, rule.to) + freedUnits - alreadyMusteredUnits;
                      })
                    // Check that the mustering respects supply
                    // An upgrade always respect supply (one unit is removed, one unit is added)
                    // A mustering may break supply
                    .filter(({from, to}) => {
                        if (from != null) {
                            return true;
                        }

                        const addedUnits = this.getAddedUnitsOfMustering(musterings);

                        // Add the unit that will be created by this mustering
                        addedUnits.set(recruitmentRegion, addedUnits.tryGet(recruitmentRegion, [] as UnitType[]).concat([to]));

                        // Check the supply of the new units
                        return !this.game.hasTooMuchArmies(this.house, addedUnits);
                    })
                    .map(rule => {
                        return {
                            region: recruitmentRegion,
                            // The result can be casted since the result was checked in the previous filter
                            from: rule.from ?
                                this.getPotentialUnitForUpgrading(musterings, recruitmentRegion, rule.from) as Unit
                                : null,
                            to: rule.to,
                            cost: rule.cost
                        };
                    })
            };
        })
    }

    getAddedUnitsOfMustering(musterings: BetterMap<Region, Mustering[]>): BetterMap<Region, UnitType[]> {
        const addedUnits = new BetterMap<Region, UnitType[]>();

        musterings.entries.forEach(([_, recruitements]) =>
            recruitements.forEach(({region, from, to}) => {
                if (from != null) {
                    return;
                }

                addedUnits.set(region, addedUnits.tryGet(region, [] as UnitType[]).concat([to]));
            })
        );

        return addedUnits;
    }

    getPointsLeft(region: Region, musterings: BetterMap<Region, Mustering[]>): number {
        return region.castleLevel - this.getUsedPoints(musterings.tryGet(region, []));
    }

    anyUsablePointsLeft(musterings: BetterMap<Region, Mustering[]>): boolean {
        const controlledCastles = this.game.world.getControlledRegions(this.house).filter(r => r.castleLevel > 0);

        switch(this.type) {
            case PlayerMusteringType.MUSTERING_WESTEROS_CARD:
                // Return true if there is any valid mustering rule for any controlled castle unused
                return _.flatMap(controlledCastles.map(c => _.flatMap(this.getValidMusteringRules(c, musterings).map(({rules}) => rules)))).length > 0;
            case PlayerMusteringType.STARRED_CONSOLIDATE_POWER:
                const parentResolveConsolidatePowerGameState: ResolveConsolidatePowerGameState | null = this.parentGameState instanceof ResolveConsolidatePowerGameState ? this.parentGameState : null;
                if(!parentResolveConsolidatePowerGameState) {
                    return false;
                }

                const regions = parentResolveConsolidatePowerGameState.actionGameState.getRegionsWithStarredConsolidatePowerOrderOfHouse(this.house);
                const region = regions.length > 0 ? regions[0] : null;
                if(region) {
                    // Return true if there is there are valid mustering rules left for the starred CP region
                    return _.flatMap(this.getValidMusteringRules(region, musterings).map(({rules}) => rules)).length > 0;
                }

                return false;
            case PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD:
                return false; // todo: Make this work for the wildling card also
        }
    }

    getUsedPoints(musterings: Mustering[]): number {
        return _.sum(musterings.map(m => getCostOfMusteringRule(m.from ? m.from.type : null, m.to)));
    }

    getPotentialUnitForUpgrading(musterings: BetterMap<Region, Mustering[]>, region: Region, fromType: UnitType): Unit | null {
        const units = this.getUnitsLeftToUpgrade(musterings, region);
        const potentialUnit = units.find(u => u.type == fromType);

        // This line is needed because find returns an undefined and not a null
        return potentialUnit ? potentialUnit : null;
    }

    getUnitsLeftToUpgrade(musterings: BetterMap<Region, Mustering[]>, region: Region): Unit[] {
        const recruitments: Mustering[] = musterings.tryGet(region, []);

        // Null values are filtered, thus allowing the cast to Unit[].
        return _.difference(region.units.values, recruitments.map(({from}) => from).filter(f => f) as Unit[]);
    }

    serializeToClient(_: boolean, __: Player | null): SerializedPlayerMusteringGameState {
        return {
            type: "player-mustering",
            house: this.house.id,
            musteringType: this.type
        }
    }

    static deserializeFromServer(parent: ParentGameState, data: SerializedPlayerMusteringGameState): PlayerMusteringGameState {
        const playerMustering = new PlayerMusteringGameState(parent);

        playerMustering.house = parent.game.houses.get(data.house);
        playerMustering.type = data.musteringType;

        return playerMustering;
    }
}

export interface SerializedPlayerMusteringGameState {
    type: "player-mustering";
    house: string;
    musteringType: PlayerMusteringType;
}
