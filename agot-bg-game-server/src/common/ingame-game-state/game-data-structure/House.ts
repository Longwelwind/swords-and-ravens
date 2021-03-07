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
    knowsNextWildlingCard: boolean;
    houseCards: BetterMap<string, HouseCard>;
    unitLimits: BetterMap<UnitType, number>;
    @observable powerTokens: number;
    @observable supplyLevel: number;

    constructor(id: string, name: string, color: string, houseCards: BetterMap<string, HouseCard>, unitLimits: BetterMap<UnitType, number>, powerTokens: number, supplyLevel: number) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.knowsNextWildlingCard = false;
        this.houseCards = houseCards;
        this.unitLimits = unitLimits;
        this.powerTokens = powerTokens;
        this.supplyLevel = supplyLevel;
    }

    serializeToClient(): SerializedHouse {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            knowsNextWildlingCard: this.knowsNextWildlingCard,
            houseCards: this.houseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()]),
            unitLimits: this.unitLimits.map((unitType, limit) => [unitType.id, limit]),
            powerTokens: this.powerTokens,
            supplyLevel: this.supplyLevel
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
            data.supplyLevel
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
    supplyLevel: number;
}
