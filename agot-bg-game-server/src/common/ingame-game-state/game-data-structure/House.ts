import HouseCard, {SerializedHouseCard} from "./house-card/HouseCard";
import {observable} from "mobx";
import BetterMap from "../../../utils/BetterMap";
import UnitType from "./UnitType";
import unitTypes from "./unitTypes";
import Game from "./Game";
import { ObjectiveCard, SpecialObjectiveCard } from "./static-data-structure/ObjectiveCard";
import Player from "../Player";
import { objectiveCards, specialObjectiveCards } from "./static-data-structure/objectiveCards";
import ThematicDraftHouseCardsGameState from "../thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";

export default class House {
    id: string;
    name: string;
    color: string;
    unitLimits: BetterMap<UnitType, number>;
    maxPowerTokens: number;
    @observable houseCards: BetterMap<string, HouseCard>;
    laterHouseCards: BetterMap<string, HouseCard> | null;
    @observable powerTokens: number;
    @observable supplyLevel: number;
    @observable knowsNextWildlingCard: boolean;
    @observable gainedLoyaltyTokens: number;
    @observable hasBeenReplacedByVassal: boolean;
    specialObjective: SpecialObjectiveCard | null;
    @observable secretObjectives: ObjectiveCard[];
    @observable completedObjectives: ObjectiveCard[];
    @observable victoryPoints: number;

    constructor(id: string, name: string, color: string, unitLimits: BetterMap<UnitType, number>,
        powerTokens: number, maxPowerTokens: number, supplyLevel: number, houseCards: BetterMap<string, HouseCard>,
        laterHouseCards: BetterMap<string, HouseCard> | null = null,
        gainedLoyaltyTokens = 0, hasBeenReplacedByVassal = false, victoryPoints = 0) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.knowsNextWildlingCard = false;
        this.unitLimits = unitLimits;
        this.powerTokens = powerTokens;
        this.supplyLevel = supplyLevel;
        this.houseCards = houseCards;
        this.laterHouseCards = laterHouseCards;
        this.gainedLoyaltyTokens = gainedLoyaltyTokens;
        this.hasBeenReplacedByVassal = hasBeenReplacedByVassal;
        this.maxPowerTokens = maxPowerTokens;
        this.victoryPoints = victoryPoints;
        this.secretObjectives = [];
        this.completedObjectives = [];
        this.specialObjective = null;
    }

    serializeToClient(admin: boolean, player: Player | null, game: Game): SerializedHouse {
        // Only serialize house cards to all clients if house is no vassal house to not reveal the created hand of vassals during combat
        const isVassalHouse = game.ingame.isVassalHouse(this);

        // During thematic draft only serialize own house cards to players
        const isThematicDraft = game.ingame.childGameState instanceof ThematicDraftHouseCardsGameState;

        const serializedHouseCards = this.houseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()] as [string, SerializedHouseCard]);

        return {
            id: this.id,
            name: this.name,
            color: this.color,
            knowsNextWildlingCard: this.knowsNextWildlingCard,
            houseCards: admin
                ? serializedHouseCards
                : isThematicDraft
                    ? player?.house == this
                        ? serializedHouseCards
                        : []
                    : !isVassalHouse
                        ? serializedHouseCards
                        : [],
            laterHouseCards: admin && this.laterHouseCards != null // laterHouseCards are used server-side only. Therefore clients always receive "null"
                ? this.laterHouseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()] as [string, SerializedHouseCard])
                : null,
            unitLimits: this.unitLimits.map((unitType, limit) => [unitType.id, limit]),
            powerTokens: this.powerTokens,
            maxPowerTokens: this.maxPowerTokens,
            supplyLevel: this.supplyLevel,
            gainedLoyaltyTokens: this.gainedLoyaltyTokens,
            hasBeenReplacedByVassal: this.hasBeenReplacedByVassal,
            specialObjective: this.specialObjective ? this.specialObjective.id : null,
            victoryPoints: this.victoryPoints,
            completedObjectives: this.completedObjectives.map(oc => oc.id),
            secretObjectives: (admin || player?.house == this) ? this.secretObjectives.map(oc => oc.id) : []
        };
    }

    static deserializeFromServer(_game: Game, data: SerializedHouse): House {
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
                data.houseCards.map(([string, data]) => [string, HouseCard.deserializeFromServer(data)])),
            data.laterHouseCards
                ? new BetterMap<string, HouseCard>(data.laterHouseCards.map(([string, data]) => [string, HouseCard.deserializeFromServer(data)]))
                : null,
            data.gainedLoyaltyTokens,
            data.hasBeenReplacedByVassal,
            data.victoryPoints
        );

        house.knowsNextWildlingCard = data.knowsNextWildlingCard;
        house.specialObjective = data.specialObjective ? specialObjectiveCards.get(data.specialObjective) : null;
        house.completedObjectives = data.completedObjectives.map(ocid => objectiveCards.get(ocid));
        house.secretObjectives = data.secretObjectives.map(ocid => objectiveCards.get(ocid));
        return house;
    }
}

export interface SerializedHouse {
    id: string;
    name: string;
    color: string;
    knowsNextWildlingCard: boolean;
    houseCards: [string, SerializedHouseCard][];
    laterHouseCards: [string, SerializedHouseCard][] | null;
    unitLimits: [string, number][];
    powerTokens: number;
    maxPowerTokens: number;
    supplyLevel: number;
    gainedLoyaltyTokens: number;
    hasBeenReplacedByVassal: boolean;
    specialObjective: string | null;
    secretObjectives: string[];
    completedObjectives: string[];
    victoryPoints: number;
}
