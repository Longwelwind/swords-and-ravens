import House, { SerializedHouse } from "./House";
import World, { SerializedWorld } from "./World";
import Region from "./Region";
import UnitType from "./UnitType";
import Unit from "./Unit";
import Order from "./Order";
import * as _ from "lodash";
import { observable } from "mobx";
import WesterosCard, {
  SerializedWesterosCard,
} from "./westeros-card/WesterosCard";
import shuffleInPlace from "../../../utils/shuffleInPlace";
import shuffle from "../../../utils/shuffle";
import WildlingCard, {
  SerializedWildlingCard,
} from "./wildling-card/WildlingCard";
import BetterMap from "../../../utils/BetterMap";
import HouseCard, { SerializedHouseCard } from "./house-card/HouseCard";
import { land, port } from "./regionTypes";
import PlanningRestriction from "./westeros-card/planning-restriction/PlanningRestriction";
import WesterosCardType from "./westeros-card/WesterosCardType";
import IngameGameState from "../IngameGameState";
import {
  vassalHousesOrders,
  playerHousesOrders,
  seaOrders,
  ironBankOrder,
} from "./orders";
import IronBank, { SerializedIronBank } from "./IronBank";
import Player from "../Player";
import { ObjectiveCard } from "./static-data-structure/ObjectiveCard";
import { objectiveCards } from "./static-data-structure/objectiveCards";
import SnrError from "../../../utils/snrError";
import IGameSnapshot from "../../../client/game-replay/IGameSnapshot";

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
  // No need to declare this as @observable. It will be set by WiC card and then transmitted with
  // game-state-changed and won't change until next time we draw Westeros cards...
  winterIsComingHappened: boolean[];
  victoryPointsCountNeededToWin: number;
  loyaltyTokenCountNeededToWin: number;
  @observable maxTurns: number;
  vassalHouseCards: BetterMap<string, HouseCard> = new BetterMap<
    string,
    HouseCard
  >();
  @observable draftableHouseCards: BetterMap<string, HouseCard> =
    new BetterMap();
  deletedHouseCards: BetterMap<string, HouseCard> = new BetterMap();
  oldPlayerHouseCards: BetterMap<House, BetterMap<string, HouseCard>> =
    new BetterMap();
  previousPlayerHouseCards: BetterMap<House, BetterMap<string, HouseCard>> =
    new BetterMap();
  dragonStrengthTokens: number[] = [];
  @observable removedDragonStrengthTokens: number[] = [];
  ironBank: IronBank | null;
  @observable objectiveDeck: ObjectiveCard[] = [];
  draftMapRegionsPerHouse: BetterMap<House, Region[]> = new BetterMap();

  /**
   * Contains the vassal relations of the game.
   * Key is the vassal house, value is the commander.
   */
  vassalRelations = new BetterMap<House, House>();
  revealedWesterosCards = 0;
  @observable usurper: House | null;

  get ironThroneHolder(): House {
    return this.usurper
      ? this.usurper
      : this.getTokenHolder(this.ironThroneTrack);
  }

  get valyrianSteelBladeHolder(): House {
    return this.getTokenHolder(this.fiefdomsTrack);
  }

  get ravenHolder(): House {
    return this.getTokenHolder(this.kingsCourtTrack);
  }

  get influenceTracks(): House[][] {
    return [this.ironThroneTrack, this.fiefdomsTrack, this.kingsCourtTrack];
  }

  get targaryen(): House | null {
    return this.houses.tryGet("targaryen", null);
  }

  get theIronBank(): IronBank {
    if (this.ironBank == null) {
      throw new SnrError(
        this.ingame.entireGame,
        "Iron Bank must be initalized when this is called!"
      );
    }

    return this.ironBank;
  }

  get remainingWesterosCardTypes(): BetterMap<WesterosCardType, number>[] {
    const result: BetterMap<WesterosCardType, number>[] = [];

    this.westerosDecks.forEach((wd) => {
      const map = new BetterMap<WesterosCardType, number>();
      wd.slice(this.revealedWesterosCards)
        .sort((a, b) => a.type.name.localeCompare(b.type.name))
        .forEach((wc) => {
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
    if (this.dragonStrengthTokens.length == 0) {
      return -1;
    }

    if (this.turn >= (_.last(this.dragonStrengthTokens) as number)) {
      return 5;
    }

    // We calculate the current dragon strength based on the count of removed tokens
    // and tokens on the dragon strength track which are equal or lower to current round.
    // For the 6 round-only scenarios, we drop one of the tokens to removedTokens.

    return (
      this.removedDragonStrengthTokens.length +
      this.dragonStrengthTokens.filter((dst) => dst <= this.turn).length
    );
  }

  get loyaltyTokensOnBoardCount(): number {
    return _.sum(this.world.regions.values.map((r) => r.loyaltyTokens));
  }

  get isLoyaltyTokenAvailable(): boolean {
    return this.loyaltyTokensOnBoardCount + 1 <= MAX_LOYALTY_TOKEN_COUNT;
  }

  get nextWesterosCardTypes(): (WesterosCardType | null)[][] {
    const result: (WesterosCardType | null)[][] = [];

    this.westerosDecks.forEach((wd) => {
      result.push(
        wd
          .slice(0, this.revealedWesterosCards)
          .map((card) => (card.discarded ? null : card.type))
      );
    });

    return result;
  }

  get nonVassalHouses(): House[] {
    return this.houses.values.filter((h) => !this.ingame.isVassalHouse(h));
  }

  constructor(ingame: IngameGameState) {
    this.ingame = ingame;
  }

  updateWildlingStrength(value: number): number {
    this.wildlingStrength = Math.max(
      0,
      Math.min(this.wildlingStrength + value, MAX_WILDLING_STRENGTH)
    );
    return this.wildlingStrength;
  }

  getTokenHolder(track: House[]): House {
    // A vassal can never be the bearer of a dominance token
    // Ignore them when finding the token holder
    const nonVassalTrack = track.filter((h) => !this.ingame.isVassalHouse(h));

    if (nonVassalTrack.length == 0) {
      throw new SnrError(
        this.ingame.entireGame,
        "There must be at least one non-vassal in the track"
      );
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

  isOrderRestricted(
    region: Region,
    order: Order,
    planningRestrictions: PlanningRestriction[],
    ignoreRegionKind = false
  ): boolean {
    const controller = region.getController();
    if (!controller) {
      console.error("An order without a controller should never happen");
      return false;
    }

    return (
      planningRestrictions.some((restriction) =>
        restriction.restriction(order.type)
      ) ||
      (this.getAllowedCountOfStarredOrders(controller) == 0 &&
        order.type.starred) ||
      (!ignoreRegionKind &&
        order.type.restrictedTo != null &&
        order.type.restrictedTo != region.type.kind) ||
      (!ignoreRegionKind && order.type.id == "sea-iron-bank" && !this.ironBank)
    );
  }

  getRestrictedOrders(
    region: Region,
    planningRestrictions: PlanningRestriction[],
    ignoreRegionKind: boolean
  ): Order[] {
    const controller = region.getController();
    if (!controller) {
      return [];
    }

    return this.getOrdersListForHouse(controller).filter((o) =>
      this.isOrderRestricted(region, o, planningRestrictions, ignoreRegionKind)
    );
  }

  getPlacedOrders(
    allPlacedOrders: BetterMap<Region, Order | null>,
    house: House
  ): BetterMap<Region, Order> {
    return new BetterMap(
      allPlacedOrders.entries.filter(
        ([region, _order]) => region.getController() == house
      ) as [Region, Order][]
    );
  }

  getAvailableOrders(
    allPlacedOrders: BetterMap<Region, Order | null>,
    house: House
  ): Order[] {
    const ordersList = this.getOrdersListForHouse(house);
    const placedOrders = this.getPlacedOrders(allPlacedOrders, house).values;
    let leftOrders = _.difference(ordersList, placedOrders);

    // Don't remove restricted orders here anymore to allow placing a restricted one
    // leftOrders = leftOrders.filter(order => planningRestrictions.every(restriction => !restriction.restriction(order.type)));

    // In case a house must not play any starred order they can use them as dummy order
    const allowedStarredOrderCount = this.getAllowedCountOfStarredOrders(house);

    if (allowedStarredOrderCount > 0) {
      // Remove starred orders if the house used more than allowed
      const starredOrderLeft =
        allowedStarredOrderCount -
        placedOrders.filter((o) => o && o.type.starred).length;

      leftOrders = leftOrders.filter(
        (o) => !o.type.starred || (o.type.starred && starredOrderLeft > 0)
      );
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
    const numberVictoryPointsPerHouse = this.nonVassalHouses.map(
      (h) => [h, this.getVictoryPoints(h)] as [House, number]
    );

    return (
      numberVictoryPointsPerHouse.some(([h, n]) => {
        return h != this.targaryen
          ? n >= this.victoryPointsCountNeededToWin
          : n >= this.loyaltyTokenCountNeededToWin;
      }) || this.isWorldConquered()
    );
  }

  isWorldConquered(): boolean {
    const minimumAliveCount = this.ingame.players.size > 1 ? 2 : 1;
    const playerHouses = this.ingame.players.values.map((p) => p.house);
    let aliveCount = 0;
    for (const house of playerHouses) {
      if (!this.ingame.isHouseDefeated(house)) {
        aliveCount++;
        if (aliveCount >= minimumAliveCount) {
          return false;
        }
      }
    }
    return true;
  }

  getPotentialWinners(lastRound = false): House[] {
    const victoryConditions: ((h: House) => number)[] = !this.ingame.entireGame
      .isFeastForCrows
      ? [
          (h: House) => (this.ingame.isVassalHouse(h) ? 1 : -1),
          (h: House) => -this.getVictoryPoints(h),
          (h: House) => -this.getTotalControlledLandRegions(h),
          (h: House) => -h.supplyLevel,
          (h: House) => this.ironThroneTrack.indexOf(h),
        ]
      : !lastRound
        ? [
            (h: House) => (this.ingame.isVassalHouse(h) ? 1 : -1),
            (h: House) => -this.getVictoryPoints(h),
            (h: House) => -this.getTotalControlledLandRegions(h),
            (h: House) => this.ironThroneTrack.indexOf(h),
          ]
        : [
            (h: House) => (this.ingame.isVassalHouse(h) ? 1 : -1),
            (h: House) => -this.getVictoryPoints(h),
            (h: House) => this.ironThroneTrack.indexOf(h),
          ];

    return _.sortBy(this.houses.values, victoryConditions);
  }

  getTotalControlledLandRegions(h: House): number {
    return this.world.regions.values
      .filter((r) => r.type == land)
      .filter((r) => r.getController() == h).length;
  }

  getPotentialWinner(lastRound = false): House {
    return this.getPotentialWinners(lastRound)[0];
  }

  getCountUnitsOfType(house: House, unitType: UnitType): number {
    return this.world.getUnitsOfHouse(house).filter((u) => u.type == unitType)
      .length;
  }

  getAvailableUnitsOfType(house: House, unitType: UnitType): number {
    return (
      this.getUnitLimitOfType(house, unitType) -
      this.getCountUnitsOfType(house, unitType)
    );
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
        .filter((r) => r.getController() == house)
        .map((r) => r.supplyIcons)
    );
  }

  getUnitsOfHouse(house: House): [Region, Unit[]][] {
    return this.world.regions.values
      .filter((r) => r.getController() == house && r.units.size > 0)
      .map((r) => [r, r.units.values]);
  }

  getNameInfluenceTrack(i: number): string {
    if (i == 0) {
      return "Iron Throne";
    } else if (i == 1) {
      return "Fiefdoms";
    } else if (i == 2) {
      return "King's Court";
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

  getArmySizes(
    house: House,
    addedUnits: BetterMap<Region, UnitType[]> = new BetterMap(),
    removedUnits: BetterMap<Region, Unit[]> = new BetterMap()
  ): number[] {
    // Create a map containing, for each region with an army, the size of this army
    const armySizes = new BetterMap(
      this.world.regions.values
        .filter((r) => r.getController() == house)
        .map((r) => [r, r.units.size])
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

    return _.sortBy(
      armySizes.values.filter((s) => s > 0),
      (s) => -s
    );
  }

  getAllHouseCardsInGame(): BetterMap<string, HouseCard> {
    const allCards = new BetterMap<string, HouseCard>();

    this.houses.values.forEach((h) => {
      allCards.setRange(h.houseCards.entries);
    });

    allCards.setRange(this.vassalHouseCards.entries);
    allCards.setRange(this.draftableHouseCards.entries);
    allCards.setRange(this.deletedHouseCards.entries);

    this.oldPlayerHouseCards.values.forEach((hcs) => {
      allCards.setRange(hcs.entries);
    });

    this.previousPlayerHouseCards.values.forEach((hcs) => {
      allCards.setRange(hcs.entries);
    });

    return allCards;
  }

  getHouseCardById(id: string): HouseCard {
    const allCards = this.getAllHouseCardsInGame();
    if (!allCards.has(id)) {
      throw new SnrError(this.ingame.entireGame, `House card ${id} not found`);
    }
    return allCards.get(id);
  }

  getWesterosCardById(id: number, deckId: number): WesterosCard {
    const westerosCard = this.westerosDecks[deckId].find((wc) => wc.id == id);

    if (westerosCard == null) {
      throw new Error();
    }

    return westerosCard;
  }

  changeSupply(house: House, delta: number): number {
    const oldValue = house.supplyLevel;
    house.supplyLevel = Math.max(
      0,
      Math.min(house.supplyLevel + delta, this.supplyRestrictions.length - 1)
    );
    return house.supplyLevel - oldValue;
  }

  updateVictoryPoints(house: House, delta: number): number {
    const oldValue = house.victoryPoints;
    house.victoryPoints = Math.max(
      0,
      Math.min(house.victoryPoints + delta, this.victoryPointsCountNeededToWin)
    );
    return house.victoryPoints - oldValue;
  }

  getControlledStrongholdAndCastleCount(house: House): number {
    return this.world.regions.values.filter(
      (r) => r.castleLevel > 0 && r.getController() == house
    ).length;
  }

  getVictoryPoints(house: House): number {
    const victoryPoints = !this.ingame.entireGame.isFeastForCrows
      ? house == this.targaryen
        ? this.getTotalLoyaltyTokenCount(house)
        : this.getControlledStrongholdAndCastleCount(house)
      : house.victoryPoints;
    return house == this.targaryen
      ? Math.min(victoryPoints, this.loyaltyTokenCountNeededToWin)
      : Math.min(victoryPoints, this.victoryPointsCountNeededToWin);
  }

  getTotalLoyaltyTokenCount(house: House): number {
    const superLoyaltyTokens = this.world.regions.values.filter(
      (r) => r.superLoyaltyToken && r.getController() == house
    ).length;
    return superLoyaltyTokens + house.victoryPoints;
  }

  getAllowedArmySizes(house: House): number[] {
    return this.supplyRestrictions[house.supplyLevel];
  }

  hasTooMuchArmies(
    house: House,
    addedUnits: BetterMap<Region, UnitType[]> = new BetterMap(),
    removedUnits: BetterMap<Region, Unit[]> = new BetterMap()
  ): boolean {
    const allowedArmySizes = this.getAllowedArmySizes(house);
    const armySizes = this.getArmySizes(house, addedUnits, removedUnits).filter(
      (a) => a > 1
    );

    if (armySizes.length > allowedArmySizes.length) {
      return true;
    }

    for (let i = 0; i < armySizes.length; i++) {
      if (armySizes[i] > allowedArmySizes[i]) {
        return true;
      }
    }

    // Special port supply rule: Ports can only contain a maximum of 3 units
    for (const p of addedUnits.keys.filter((r) => r.type == port)) {
      // Filter for units of house as it is possible that the port still contains enemy ships
      // which will be removed after TakeControlOfEnemyPortGameState
      if (
        p.units.values.filter((u) => u.allegiance == house).length +
          addedUnits.get(p).length >
        3
      ) {
        return true;
      }
    }

    return false;
  }

  countPowerTokensOnBoard(house: House): number {
    return this.world.regions.values.filter((r) => r.controlPowerToken == house)
      .length;
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
    this.houses.values.forEach((h) => {
      h.supplyLevel = Math.min(
        this.supplyRestrictions.length - 1,
        this.getControlledSupplyIcons(h)
      );
    });

    this.ingame.log({
      type: "supply-adjusted",
      supplies: this.houses.values.map((h) => [h.id, h.supplyLevel]),
    });

    this.ingame.entireGame.broadcastToClients({
      type: "supply-adjusted",
      supplies: this.houses.values.map((h) => [h.id, h.supplyLevel]),
    });
  }

  getSnapshot(): IGameSnapshot {
    return {
      ironThroneTrack: this.ironThroneTrack.map((h) => h.id),
      fiefdomsTrack: this.fiefdomsTrack.map((h) => h.id),
      kingsCourtTrack: this.kingsCourtTrack.map((h) => h.id),
      round: this.turn,
      wildlingStrength: this.wildlingStrength,
      dragonStrength:
        this.currentDragonStrength > -1
          ? this.currentDragonStrength
          : undefined,
      vsbUsed: this.valyrianSteelBladeUsed
        ? this.valyrianSteelBladeUsed
        : undefined,
      housesOnVictoryTrack: this.getPotentialWinners().map((h) => {
        return {
          id: h.id,
          victoryPoints: this.getVictoryPoints(h),
          landAreaCount: this.getTotalControlledLandRegions(h),
          supply: h.supplyLevel,
          houseCards: _.orderBy(
            h.houseCards.values,
            (hc) => hc.combatStrength
          ).map((hc) => {
            return {
              id: hc.id,
              state: hc.state,
            };
          }),
          powerTokens: h.powerTokens,
          isVassal: this.ingame.isVassalHouse
            ? this.ingame.isVassalHouse(h)
            : undefined,
          suzerainHouseId: this.ingame.game.vassalRelations.tryGet(h, undefined)
            ?.id,
        };
      }),
      ironBank: this.ironBank?.getSnapshot(),
    };
  }

  serializeToClient(admin: boolean, player: Player | null): SerializedGame {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const forceDragonStrengthValidation = this.currentDragonStrength;
    return {
      lastUnitId: this.lastUnitId,
      houses: this.houses.values.map((h) =>
        h.serializeToClient(admin, player, this)
      ),
      world: this.world.serializeToClient(admin, player),
      turn: this.turn,
      ironThroneTrack: this.ironThroneTrack.map((h) => h.id),
      fiefdomsTrack: this.fiefdomsTrack.map((h) => h.id),
      kingsCourtTrack: this.kingsCourtTrack.map((h) => h.id),
      valyrianSteelBladeUsed: this.valyrianSteelBladeUsed,
      // To send the westeros decks to a simple player and not reveal the order of the cards,
      // send a shuffled version of it. This allows the player to still see the composition of the deck
      // without seeing the order of the cards
      westerosDecks: admin
        ? this.westerosDecks.map((wd) => wd.map((wc) => wc.serializeToClient()))
        : this.westerosDecks.map((wd) =>
            wd
              .slice(0, this.revealedWesterosCards)
              .concat(shuffleInPlace(wd.slice(this.revealedWesterosCards)))
              .map((wc) => wc.serializeToClient())
          ),
      winterIsComingHappened: this.winterIsComingHappened,
      // Same for the wildling deck
      wildlingDeck: admin
        ? this.wildlingDeck.map((c) => c.serializeToClient())
        : shuffle(this.wildlingDeck).map((c) => c.serializeToClient()),
      wildlingStrength: this.wildlingStrength,
      supplyRestrictions: this.supplyRestrictions,
      starredOrderRestrictions: this.starredOrderRestrictions,
      victoryPointsCountNeededToWin: this.victoryPointsCountNeededToWin,
      loyaltyTokenCountNeededToWin: this.loyaltyTokenCountNeededToWin,
      maxTurns: this.maxTurns,
      clientNextWildlingCardId:
        admin || player?.house.knowsNextWildlingCard
          ? this.wildlingDeck[0].id
          : null,
      revealedWesterosCards: this.revealedWesterosCards,
      vassalRelations: this.vassalRelations.map((key, value) => [
        key.id,
        value.id,
      ]),
      vassalHouseCards: this.vassalHouseCards.entries.map(([hcid, hc]) => [
        hcid,
        hc.serializeToClient(),
      ]),
      // The game state tree reveals already chosen cards by other houses during Thematic Draft.
      // But as the info is not super critical and as it's easier this was to reveal all cards once drafting is done,
      // hiding other player cards by the UI must be sufficient.
      draftableHouseCards: this.draftableHouseCards.entries.map(
        ([hcid, hc]) => [hcid, hc.serializeToClient()]
      ),
      deletedHouseCards: this.deletedHouseCards.entries.map(([hcid, hc]) => [
        hcid,
        hc.serializeToClient(),
      ]),
      oldPlayerHouseCards: this.oldPlayerHouseCards.entries.map(([h, hcs]) => [
        h.id,
        hcs.entries.map(([hcid, hc]) => [hcid, hc.serializeToClient()]),
      ]),
      previousPlayerHouseCards: this.previousPlayerHouseCards.entries.map(
        ([h, hcs]) => [
          h.id,
          hcs.entries.map(([hcid, hc]) => [hcid, hc.serializeToClient()]),
        ]
      ),
      draftMapRegionsPerHouse: this.draftMapRegionsPerHouse.entries.map(
        ([h, regions]) => [h.id, regions.map((r) => r.id)]
      ),
      dragonStrengthTokens: this.dragonStrengthTokens,
      removedDragonStrengthTokens: this.removedDragonStrengthTokens,
      ironBank: this.ironBank ? this.ironBank.serializeToClient(admin) : null,
      objectiveDeck: admin ? this.objectiveDeck.map((oc) => oc.id) : [],
      usurper: this.usurper ? this.usurper.id : null,
    };
  }

  static deserializeFromServer(
    ingame: IngameGameState,
    data: SerializedGame
  ): Game {
    const game = new Game(ingame);

    game.lastUnitId = data.lastUnitId;
    game.vassalHouseCards = new BetterMap(
      data.vassalHouseCards.map(([hcid, hc]) => [
        hcid,
        HouseCard.deserializeFromServer(hc),
      ])
    );
    game.houses = new BetterMap(
      data.houses.map((h) => [h.id, House.deserializeFromServer(game, h)])
    );
    game.world = World.deserializeFromServer(game, data.world);
    game.turn = data.turn;
    game.ironThroneTrack = data.ironThroneTrack.map((hid) =>
      game.houses.get(hid)
    );
    game.fiefdomsTrack = data.fiefdomsTrack.map((hid) => game.houses.get(hid));
    game.kingsCourtTrack = data.kingsCourtTrack.map((hid) =>
      game.houses.get(hid)
    );
    game.westerosDecks = data.westerosDecks.map((wd) =>
      wd.map((wc) => WesterosCard.deserializeFromServer(wc))
    );
    game.winterIsComingHappened = data.winterIsComingHappened;
    game.wildlingStrength = data.wildlingStrength;
    game.supplyRestrictions = data.supplyRestrictions;
    game.valyrianSteelBladeUsed = data.valyrianSteelBladeUsed;
    game.wildlingDeck = data.wildlingDeck.map((c) =>
      WildlingCard.deserializeFromServer(c)
    );
    game.starredOrderRestrictions = data.starredOrderRestrictions;
    game.victoryPointsCountNeededToWin = data.victoryPointsCountNeededToWin;
    game.loyaltyTokenCountNeededToWin = data.loyaltyTokenCountNeededToWin;
    game.maxTurns = data.maxTurns;
    game.revealedWesterosCards = data.revealedWesterosCards;
    game.clientNextWildlingCardId = data.clientNextWildlingCardId;
    game.vassalRelations = new BetterMap(
      data.vassalRelations.map(([vid, hid]) => [
        game.houses.get(vid),
        game.houses.get(hid),
      ])
    );
    game.draftableHouseCards = new BetterMap(
      data.draftableHouseCards.map(([hcid, hc]) => [
        hcid,
        HouseCard.deserializeFromServer(hc),
      ])
    );
    game.deletedHouseCards = new BetterMap(
      data.deletedHouseCards.map(([hcid, hc]) => [
        hcid,
        HouseCard.deserializeFromServer(hc),
      ])
    );
    game.oldPlayerHouseCards = new BetterMap(
      data.oldPlayerHouseCards.map(([hid, hcs]) => [
        game.houses.get(hid),
        new BetterMap(
          hcs.map(([hcid, hc]) => [hcid, HouseCard.deserializeFromServer(hc)])
        ),
      ])
    );
    game.previousPlayerHouseCards = new BetterMap(
      data.previousPlayerHouseCards.map(([hid, hcs]) => [
        game.houses.get(hid),
        new BetterMap(
          hcs.map(([hcid, hc]) => [hcid, HouseCard.deserializeFromServer(hc)])
        ),
      ])
    );
    game.draftMapRegionsPerHouse = new BetterMap(
      data.draftMapRegionsPerHouse.map(([hid, rIds]) => [
        game.houses.get(hid),
        rIds.map((rid) => game.world.regions.get(rid)),
      ])
    );
    game.dragonStrengthTokens = data.dragonStrengthTokens;
    game.removedDragonStrengthTokens = data.removedDragonStrengthTokens;
    game.ironBank = data.ironBank
      ? IronBank.deserializeFromServer(game, data.ironBank)
      : null;
    game.objectiveDeck = data.objectiveDeck.map((ocid) =>
      objectiveCards.get(ocid)
    );
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
  loyaltyTokenCountNeededToWin: number;
  maxTurns: number;
  revealedWesterosCards: number;
  clientNextWildlingCardId: number | null;
  vassalRelations: [string, string][];
  vassalHouseCards: [string, SerializedHouseCard][];
  draftableHouseCards: [string, SerializedHouseCard][];
  draftMapRegionsPerHouse: [string, string[]][];
  deletedHouseCards: [string, SerializedHouseCard][];
  oldPlayerHouseCards: [string, [string, SerializedHouseCard][]][];
  previousPlayerHouseCards: [string, [string, SerializedHouseCard][]][];
  dragonStrengthTokens: number[];
  removedDragonStrengthTokens: number[];
  ironBank: SerializedIronBank | null;
  objectiveDeck: string[];
  usurper: string | null;
}
