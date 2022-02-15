import Order from "./Order";
import {
    raid, specialRaid,
    marchMinusOne, march, marchPlusOne,
    support, supportPlusOne,
    defensePlusOne, defensePlusTwo,
    consolidatePower, specialConsolidatePower,
    seaIronBank, seaMarchMinusOne, seaSupport,
    defensePlusThree, raidSupportPlusOne, defensePlusOneMuster
} from "./order-types/orderTypes";
import BetterMap from "../../../utils/BetterMap";

const orders = new BetterMap<number, Order>([
    // Player houses orders
    [1, new Order(1, marchMinusOne)],
    [2, new Order(2, march)],
    [3, new Order(3, marchPlusOne)],
    [4, new Order(4, defensePlusOne)],
    [5, new Order(5, defensePlusOne)],
    [6, new Order(6, defensePlusTwo)],
    [7, new Order(7, support)],
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
    // Sea orders
    [20, new Order(20, seaMarchMinusOne)],
    [21, new Order(21, seaSupport)],
    [22, new Order(22, seaIronBank)]
]);

export default orders;

export const playerHousesOrders = orders.values.slice(0, 15);
export const vassalHousesOrders = orders.values.slice(15, 19);
export const seaOrders = orders.values.slice(19);
export const ironBankOrder = orders.values[orders.size - 1];
