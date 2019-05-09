import OrderType from "./order-types/OrderType";

export default class Order {
    id: number;
    type: OrderType;

    constructor(id: number, type: OrderType) {
        this.id = id;
        this.type = type;
    }
}
