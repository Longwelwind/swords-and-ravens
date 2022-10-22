import House, {SerializedHouse} from "./House";
import World, {SerializedWorld} from "./World";
import Region from "./Region";
import UnitType from "./UnitType";
import Unit from "./Unit";
import Order from "./Order";
import * as _ from "lodash";
import {observable} from "mobx";
import WesterosCard, {SerializedWesterosCard} from "./westeros-card/WesterosCard";
import shuffleInPlace from "../../../utils/shuffleInPlace";
import shuffle from "../../../utils/shuffle";
import WildlingCard, {SerializedWildlingCard} from "./wildling-card/WildlingCard";
import BetterMap from "../../../utils/BetterMap";
import HouseCard, { SerializedHouseCard } from "./house-card/HouseCard";
import {land, port} from "./regionTypes";
import PlanningRestriction from "./westeros-card/planning-restriction/PlanningRestriction";
import WesterosCardType from "./westeros-card/WesterosCardType";
import IngameGameState from "../IngameGameState";
import { vassalHousesOrders, playerHousesOrders, seaOrders, ironBankOrder } from "./orders";
import IronBank, { SerializedIronBank } from "./IronBank";
import Player from "../Player";
import { ObjectiveCard } from "./static-data-structure/ObjectiveCard";
import { objectiveCards } from "./static-data-structure/objectiveCards";
import ThematicDraftHouseCardsGameState from "../thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";

export const MAX_WILDLING_STRENGTH = 12;
export const MAX_LOYALTY_TOKEN_COUNT = 20;

export default class Game {
    ingame: IngameGameState;

    lastUnitId = 0;

    world: World;
    houses: BetterMap<string, House> = new BetterMap<string, House>();
    @observable turn = 0;
    @observable ironThroneTrack: House[];
    @observable fiefdomsTrack: House[];
    @observable valyrianSteelBladeUsed = false;
    @observable kingsCourtTrack: House[];
    @observable wildlingStrength = 2;
    // number in clients where house.knowsNextWilldingCard is true, otherwise null.
    @observable clientNextWildlingCardId: number | null;
    wildlingDeck: WildlingCard[];
    supplyRestrictions: number[][];
    starredOrderRestrictions: number[];
    westerosDecks: WesterosCard[][];
    winterIsComingHappened: boolean[];
    victoryPointsCountNeededToWin: number;
    @observable maxTurns: number;
    vassalHouseCards: BetterMap<string, HouseCard> = new BetterMap<string, HouseCard>();
    @observable houseCardsForDrafting: BetterMap<string, HouseCard> = new BetterMap();
    deletedHouseCards: BetterMap<string, HouseCard> = new BetterMap();
    oldPlayerHouseCards: BetterMap<House, BetterMap<string, HouseCard>> = new BetterMap();
    @observable dragonStrengthTokens = [2, 4, 6, 8, 10];
    @observable removedDragonStrengthToken = 0;
    ironBank: IronBank | null;
    @observable objectiveDeck: ObjectiveCard[] = [];

    /**
     * Contains the vassal relations of the game.
     * Key is the vassal house, value is the commander.
     */
    vassalRelations = new BetterMap<House, House>();
    revealedWesterosCards = 0;
    @observable usurper: House | null;

