import OrderType from "./OrderType";

export default class ConsolidatePowerOrderType extends OrderType {
    toString(): string {
        return "CP";
    }
}
