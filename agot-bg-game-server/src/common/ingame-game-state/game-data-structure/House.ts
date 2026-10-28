import HouseCard, { SerializedHouseCard } from "./house-card/HouseCard";
import { observable } from "mobx";
import BetterMap from "../../../utils/BetterMap";
import UnitType from "./UnitType";
import unitTypes from "./unitTypes";
import Game from "./Game";
import {
  ObjectiveCard,
  SpecialObjectiveCard
} from "./static-data-structure/ObjectiveCard";
import Player from "../Player";
import {
  objectiveCards,
  specialObjectiveCards
} from "./static-data-structure/objectiveCards";

export default class House {
  id: string;
  name: string;
  color: string;
  unitLimits: BetterMap<UnitType, number>;
  maxPowerTokens: number;
  @observable accessor houseCards: BetterMap<string, HouseCard>;
  @observable accessor laterHouseCards: BetterMap<string, HouseCard> | null;
  @observable accessor powerTokens: number;
  @observable accessor supplyLevel: number;
  @observable accessor knowsNextWildlingCard: boolean;
  @observable accessor hasBeenReplacedByVassal: boolean;
  specialObjective: SpecialObjectiveCard | null;
  @observable accessor secretObjectives: ObjectiveCard[];
  @observable accessor completedObjectives: ObjectiveCard[];
  @observable accessor victoryPoints: number;

  constructor(
    id: string,
    name: string,
    color: string,
    unitLimits: BetterMap<UnitType, number>,
    powerTokens: number,
    maxPowerTokens: number,
    supplyLevel: number,
    houseCards: BetterMap<string, HouseCard>,
    laterHouseCards: BetterMap<string, HouseCard> | null = null,
    victoryPoints = 0,
    hasBeenReplacedByVassal = false
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.knowsNextWildlingCard = false;
    this.unitLimits = unitLimits;
    this.powerTokens = powerTokens;
    this.supplyLevel = supplyLevel;
    this.houseCards = houseCards;
    this.laterHouseCards = laterHouseCards;
    this.hasBeenReplacedByVassal = hasBeenReplacedByVassal;
    this.maxPowerTokens = maxPowerTokens;
    this.victoryPoints = victoryPoints;
    this.secretObjectives = [];
    this.completedObjectives = [];
    this.specialObjective = null;
  }

  getHighlightColor(): string {
    if (this.id == "greyjoy") {
      return "#000000";
    }
    return this.color;
  }

  serializeToClient(
    admin: boolean,
    player: Player | null,
    game: Game
  ): SerializedHouse {
    // Only serialize house cards to all clients if house is no vassal house to not reveal the created hand of vassals during combat
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      knowsNextWildlingCard: this.knowsNextWildlingCard ? true : undefined,
      houseCards:
        admin || !game.ingame.isVassalHouse(this)
          ? this.houseCards.entries.map(
              ([houseCardId, houseCard]) =>
                [houseCardId, houseCard.serializeToClient()] as [
                  string,
                  SerializedHouseCard
                ]
            )
          : [],
      laterHouseCards:
        this.laterHouseCards != null
          ? this.laterHouseCards.entries.map(
              ([houseCardId, houseCard]) =>
                [houseCardId, houseCard.serializeToClient()] as [
                  string,
                  SerializedHouseCard
                ]
            )
          : undefined,
      unitLimits: this.unitLimits.map((unitType, limit) => [
        unitType.id,
        limit
      ]),
      powerTokens: this.powerTokens,
      maxPowerTokens: this.maxPowerTokens,
      supplyLevel: this.supplyLevel,
      hasBeenReplacedByVassal: this.hasBeenReplacedByVassal ? true : undefined,
      specialObjective: this.specialObjective?.id,
      victoryPoints: this.victoryPoints != 0 ? this.victoryPoints : undefined,
      completedObjectives:
        this.completedObjectives.length > 0
          ? this.completedObjectives.map((oc) => oc.id)
          : undefined,
      secretObjectives:
        admin || player?.house == this
          ? this.secretObjectives.length > 0
            ? this.secretObjectives.map((oc) => oc.id)
            : undefined
          : undefined
    };
  }

  static deserializeFromServer(game: Game, data: SerializedHouse): House {
    const house = new House(
      data.id,
      data.name,
      data.color,
      new BetterMap<UnitType, number>(
        data.unitLimits.map(([utid, limit]) => [unitTypes.get(utid), limit])
      ),
      data.powerTokens,
      data.maxPowerTokens,
      data.supplyLevel,
      new BetterMap<string, HouseCard>(
        data.houseCards.map(([hcid, data]) => {
          if (game.vassalHouseCards.has(hcid)) {
            return [hcid, game.vassalHouseCards.get(hcid)];
          }
          return [hcid, HouseCard.deserializeFromServer(data)];
        })
      ),
      data.laterHouseCards
        ? new BetterMap<string, HouseCard>(
            data.laterHouseCards.map(([string, data]) => [
              string,
              HouseCard.deserializeFromServer(data)
            ])
          )
        : null,
      data.victoryPoints,
      data.hasBeenReplacedByVassal
    );

    house.knowsNextWildlingCard = data.knowsNextWildlingCard ?? false;
    house.specialObjective = data.specialObjective
      ? specialObjectiveCards.get(data.specialObjective)
      : null;
    house.completedObjectives =
      data.completedObjectives?.map((ocid) => objectiveCards.get(ocid)) ?? [];
    house.secretObjectives =
      data.secretObjectives?.map((ocid) => objectiveCards.get(ocid)) ?? [];
    return house;
  }
}

export interface SerializedHouse {
  id: string;
  name: string;
  color: string;
  knowsNextWildlingCard?: boolean;
  houseCards: [string, SerializedHouseCard][];
  laterHouseCards?: [string, SerializedHouseCard][];
  unitLimits: [string, number][];
  powerTokens: number;
  maxPowerTokens: number;
  supplyLevel: number;
  victoryPoints?: number;
  hasBeenReplacedByVassal?: boolean;
  specialObjective?: string;
  secretObjectives?: string[];
  completedObjectives?: string[];
}
