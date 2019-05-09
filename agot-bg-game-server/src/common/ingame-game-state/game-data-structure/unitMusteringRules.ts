import UnitType from "./UnitType";
import {footman, knight, ship, siegeEngine} from "./unitTypes";
import Unit from "./Unit";

export type UnitMusteringRule = {from: UnitType | null; to: UnitType; cost: number};

const unitMusteringRules: UnitMusteringRule[] = [
    {from: null, to: footman, cost: 1},
    {from: null, to: knight, cost: 2},
    {from: null, to: siegeEngine, cost: 2},
    {from: footman, to: knight, cost: 1},
    {from: footman, to: siegeEngine, cost: 1},
    {from: null, to: ship, cost: 1}
];

export default unitMusteringRules;

export function isValidMusteringRule(from: UnitType | null, to: UnitType): boolean {
    const rule = unitMusteringRules.find(r => r.from == from && r.to == to);

    return rule != null;
}

export function getCostOfMusteringRule(from: UnitType | null, to: UnitType): number {
    const rule = unitMusteringRules.find(r => r.from == from && r.to == to);
    if (!rule) {
        throw new Error();
    }

    return rule.cost;
}
