import BetterMap from "../utils/BetterMap";
import baratheonOrder from "../../public/images/orders/BaratheonOrder.png";
import boltonOrder from "../../public/images/orders/BoltonOrder.png";
import tyrellOrder from "../../public/images/orders/TyrellOrder.png";
import martellOrder from "../../public/images/orders/MartellOrder.png";
import starkOrder from "../../public/images/orders/StarkOrder.png";
import greyjoyOrder from "../../public/images/orders/GreyjoyOrder.png";
import lannisterOrder from "../../public/images/orders/LannisterOrder.png";
import arrynOrder from "../../public/images/orders/ArrynOrder.png";
import targaryenOrder from "../../public/images/orders/TargaryenOrder.png";

const houseOrderImages = new BetterMap([
    ["tyrell", tyrellOrder],
    ["baratheon", baratheonOrder],
    ["stark", starkOrder],
    ["martell", martellOrder],
    ["lannister", lannisterOrder],
    ["greyjoy", greyjoyOrder],
    ["arryn", arrynOrder],
    ["bolton", boltonOrder],
    ["targaryen", targaryenOrder]
]);

export default houseOrderImages;
