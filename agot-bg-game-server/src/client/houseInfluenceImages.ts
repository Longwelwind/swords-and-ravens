import BetterMap from "../utils/BetterMap";
import baratheonInfluence from "../../public/images/influence/BaratheonInfluence.png";
import boltonInfluence from "../../public/images/influence/BoltonInfluence.png";
import starkInfluence from "../../public/images/influence/StarkInfluence.png";
import greyjoyInfluence from "../../public/images/influence/GreyjoyInfluence.png";
import martellInfluence from "../../public/images/influence/MartellInfluence.png";
import tyrellInfluence from "../../public/images/influence/TyrellInfluence.png";
import lannisterInfluence from "../../public/images/influence/LannisterInfluence.png";
import arrynInfluence from "../../public/images/influence/ArrynInfluence.png";
import targaryenImage from "../../public/images/influence/TargaryenInfluence.png";

const houseInfluenceImages = new BetterMap([
    ["baratheon", baratheonInfluence],
    ["lannister", lannisterInfluence],
    ["stark", starkInfluence],
    ["greyjoy", greyjoyInfluence],
    ["tyrell", tyrellInfluence],
    ["martell", martellInfluence],
    ["arryn", arrynInfluence],
    ["bolton", boltonInfluence],
    ["targaryen", targaryenImage]
]);


export function setStarkInfluenceImage(): void {
    houseInfluenceImages.set("stark", starkInfluence);
}

export function setBoltonInfluenceImage(): void {
    houseInfluenceImages.set("stark", boltonInfluence);
}

export default houseInfluenceImages;
