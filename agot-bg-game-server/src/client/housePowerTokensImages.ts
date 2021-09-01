import BetterMap from "../utils/BetterMap";
import baratheonPowerToken from "../../public/images/power-tokens/BaratheonPower.png";
import boltonPowerToken from '../../public/images/power-tokens/BoltonPower.png'
import tyrellPowerToken from "../../public/images/power-tokens/TyrellPower.png";
import martellPowerToken from "../../public/images/power-tokens/MartellPower.png";
import starkPowerToken from "../../public/images/power-tokens/StarkPower.png";
import greyjoyPowerToken from "../../public/images/power-tokens/GreyjoyPower.png";
import lannisterPowerToken from "../../public/images/power-tokens/LannisterPower.png";
import arrynPowerToken from "../../public/images/power-tokens/ArrynPower.png";
import targaryenPowerToken from "../../public/images/power-tokens/TargaryenPower.png";

const housePowerTokensImages = new BetterMap([
    ["tyrell", tyrellPowerToken],
    ["baratheon", baratheonPowerToken],
    ["stark", starkPowerToken],
    ["martell", martellPowerToken],
    ["lannister", lannisterPowerToken],
    ["greyjoy", greyjoyPowerToken],
    ["arryn", arrynPowerToken],
    ["bolton", boltonPowerToken],
    ["targaryen", targaryenPowerToken]
]);

export default housePowerTokensImages;
