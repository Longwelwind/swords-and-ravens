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

    tooltipText(): string {
        let tooltip = "Raid Orders may remove one adjacent Raid, Support, or Consolidate Power Order."
        if (this.starred) {
            tooltip += " The Special Raid Order may remove one adjacent Defense Order."
        }
        tooltip += " Ships may raid land areas. Raiding a Consolidate Power Order will pillage (steal) one Power token from the target player. If the player has no tokens, the raiding player still earns one token.";
        return tooltip;
    }
}
