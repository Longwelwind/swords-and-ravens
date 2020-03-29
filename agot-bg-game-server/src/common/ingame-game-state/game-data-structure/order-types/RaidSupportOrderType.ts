import OrderType from "./OrderType";
import * as _ from "lodash";
import ConsolidatePowerOrderType from "./ConsolidatePowerOrderType";
import Order from "../Order";
import SupportOrderType from "./SupportOrderType";
import RaidOrderType from "./RaidOrderType";

export default class RaidSupportOrderType extends OrderType {
    supportModifier: number;

    constructor(id: string, name: string, starred = false, supportModifier = 0) {
        super(id, name, starred);
        this.supportModifier = supportModifier;
    }

    getRaidableOrderTypes(): any[] {
        return _.concat(
            [RaidOrderType, ConsolidatePowerOrderType, SupportOrderType]
        );
    }

    isValidRaidableOrder(order: Order): boolean {
        return this.getRaidableOrderTypes().some(ot => order.type instanceof ot);
    }
}