    get ironThroneHolder(): House {
        return this.usurper ? this.usurper : this.getTokenHolder(this.ironThroneTrack);
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

    get targaryen(): House | null {
        return this.houses.tryGet("targaryen", null);
    }

    get theIronBank(): IronBank {
        if (this.ironBank == null) {
            throw new Error("Iron Bank must be initalized when this is called!");
        }

        return this.ironBank;
    }

    get remainingWesterosCardTypes(): BetterMap<WesterosCardType, number>[] {
        const result: BetterMap<WesterosCardType, number>[] = [];

        this.westerosDecks.forEach(wd => {
            const map = new BetterMap<WesterosCardType, number>();
            wd.slice(this.revealedWesterosCards).sort((a, b) => a.type.name.localeCompare(b.type.name)).forEach(wc => {
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

    get currentDragonStrength(): number {
        if (this.turn > (_.last(this.dragonStrengthTokens) as number)) {
            return 5;
        }

        // If a dragon strength token has been removed from the round track
        // the initial value is 1 instead of 0
        const result = this.ingame.entireGame.isDanceWithMotherOfDragons
            ? this.removedDragonStrengthToken == 0
                ? 1
                : 2
            : this.removedDragonStrengthToken == 0
                ? 0
                : 1;

        for (let i=0; i<this.dragonStrengthTokens.length; i++) {
            if (this.dragonStrengthTokens[i] == this.turn) {
                return result + i + 1; // +1 because of the 0-based index
            }
            if (this.dragonStrengthTokens[i] > this.turn) {
                // If the current token value is greater than current round we add the current index,
                // which is the value of the previous dragon strength token on the round track (0-based index)
                return result + i;
            }
        }

        throw new Error("Error in calculating currentDragonStrength");
    }

    get loyaltyTokensOnBoardCount(): number {
        return _.sum(this.world.regions.values.map(r => r.loyaltyTokens));
    }

    get isLoyaltyTokenAvailable(): boolean {
        return (this.loyaltyTokensOnBoardCount + 1) <= MAX_LOYALTY_TOKEN_COUNT;
    }

    get nextWesterosCardTypes(): (WesterosCardType | null)[][] {
        const result: (WesterosCardType | null)[][] = [];

        this.westerosDecks.forEach(wd => {
            result.push(wd.slice(0, this.revealedWesterosCards).map((card) => card.discarded ? null : card.type));
        });

        return result;
    }

    get nonVassalHouses(): House[] {
        return this.houses.values.filter(h => !this.ingame.isVassalHouse(h));
    }

    constructor(ingame: IngameGameState) {
        this.ingame = ingame;
    }

    updateWildlingStrength(value: number): number {
        this.wildlingStrength = Math.max(0, Math.min(this.wildlingStrength + value, MAX_WILDLING_STRENGTH));
        return this.wildlingStrength;
    }

    getTokenHolder(track: House[]): House {
        // A vassal can never be the bearer of a dominance token
        // Ignore them when finding the token holder
        const nonVassalTrack = track.filter(h => !this.ingame.isVassalHouse(h));

        if (nonVassalTrack.length == 0) {
            throw new Error("There must be at least one non-vassal in the track");
        }

        return nonVassalTrack[0];
    }

    getOrdersListForHouse(house: House): Order[] {
        if (this.ingame.isVassalHouse(house)) {
            return vassalHousesOrders;
        }

        if (this.ingame.entireGame.gameSettings.seaOrderTokens) {
            return _.union(playerHousesOrders, seaOrders);
        }

        if (this.ingame.entireGame.gameSettings.ironBank) {
            return _.union(playerHousesOrders, [ironBankOrder]);
        }

        return playerHousesOrders;
    }

    isOrderRestricted(region: Region, order: Order, planningRestrictions: PlanningRestriction[], ignoreRegionKind = false): boolean {
        const controller = region.getController();
        if (!controller) {
            console.error("An order without a controller should never happen");
            return false;
        }

        return planningRestrictions.some(restriction => restriction.restriction(order.type))
            || (this.getAllowedCountOfStarredOrders(controller) == 0 && order.type.starred)
            || (!ignoreRegionKind && order.type.restrictedTo != null && order.type.restrictedTo != region.type.kind)
            || (!ignoreRegionKind && order.type.id == "sea-iron-bank" && !this.ironBank);
    }

    getRestrictedOrders(region: Region, planningRestrictions: PlanningRestriction[], ignoreRegionKind: boolean): Order[] {
        const controller = region.getController();
        if (!controller) {
            return [];
        }

        return this.getOrdersListForHouse(controller).filter(o => this.isOrderRestricted(region, o, planningRestrictions, ignoreRegionKind));
    }

    getPlacedOrders(allPlacedOrders: BetterMap<Region, Order | null>, house: House): BetterMap<Region, Order> {
        return new BetterMap(allPlacedOrders.entries
            .filter(([region, _order]) => region.getController() == house) as [Region, Order][]);
    }

    getAvailableOrders(allPlacedOrders: BetterMap<Region, Order | null>, house: House): Order[] {
        const ordersList = this.getOrdersListForHouse(house);
        const placedOrders = this.getPlacedOrders(allPlacedOrders, house).values;
        let leftOrders = _.difference(
            ordersList,
            placedOrders
        );

        // Don't remove restricted orders here anymore to allow placing a restricted one
        // leftOrders = leftOrders.filter(order => planningRestrictions.every(restriction => !restriction.restriction(order.type)));

        // In case a house must not play any starred order they can use them as dummy order
        const allowedStarredOrderCount = this.getAllowedCountOfStarredOrders(house);

        if (allowedStarredOrderCount > 0) {
            // Remove starred orders if the house used more than allowed
            const starredOrderLeft = allowedStarredOrderCount - placedOrders.filter(o => o && o.type.starred).length;

            leftOrders = leftOrders.filter(o => !o.type.starred || (o.type.starred && starredOrderLeft > 0));
        }

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

    areVictoryConditionsFulfilled(): boolean {
        const numberVictoryPointsPerHouse = this.nonVassalHouses.map(h => this.getVictoryPoints(h));

        return numberVictoryPointsPerHouse.some(n => n >= this.victoryPointsCountNeededToWin);
    }

    getPotentialWinners(lastRound = false): House[] {
        let victoryConditions: ((h: House) => number)[] = [];

        if (!this.ingame.entireGame.isFeastForCrows) {
            victoryConditions = [
                (h: House) => this.ingame.isVassalHouse(h) ? 1 : -1,
                (h: House) => -this.getVictoryPoints(h),
                (h: House) => -this.getTotalControlledLandRegions(h),
                (h: House) => -h.supplyLevel,
                (h: House) => this.ironThroneTrack.indexOf(h)
            ];
        } else if (!lastRound) {
            victoryConditions = [
                (h: House) => this.ingame.isVassalHouse(h) ? 1 : -1,
                (h: House) => -this.getVictoryPoints(h),
                (h: House) => -this.getTotalControlledLandRegions(h),
                (h: House) => this.ironThroneTrack.indexOf(h)
            ]
        } else {
            victoryConditions = [
                (h: House) => this.ingame.isVassalHouse(h) ? 1 : -1,
                (h: House) => -this.getVictoryPoints(h),
                (h: House) => this.ironThroneTrack.indexOf(h)
            ]
        }

        return _.sortBy(this.houses.values, victoryConditions);
    }

    getTotalControlledLandRegions(h: House): number {
        return this.world.regions.values.filter(r => r.type == land).filter(r => r.getController() == h).length;
    }

    getPotentialWinner(lastRound = false): House {
        return this.getPotentialWinners(lastRound)[0];
    }

    getCountUnitsOfType(house: House, unitType: UnitType): number {
        return this.world.getUnitsOfHouse(house).filter(u => u.type == unitType).length;
    }

    getAvailableUnitsOfType(house: House, unitType: UnitType): number {
        return this.getUnitLimitOfType(house, unitType) - this.getCountUnitsOfType(house, unitType);
    }

    getUnitLimitOfType(house: House, unitType: UnitType): number {
        return house.unitLimits.has(unitType) ? house.unitLimits.get(unitType) : 0;
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
        let houseCard = _.flatMap(this.houses.values, h => h.houseCards.values).find(hc => hc.id == id);

        if (!houseCard) {
            houseCard = this.vassalHouseCards.has(id)
                ? this.vassalHouseCards.get(id)
                : this.houseCardsForDrafting.has(id)
                ? this.houseCardsForDrafting.get(id)
                : this.deletedHouseCards.has(id)
                ? this.deletedHouseCards.get(id)
                : undefined;
        }

        if (!houseCard) {
            // Check oldPlayerHouseCards
            this.oldPlayerHouseCards.keys.forEach(h => {
                if (this.oldPlayerHouseCards.get(h).has(id)) {
                    houseCard = this.oldPlayerHouseCards.get(h).get(id);
                }
            });
        }

        if (!houseCard) {
            throw new Error(`House card ${id} not found`);
        }

        return houseCard;
    }

    getWesterosCardById(id: number, deckId: number): WesterosCard {
        const westerosCard = this.westerosDecks[deckId].find(wc => wc.id == id);

        if (westerosCard == null) {
            throw new Error();
        }

        return westerosCard;
    }

    changeSupply(house: House, delta: number): number {
        const oldValue = house.supplyLevel;
        house.supplyLevel = Math.max(0, Math.min(house.supplyLevel + delta, this.supplyRestrictions.length - 1));
        return house.supplyLevel - oldValue;
    }

    updateVictoryPoints(house: House, delta: number): number {
        const oldValue = house.victoryPoints;
        house.victoryPoints = Math.max(0, Math.min(house.victoryPoints + delta, this.victoryPointsCountNeededToWin));
        return house.victoryPoints - oldValue;
    }

    getControlledStrongholdAndCastleCount(house: House): number {
        return this.world.regions.values.filter(r => r.castleLevel > 0 && r.getController() == house).length;
    }

    getVictoryPoints(house: House): number {
        const victoryPoints = !this.ingame.entireGame.isFeastForCrows
            ? house.id == "targaryen"
                ? this.getTotalLoyaltyTokenCount(house)
                : this.getControlledStrongholdAndCastleCount(house)
            : house.victoryPoints;
        return Math.min(victoryPoints, this.victoryPointsCountNeededToWin);
    }

    getTotalLoyaltyTokenCount(house: House): number {
        const superLoyaltyTokens = this.world.regions.values.filter(r => r.superLoyaltyToken && r.getController() == house).length;
        return superLoyaltyTokens + house.gainedLoyaltyTokens;
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

    getAllowedCountOfStarredOrders(house: House): number {
        const place = this.kingsCourtTrack.indexOf(house);

        if (this.starredOrderRestrictions.length <= place) {
            return 0;
        }

        return this.starredOrderRestrictions[place];
    }

    updateSupplies(): void {
        // Refresh the supply level of all houses
        this.houses.values.forEach(h =>  {
            h.supplyLevel = Math.min(this.supplyRestrictions.length - 1, this.getControlledSupplyIcons(h));
        });

        this.ingame.log({
            type: "supply-adjusted",
            supplies: this.houses.values.map(h => [h.id, h.supplyLevel])
        });

        this.ingame.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: this.houses.values.map(h => [h.id, h.supplyLevel])
        });
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedGame {
        const isThematicDraft = this.ingame.childGameState instanceof ThematicDraftHouseCardsGameState;
        return {
            lastUnitId: this.lastUnitId,
            houses: this.houses.values.map(h => h.serializeToClient(admin, player, this)),
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
                : this.westerosDecks.map(wd => wd.slice(0, this.revealedWesterosCards)
                    .concat(shuffleInPlace(wd.slice(this.revealedWesterosCards)))
                    .map(wc => wc.serializeToClient())),
            winterIsComingHappened: this.winterIsComingHappened,
            // Same for the wildling deck
            wildlingDeck: admin
                ? this.wildlingDeck.map(c => c.serializeToClient())
                : shuffle(this.wildlingDeck).map(c => c.serializeToClient()),
            wildlingStrength: this.wildlingStrength,
            supplyRestrictions: this.supplyRestrictions,
            starredOrderRestrictions: this.starredOrderRestrictions,
            victoryPointsCountNeededToWin: this.victoryPointsCountNeededToWin,
            maxTurns: this.maxTurns,
            clientNextWildlingCardId: (admin || player?.house.knowsNextWildlingCard) ? this.wildlingDeck[0].id : null,
            revealedWesterosCards: this.revealedWesterosCards,
            vassalRelations: this.vassalRelations.map((key, value) => [key.id, value.id]),
            vassalHouseCards: this.vassalHouseCards.entries.map(([hcid, hc]) => [hcid, hc.serializeToClient()]),
            houseCardsForDrafting: admin || !isThematicDraft
                ? this.houseCardsForDrafting.entries.map(([hcid, hc]) => [hcid, hc.serializeToClient()])
                : this.houseCardsForDrafting.entries.filter(([_hcid, hc]) => hc.houseId == player?.house.id).map(([hcid, hc]) => [hcid, hc.serializeToClient()]),
            deletedHouseCards: this.deletedHouseCards.entries.map(([hcid, hc]) => [hcid, hc.serializeToClient()]),
            oldPlayerHouseCards: this.oldPlayerHouseCards.entries.map(([h, hcs]) => [h.id, hcs.entries.map(([hcid, hc]) => [hcid, hc.serializeToClient()])]),
            dragonStrengthTokens: this.dragonStrengthTokens,
            removedDragonStrengthToken: this.removedDragonStrengthToken,
            ironBank: this.ironBank ? this.ironBank.serializeToClient(admin) : null,
            objectiveDeck: admin ? this.objectiveDeck.map(oc => oc.id) : [],
            usurper: this.usurper ? this.usurper.id : null
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedGame): Game {
        const game = new Game(ingame);

        game.lastUnitId = data.lastUnitId;
        game.houses = new BetterMap(data.houses.map(h => [h.id, House.deserializeFromServer(game, h)]));
        game.world = World.deserializeFromServer(game, data.world);
        game.turn = data.turn;
        game.ironThroneTrack = data.ironThroneTrack.map(hid => game.houses.get(hid));
        game.fiefdomsTrack = data.fiefdomsTrack.map(hid => game.houses.get(hid));
        game.kingsCourtTrack = data.kingsCourtTrack.map(hid => game.houses.get(hid));
        game.westerosDecks = data.westerosDecks.map(wd => wd.map(wc => WesterosCard.deserializeFromServer(wc)));
        game.winterIsComingHappened = data.winterIsComingHappened;
        game.wildlingStrength = data.wildlingStrength;
        game.supplyRestrictions = data.supplyRestrictions;
        game.valyrianSteelBladeUsed = data.valyrianSteelBladeUsed;
        game.wildlingDeck = data.wildlingDeck.map(c => WildlingCard.deserializeFromServer(c));
        game.starredOrderRestrictions = data.starredOrderRestrictions;
        game.victoryPointsCountNeededToWin = data.victoryPointsCountNeededToWin;
        game.maxTurns = data.maxTurns;
        game.revealedWesterosCards = data.revealedWesterosCards;
        game.clientNextWildlingCardId = data.clientNextWildlingCardId;
        game.vassalRelations = new BetterMap(data.vassalRelations.map(([vid, hid]) => [game.houses.get(vid), game.houses.get(hid)]));
        game.vassalHouseCards = new BetterMap(data.vassalHouseCards.map(([hcid, hc]) => [hcid, HouseCard.deserializeFromServer(hc)]));
        game.houseCardsForDrafting = new BetterMap(data.houseCardsForDrafting.map(([hcid, hc]) => [hcid, HouseCard.deserializeFromServer(hc)]));
        game.deletedHouseCards = new BetterMap(data.deletedHouseCards.map(([hcid, hc]) => [hcid, HouseCard.deserializeFromServer(hc)]));
        game.oldPlayerHouseCards = new BetterMap(data.oldPlayerHouseCards.map(([hid, hcs]) =>
            [game.houses.get(hid), new BetterMap(hcs.map(([hcid, hc]) => [hcid, HouseCard.deserializeFromServer(hc)]))]
        ));
        game.dragonStrengthTokens = data.dragonStrengthTokens;
        game.removedDragonStrengthToken = data.removedDragonStrengthToken;
        game.ironBank = data.ironBank ? IronBank.deserializeFromServer(game, data.ironBank) : null;
        game.objectiveDeck = data.objectiveDeck.map(ocid => objectiveCards.get(ocid));
        game.usurper = data.usurper ? game.houses.get(data.usurper) : null;

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
    winterIsComingHappened: boolean[];
    starredOrderRestrictions: number[];
    wildlingStrength: number;
    valyrianSteelBladeUsed: boolean;
    wildlingDeck: SerializedWildlingCard[];
    supplyRestrictions: number[][];
    victoryPointsCountNeededToWin: number;
    maxTurns: number;
    revealedWesterosCards: number;
    clientNextWildlingCardId: number | null;
    vassalRelations: [string, string][];
    vassalHouseCards: [string, SerializedHouseCard][];
    houseCardsForDrafting: [string, SerializedHouseCard][];
    deletedHouseCards: [string, SerializedHouseCard][];
    oldPlayerHouseCards: [string, [string, SerializedHouseCard][]][];
    dragonStrengthTokens: number[];
    removedDragonStrengthToken: number;
    ironBank: SerializedIronBank | null;
    objectiveDeck: string[];
    usurper: string | null;
}
