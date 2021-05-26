import BetterMap from "../utils/BetterMap";
import baratheonInfluence from "../../public/images/influence/BaratheonInfluence.png";
import starkInfluence from "../../public/images/influence/StarkInfluence.png";
import greyjoyInfluence from "../../public/images/influence/GreyjoyInfluence.png";
import martellInfluence from "../../public/images/influence/MartellInfluence.png";
import tyrellInfluence from "../../public/images/influence/TyrellInfluence.png";
import lannisterInfluence from "../../public/images/influence/LannisterInfluence.png";
import arrynInfluence from "../../public/images/influence/ArrynInfluence.png";

const houseInfluenceImages = new BetterMap([
    ["baratheon", baratheonInfluence],
    ["lannister", lannisterInfluence],
    ["stark", starkInfluence],
    ["greyjoy", greyjoyInfluence],
    ["tyrell", tyrellInfluence],
    ["martell", martellInfluence],
    ["arryn", arrynInfluence]
]);

export default houseInfluenceImages;
