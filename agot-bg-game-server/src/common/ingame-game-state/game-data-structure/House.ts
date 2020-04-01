import HouseCard, {SerializedHouseCard} from "./house-card/HouseCard";
import {observable} from "mobx";
import BetterMap from "../../../utils/BetterMap";
import UnitType from "./UnitType";
import unitTypes from "./unitTypes";

export default class House {
    id: string;
    name: string;
    color: string;
    houseCards: BetterMap<string, HouseCard>;
    unitLimits: BetterMap<UnitType, number>;
    @observable powerTokens: number;
    @observable supplyLevel: number;

    constructor(id: string, name: string, color: string, houseCards: BetterMap<string, HouseCard>, unitLimits: BetterMap<UnitType, number>, powerTokens: number, supplyLevel: number) {
        this.id = id;
        this.name = name;
        this.color = color;
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
            houseCards: this.houseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()]),
            unitLimits: this.unitLimits.map((unitType, limit) => [unitType.id, limit]),
            powerTokens: this.powerTokens,
            supplyLevel: this.supplyLevel
        };
    }

    static deserializeFromServer(data: SerializedHouse): House {
        return new House(
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
    }
}

export interface SerializedHouse {
    id: string;
    name: string;
    color: string;
    houseCards: [string, SerializedHouseCard][];
    unitLimits: [string, number][];
    powerTokens: number;
    supplyLevel: number;
}
