import House, {SerializedHouse} from "./House";
import World, {SerializedWorld} from "./World";
import Region from "./Region";
import UnitType from "./UnitType";
import Unit from "./Unit";
import Order from "./Order";
import orders from "./orders";
import * as _ from "lodash";
import {observable} from "mobx";
import WesterosCard, {SerializedWesterosCard} from "./westeros-card/WesterosCard";
import shuffle from "../../../utils/shuffle";
import WildlingCard, {SerializedWildlingCard} from "./wildling-card/WildlingCard";
import BetterMap from "../../../utils/BetterMap";
import HouseCard from "./house-card/HouseCard";
import {land, port} from "./regionTypes";
import PlanningRestriction from "./westeros-card/planning-restriction/PlanningRestriction";
import WesterosCardType from "./westeros-card/WesterosCardType";

export const MAX_WILDLING_STRENGTH = 12;

export default class Game {
    lastUnitId = 0;

    world: World;
    houses: BetterMap<string, House> = new BetterMap<string, House>();
    @observable turn = 0;
    @observable ironThroneTrack: House[];
    @observable fiefdomsTrack: House[];
    @observable valyrianSteelBladeUsed = false;
    @observable kingsCourtTrack: House[];
    @observable wildlingStrength = 2;
    wildlingDeck: WildlingCard[];
    supplyRestrictions: number[][];
    starredOrderRestrictions: number[];
    westerosDecks: WesterosCard[][];
    skipRavenPhase: boolean;
    structuresCountNeededToWin: number;
    maxTurns: number;
    maxPowerTokens: number;

    get ironThroneHolder(): House {
        return this.getTokenHolder(this.ironThroneTrack);
    }

    get valyrianSteelBladeHolder(): House {
        return this.getTokenHolder(this.fiefdomsTrack);
    }

    get ravenHolder(): House {
        return this.getTokenHolder(this.kingsCourtTrack);
    }

    get influenceTracks(): House[][] {
        return [
            this.ironThroneTrack,
            this.fiefdomsTrack,
            this.kingsCourtTrack
        ];
    }

    get remainingWesterosCardTypes(): BetterMap<WesterosCardType, number>[] {
        const result: BetterMap<WesterosCardType, number>[] = [];

        this.westerosDecks.forEach(wd => {
            const map = new BetterMap<WesterosCardType, number>();
            wd.sort((a, b) => a.type.name.localeCompare(b.type.name)).forEach(wc => {
                if (wc.discarded) {
                    return;
                }
                if (!map.has(wc.type)) {
                    map.set(wc.type, 0);
                }
                map.set(wc.type, map.get(wc.type) + 1);
            });
            result.push(map);
        });

        return result;
    }

    getTokenHolder(track: House[]): House {
        return track[0];
    }

    getAvailableOrders(allPlacedOrders: BetterMap<Region, Order | null>, house: House, planningRestrictions: PlanningRestriction[]): Order[] {
        const placedOrders = allPlacedOrders.entries
            .filter(([region, _order]) => region.getController() == house)
            .map(([_region, order]) => order as Order);

        let leftOrders = _.difference(
            orders.values,
            placedOrders
        );

        // Remove restricted orders
        leftOrders = leftOrders.filter(order => planningRestrictions.every(restriction => !restriction.restriction(order.type)));

        // Remove starred orders if the house used more than allowed
        const starredOrderLeft = this.getAllowedCoundOfStarredOrders(house) - placedOrders.filter(o => o && o.type.starred).length;

        leftOrders = leftOrders.filter(o => !o.type.starred || (o.type.starred && starredOrderLeft > 0));

        return leftOrders;
    }

    getTurnOrder(): House[] {
        return this.ironThroneTrack;
    }

    whoIsAheadInTrack(track: House[], first: House, second: House): House {
        return this.isAheadInTrack(track, first, second) ? first : second;
    }

    isAheadInTrack(track: House[], first: House, second: House): boolean {
        return track.indexOf(first) < track.indexOf(second);
    }

    getNextInTurnOrder(house: House | null, except: House | null = null): House {
        const turnOrder = this.getTurnOrder();

        if (house == null) {
            return turnOrder[0];
        }

        const i = turnOrder.indexOf(house);

        const nextHouse = turnOrder[(i + 1) % turnOrder.length];

        if (nextHouse == except) {
            return this.getNextInTurnOrder(nextHouse);
        }

        return nextHouse;
    }

    areVictoryConditionsFulfilled(): boolean {
        const numberStructuresPerHouse = this.houses.values.map(h => this.getTotalHeldStructures(h));

        return numberStructuresPerHouse.some(n => n >= this.structuresCountNeededToWin);
    }

