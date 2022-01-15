import HouseCard, {SerializedHouseCard} from "./house-card/HouseCard";
import {observable} from "mobx";
import BetterMap from "../../../utils/BetterMap";
import UnitType from "./UnitType";
import unitTypes from "./unitTypes";
import Game from "./Game";

export default class House {
    id: string;
    name: string;
    color: string;
    unitLimits: BetterMap<UnitType, number>;
    maxPowerTokens: number;
    @observable houseCards: BetterMap<string, HouseCard>;
    @observable powerTokens: number;
    @observable supplyLevel: number;
    @observable knowsNextWildlingCard: boolean;
    @observable gainedLoyaltyTokens: number;
    @observable hasBeenReplacedByVassal: boolean;
    @observable completedObjectives: number;

    constructor(id: string, name: string, color: string, houseCards: BetterMap<string, HouseCard>, unitLimits: BetterMap<UnitType, number>,
        powerTokens: number, maxPowerTokens: number, supplyLevel: number, gainedLoyaltyTokens: number, hasBeenReplacedByVassal: boolean, completedObjectives: number) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.knowsNextWildlingCard = false;
        this.houseCards = houseCards;
        this.unitLimits = unitLimits;
        this.powerTokens = powerTokens;
        this.supplyLevel = supplyLevel;
        this.gainedLoyaltyTokens = gainedLoyaltyTokens;
        this.hasBeenReplacedByVassal = hasBeenReplacedByVassal;
        this.maxPowerTokens = maxPowerTokens;
        this.completedObjectives = completedObjectives;
    }

    serializeToClient(admin: boolean, isVassalHouse: boolean): SerializedHouse {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            knowsNextWildlingCard: this.knowsNextWildlingCard,
            houseCards: (admin || !isVassalHouse) ? this.houseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()]) : [],
            unitLimits: this.unitLimits.map((unitType, limit) => [unitType.id, limit]),
            powerTokens: this.powerTokens,
            maxPowerTokens: this.maxPowerTokens,
            supplyLevel: this.supplyLevel,
            gainedLoyaltyTokens: this.gainedLoyaltyTokens,
            hasBeenReplacedByVassal: this.hasBeenReplacedByVassal,
            completedObjectives: this.completedObjectives
        };
    }

    static deserializeFromServer(_game: Game, data: SerializedHouse): House {
        const house = new House(
            data.id,
            data.name,
            data.color,
            new BetterMap<string, HouseCard>(
                data.houseCards.map(([string, data]) => [string, HouseCard.deserializeFromServer(data)]),
            ),
            new BetterMap<UnitType, number>(
                data.unitLimits.map(([utid, limit]) => [unitTypes.get(utid), limit])
            ),
            data.powerTokens,
            data.maxPowerTokens,
            data.supplyLevel,
            data.gainedLoyaltyTokens,
            data.hasBeenReplacedByVassal,
            data.completedObjectives
        );

        house.knowsNextWildlingCard = data.knowsNextWildlingCard;
        return house;
    }
}

export interface SerializedHouse {
    id: string;
    name: string;
    color: string;
    knowsNextWildlingCard: boolean;
    houseCards: [string, SerializedHouseCard][];
    unitLimits: [string, number][];
    powerTokens: number;
    maxPowerTokens: number;
    supplyLevel: number;
    gainedLoyaltyTokens: number;
    hasBeenReplacedByVassal: boolean;
    completedObjectives: number;
}
