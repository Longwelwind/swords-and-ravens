import HouseCard, {SerializedHouseCard} from "./house-card/HouseCard";
import {observable} from "mobx";
import BetterMap from "../../../utils/BetterMap";
import UnitType from "./UnitType";
import unitTypes from "./unitTypes";
import Game, { SerializedGame } from "./Game";

const MAX_POWER_TOKENS = 20;

export default class House {
    id: string;
    name: string;
    color: string;
    game: Game;
    houseCards: BetterMap<string, HouseCard>;
    unitLimits: BetterMap<UnitType, number>;
    @observable powerTokens: number;
    @observable supplyLevel: number;

    constructor(id: string, name: string, color: string, houseCards: BetterMap<string, HouseCard>, unitLimits: BetterMap<UnitType, number>, powerTokens: number, supplyLevel: number, game: Game) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.houseCards = houseCards;
        this.unitLimits = unitLimits;
        this.powerTokens = powerTokens; // Available Power tokens
        this.supplyLevel = supplyLevel;
        this.game = game;
    }

    changePowerTokens(delta: number): number {
        const originalValue = this.powerTokens;
        const powerTokensOnBoard = this.game.world.regions.entries.filter(([_id, region]) => region.controlPowerToken == this).length;

        this.powerTokens += delta;
        this.powerTokens = Math.max(0, Math.min(this.powerTokens, MAX_POWER_TOKENS - powerTokensOnBoard));

        return this.powerTokens - originalValue;
    }

    serializeToClient(admin: boolean): SerializedHouse {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            houseCards: this.houseCards.entries.map(([houseCardId, houseCard]) => [houseCardId, houseCard.serializeToClient()]),
            unitLimits: this.unitLimits.map((unitType, limit) => [unitType.id, limit]),
            powerTokens: this.powerTokens,
            supplyLevel: this.supplyLevel,
            game: this.game.serializeToClient(admin)
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
            data.supplyLevel,
            Game.deserializeFromServer(data.game)
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
    game: SerializedGame;
}
