import BetterMap from "../utils/BetterMap";
import arrynImage from "../../public/images/icons/houses/arryn.svg"
import baratheonImage from "../../public/images/icons/houses/baratheon.svg"
import boltonImage from "../../public/images/icons/houses/bolton.svg"
import greyjoyImage from "../../public/images/icons/houses/greyjoy.svg"
import lannisterImage from "../../public/images/icons/houses/lannister.svg"
import martellImage from "../../public/images/icons/houses/martell.svg"
import starkImage from "../../public/images/icons/houses/stark.svg"
import targaryenImage from "../../public/images/icons/houses/targaryen.svg"
import tyrellImage from "../../public/images/icons/houses/tyrell.svg"


const houseIconImages = new BetterMap([
    ["baratheon", baratheonImage],
    ["lannister", lannisterImage],
    ["stark", starkImage],
    ["greyjoy", greyjoyImage],
    ["tyrell", tyrellImage],
    ["martell", martellImage],
    ["arryn", arrynImage],
    ["bolton", boltonImage],
    ["targaryen", targaryenImage]
]);


export function setStarkIconImage(): void {
    houseIconImages.set("stark", starkImage);
}

export function setBoltonIconImage(): void {
    houseIconImages.set("stark", boltonImage);
}

export default houseIconImages;
