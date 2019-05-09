import OrderType from "./OrderType";
import * as _ from "lodash";
import DefenseOrderType from "./DefenseOrderType";
import ConsolidatePowerOrderType from "./ConsolidatePowerOrderType";
import Order from "../Order";
import SupportOrderType from "./SupportOrderType";

export default class RaidOrderType extends OrderType {
    toString(): string {
        return "R";
    }

    getRaidableOrderTypes(): any[] {
        return _.concat(
            [RaidOrderType, ConsolidatePowerOrderType, SupportOrderType],
            this.starred ? [DefenseOrderType] : []
        );
    }

    isValidRaidableOrder(order: Order): boolean {
        return this.getRaidableOrderTypes().some(ot => order.type instanceof ot);
    }
}