    getPotentialWinners(): House[] {
        const victoryConditions: ((h: House) => number)[] = [
            (h: House) => -this.getTotalHeldStructures(h),
            (h: House) => -this.world.regions.values.filter(r => r.getController() == h).filter(r => r.type == land).length,
            (h: House) => -h.supplyLevel,
            (h: House) => this.ironThroneTrack.indexOf(h)
        ];

        return _.sortBy(this.houses.values, victoryConditions);
    }

    getPotentialWinner(): House {
        return this.getPotentialWinners()[0];
    }

    getCountUnitsOfType(house: House, unitType: UnitType): number {
        return this.world.getUnitsOfHouse(house).filter(u => u.type == unitType).length;
    }

    getAvailableUnitsOfType(house: House, unitType: UnitType): number {
        return house.unitLimits.get(unitType) - this.getCountUnitsOfType(house, unitType);
    }

    createUnit(region: Region, unitType: UnitType, allegiance: House): Unit {
        this.lastUnitId++;
        const unit = new Unit(this.lastUnitId, unitType, allegiance);
        unit.region = region;

        return unit;
    }

    getControlledSupplyIcons(house: House): number {
        return _.sum(
            this.world.regions.values
                .filter(r => r.getController() == house)
                .map(r => r.supplyIcons)
        );
    }

    getUnitsOfHouse(house: House): [Region, Unit[]][] {
        return this.world.regions.values.filter(r => r.getController() == house && r.units.size > 0).map(r => [r, r.units.values]);
    }

    getNameInfluenceTrack(i: number): string {
        if (i == 0) {
            return "Iron Throne";
        } else if (i == 1) {
            return "Fiefdoms"
        } else if (i == 2) {
            return "King's Court"
        } else {
            throw new Error();
        }
    }

    getInfluenceTrackByI(i: number): House[] {
        if (i == 0) {
            return this.ironThroneTrack;
        } else if (i == 1) {
            return this.fiefdomsTrack;
        } else if (i == 2) {
            return this.kingsCourtTrack;
        } else {
            throw new Error();
        }
    }

    setInfluenceTrack(i: number, track: House[]): void {
        if (i == 0) {
            this.ironThroneTrack = track;
        } else if (i == 1) {
            this.fiefdomsTrack = track;
        } else if (i == 2) {
            this.kingsCourtTrack = track;
        } else {
            throw new Error();
        }
    }

    getArmySizes(house: House, addedUnits: BetterMap<Region, UnitType[]> = new BetterMap(), removedUnits: BetterMap<Region, Unit[]> = new BetterMap()): number[] {
        // Create a map containing, for each region with an army, the size of this army
        const armySizes = new BetterMap(
            this.world.regions.values
                .filter(r => r.getController() == house)
                .map(r => [r, r.units.size])
        );

        removedUnits.entries.forEach(([region, units]) => {
            if (!armySizes.has(region)) {
                throw new Error(
                    `removedUnits contains region ${region.id} but it is not a region with a ${house.id} army in it`
                );
            }

            armySizes.set(region, armySizes.get(region) - units.length);
        });

        addedUnits.entries.forEach(([region, units]) => {
            armySizes.set(region, armySizes.tryGet(region, 0) + units.length);
        });

        return _.sortBy(armySizes.values.filter(s => s > 0), s => -s);
    }

    getHouseCardById(id: string): HouseCard {
        const houseCard = _.flatMap(this.houses.values, h => h.houseCards.values).find(hc => hc.id == id);

        if (houseCard == null) {
            throw new Error();
        }

        return houseCard;
    }

    changeSupply(house: House, delta: number): void {
        const newSupply = Math.max(0, Math.min(house.supplyLevel + delta, this.supplyRestrictions.length - 1));

        house.supplyLevel = newSupply;
    }

    getCountHeldStructures(house: House): BetterMap<number, number> {
        const counts = new BetterMap<number, number>();

        this.world
            .getControlledRegions(house)
            .map(r => r.castleLevel)
            .filter(l => l > 0)
            .forEach(cl => counts.set(cl, counts.tryGet(cl, 0) + 1))

        return counts;
    }

    getTotalHeldStructures(house: House): number {
        return _.sum(this.getCountHeldStructures(house).values);
    }

    getAllowedArmySizes(house: House): number[] {
        return this.supplyRestrictions[house.supplyLevel];
    }

