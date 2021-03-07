import Order from "./Order";
import {
    consolidatePower,
    specialConsolidatePower,
    march,
    marchMinusOne,
    marchPlusOne, raid, specialRaid,
    support,
    supportPlusOne, defensePlusOne, defensePlusTwo, defensePlusThree, raidSupportPlusOne, defensePlusOneMuster
} from "./order-types/orderTypes";
import BetterMap from "../../../utils/BetterMap";

export const marchMinusOneOrder = new Order(1, marchMinusOne);
export const marchOrder = new Order(2, march);

export const firstSupportOrder = new Order(7, support);

const orders = new BetterMap<number, Order>([
    // Player houses orders
    [marchMinusOneOrder.id, marchMinusOneOrder],
    [marchOrder.id, marchOrder],
    [3, new Order(3, marchPlusOne)],
    [4, new Order(4, defensePlusOne)],
    [5, new Order(5, defensePlusOne)],
    [6, new Order(6, defensePlusTwo)],
    [firstSupportOrder.id, firstSupportOrder],
    [8, new Order(8, support)],
    [9, new Order(9, supportPlusOne)],
    [10, new Order(10, consolidatePower)],
    [11, new Order(11, consolidatePower)],
    [12, new Order(12, specialConsolidatePower)],
    [13, new Order(13, raid)],
    [14, new Order(14, raid)],
    [15, new Order(15, specialRaid)],
    // Vassal houses orders
    [16, new Order(16, march)],
    [17, new Order(17, raidSupportPlusOne)],
    [18, new Order(18, defensePlusOneMuster)],
    [19, new Order(19, defensePlusThree)],
]);

export default orders;

export const playerHousesOrders = orders.values.slice(0, 15);

export const vassalHousesOrders = orders.values.slice(15);