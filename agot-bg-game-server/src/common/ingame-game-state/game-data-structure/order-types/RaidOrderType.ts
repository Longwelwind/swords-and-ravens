import OrderType from "./OrderType";
import * as _ from "lodash";
import DefenseOrderType from "./DefenseOrderType";
import ConsolidatePowerOrderType from "./ConsolidatePowerOrderType";
import Order from "../Order";
import SupportOrderType from "./SupportOrderType";
import RaidSupportOrderType from "./RaidSupportOrderType";
import DefenseMusterOrderType from "./DefenseMusterOrderType";
import IronBankOrderType from "./IronBankOrderType";

export default class RaidOrderType extends OrderType {
    getRaidableOrderTypes(): any[] {
        return _.concat(
            [RaidOrderType, ConsolidatePowerOrderType, SupportOrderType, RaidSupportOrderType, IronBankOrderType],
            this.starred ? [DefenseOrderType, DefenseMusterOrderType] : []
        );
    }

    isValidRaidableOrder(order: Order): boolean {
        return this.getRaidableOrderTypes().some(ot => order.type instanceof ot);
    }
}
