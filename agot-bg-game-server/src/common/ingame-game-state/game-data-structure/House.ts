import HouseCard, {SerializedHouseCard} from "./house-card/HouseCard";
import {observable} from "mobx";
import BetterMap from "../../../utils/BetterMap";

const MAX_POWER_TOKENS = 20;

export default class House {
    id: string;
    name: string;
    color: string;
    houseCards: BetterMap<string, HouseCard>;
    @observable powerTokens: number;
    @observable supplyLevel: number;

    constructor(id: string, name: string, color: string, houseCards: BetterMap<string, HouseCard>, powerTokens: number, supplyLevel: number) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.houseCards = houseCards;
        this.powerTokens = powerTokens;
        this.supplyLevel = supplyLevel;
    }

    changePowerTokens(delta: number) {
        this.powerTokens += delta;
        this.powerTokens = Math.max(0, Math.min(this.powerTokens, MAX_POWER_TOKENS));
    }

    serializeToClient(): SerializedHouse {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            houseCards: this.houseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()]),
            powerTokens: this.powerTokens,
            supplyLevel: this.supplyLevel
        };
    }

    static deserializeFromServer(data: SerializedHouse): House {
        return new House(data.id, data.name, data.color, new BetterMap<string, HouseCard>(
            data.houseCards.map(([string, data]) => [string, HouseCard.deserializeFromServer(data)]),
        ), data.powerTokens, data.supplyLevel);
    }
}

export interface SerializedHouse {
    id: string;
    name: string;
    color: string;
    houseCards: [string, SerializedHouseCard][];
    powerTokens: number;
    supplyLevel: number;
}