    hasTooMuchArmies(house: House, addedUnits: BetterMap<Region, UnitType[]> = new BetterMap(), removedUnits: BetterMap<Region, Unit[]> = new BetterMap()): boolean {
        const allowedArmySizes = this.getAllowedArmySizes(house);
        const armySizes = this.getArmySizes(house, addedUnits, removedUnits).filter(a => a > 1);

        if (armySizes.length > allowedArmySizes.length) {
            return true;
        }

        for (let i = 0;i < armySizes.length;i++) {
            if (armySizes[i] > allowedArmySizes[i]) {
                return true;
            }
        }

        // Special port supply rule: Ports can only contain a maximum of 3 units
        for (const p of addedUnits.keys.filter(r => r.type == port)) {
            // Filter for units of house as it is possible that the port still contains enemy ships
            // which will be removed after TakeControlOfEnemyPortGameState
            if(p.units.values.filter(u => u.allegiance == house).length + addedUnits.get(p).length > 3) {
                return true;
            }
        }

        return false;
    }

    countPowerTokensOnBoard(house: House): number {
        return this.world.regions.values.filter(r => r.controlPowerToken == house).length;
    }

    getAllowedCoundOfStarredOrders(house: House): number {
        const place = this.kingsCourtTrack.indexOf(house);

        if (this.starredOrderRestrictions.length <= place) {
            return 0;
        }

        return this.starredOrderRestrictions[place];
    }

    serializeToClient(admin: boolean): SerializedGame {
        return {
            lastUnitId: this.lastUnitId,
            houses: this.houses.values.map(h => h.serializeToClient()),
            world: this.world.serializeToClient(),
            turn: this.turn,
            ironThroneTrack: this.ironThroneTrack.map(h => h.id),
            fiefdomsTrack: this.fiefdomsTrack.map(h => h.id),
            kingsCourtTrack: this.kingsCourtTrack.map(h => h.id),
            valyrianSteelBladeUsed: this.valyrianSteelBladeUsed,
            // To send the westeros decks to a simple player and not reveal the order of the cards,
            // send a shuffled version of it. This allows the player to still see the composition of the deck
            // without seeing the order of the cards
            westerosDecks: admin
                ? this.westerosDecks.map(wd => wd.map(wc => wc.serializeToClient()))
                : this.westerosDecks.map(wd => shuffle([...wd]).map(wc => wc.serializeToClient())),
            // Same for the wildling deck
            wildlingDeck: admin
                ? this.wildlingDeck.map(c => c.serializeToClient())
                : shuffle([...this.wildlingDeck]).map(c => c.serializeToClient()),
            wildlingStrength: this.wildlingStrength,
            supplyRestrictions: this.supplyRestrictions,
            starredOrderRestrictions: this.starredOrderRestrictions,
            skipRavenPhase: this.skipRavenPhase,
            structuresCountNeededToWin: this.structuresCountNeededToWin,
            maxTurns: this.maxTurns,
            maxPowerTokens: this.maxPowerTokens
        };
    }

    static deserializeFromServer(data: SerializedGame): Game {
        const game = new Game();

        game.lastUnitId = data.lastUnitId;
        game.houses = new BetterMap(data.houses.map(h => [h.id, House.deserializeFromServer(h)]));
        game.world = World.deserializeFromServer(game, data.world);
        game.turn = data.turn;
        game.ironThroneTrack = data.ironThroneTrack.map(hid => game.houses.get(hid));
        game.fiefdomsTrack = data.fiefdomsTrack.map(hid => game.houses.get(hid));
        game.kingsCourtTrack = data.kingsCourtTrack.map(hid => game.houses.get(hid));
        game.westerosDecks = data.westerosDecks.map(wd => wd.map(wc => WesterosCard.deserializeFromServer(wc)));
        game.wildlingStrength = data.wildlingStrength;
        game.supplyRestrictions = data.supplyRestrictions;
        game.valyrianSteelBladeUsed = data.valyrianSteelBladeUsed;
        game.wildlingDeck = data.wildlingDeck.map(c => WildlingCard.deserializeFromServer(c));
        game.starredOrderRestrictions = data.starredOrderRestrictions;
        game.skipRavenPhase = data.skipRavenPhase;
        game.structuresCountNeededToWin = data.structuresCountNeededToWin;
        game.maxTurns = data.maxTurns;
        game.maxPowerTokens = data.maxPowerTokens;

        return game;
    }
}

export interface SerializedGame {
    lastUnitId: number;
    houses: SerializedHouse[];
    world: SerializedWorld;
    turn: number;
    ironThroneTrack: string[];
    fiefdomsTrack: string[];
    kingsCourtTrack: string[];
    westerosDecks: SerializedWesterosCard[][];
    starredOrderRestrictions: number[];
    wildlingStrength: number;
    valyrianSteelBladeUsed: boolean;
    wildlingDeck: SerializedWildlingCard[];
    supplyRestrictions: number[][];
    skipRavenPhase: boolean;
    structuresCountNeededToWin: number;
    maxTurns: number;
    maxPowerTokens: number;
}
