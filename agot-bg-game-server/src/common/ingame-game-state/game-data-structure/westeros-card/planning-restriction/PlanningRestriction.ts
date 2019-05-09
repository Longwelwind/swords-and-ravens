import OrderType from "../../order-types/OrderType";

export default class PlanningRestriction {
    id: string;
    restriction: (orderType: OrderType) => boolean;

    constructor(id: string, restriction: (orderType: OrderType) => boolean) {
        this.id = id;
        this.restriction = restriction;
    }
}
