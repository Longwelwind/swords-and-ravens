import BetterMap from "../utils/BetterMap";
import aeronImage, { big } from "../../public/images/house-cards/Aeron.png";
import alesterImage from "../../public/images/house-cards/Alester.png";
import aeroImage from "../../public/images/house-cards/Areo.png";
import arianneImage from "../../public/images/house-cards/Arianne.png";
import ashaImage from "../../public/images/house-cards/Asha.png";
import balonImage from "../../public/images/house-cards/Balon.png";
import blackfishImage from "../../public/images/house-cards/Blackfish.png";
import brienneImage from "../../public/images/house-cards/Brienne.png";
import catelynImage from "../../public/images/house-cards/Catelyn.png";
import cerseiImage from "../../public/images/house-cards/Cersei.png";
import dagmarImage from "../../public/images/house-cards/Dagmar.png";
import darkStarImage from "../../public/images/house-cards/DarkStar.png";
import davosImage from "../../public/images/house-cards/Davos.png";
import doranImage from "../../public/images/house-cards/Doran.png";
import eddardImage from "../../public/images/house-cards/Eddard.png";
import euronImage from "../../public/images/house-cards/Euron.png";
import garlanImage from "../../public/images/house-cards/Garlan.png";
import greatjonImage from "../../public/images/house-cards/Greatjon.png";
import gregorImage from "../../public/images/house-cards/Gregor.png";
import houndImage from "../../public/images/house-cards/Hound.png";
import jaimeImage from "../../public/images/house-cards/Jaime.png";
import kevanImage from "../../public/images/house-cards/Kevan.png";
import lorasImage from "../../public/images/house-cards/Loras.png";
import maceImage from "../../public/images/house-cards/Mace.png";
import margaeryImage from "../../public/images/house-cards/Margaery.png";
import melisandreImage from "../../public/images/house-cards/Melisandre.png";
import nymeriaImage from "../../public/images/house-cards/Nymeria.png";
import obaraImage from "../../public/images/house-cards/Obara.png";
import patchfaceImage from "../../public/images/house-cards/Patchface.png";
import queenImage from "../../public/images/house-cards/Queen.png";
import randyllImage from "../../public/images/house-cards/Randyll.png";
import redViperImage from "../../public/images/house-cards/RedViper.png";
import renlyImage from "../../public/images/house-cards/Renly.png";
import robbImage from "../../public/images/house-cards/Robb.png";
import rodrickImage from "../../public/images/house-cards/Rodrick.png";
import rooseImage from "../../public/images/house-cards/Roose.png";
import salladhorImage from "../../public/images/house-cards/Salladhor.png";
import stannisImage from "../../public/images/house-cards/Stannis.png";
import theonImage from "../../public/images/house-cards/Theon.png";
import tyrionImage from "../../public/images/house-cards/Tyrion.png";
import tywinImage from "../../public/images/house-cards/Tywin.png";
import victorianImage from "../../public/images/house-cards/Victorian.png";

// A Dance with Dragons House Cards
// Baratheon
import manceImage from "../../public/images/house-cards/ManceRayderADWD.png";
import axelImage from "../../public/images/house-cards/SerAxellFlorentADWD.png"
import davosADWDImage from "../../public/images/house-cards/SerDavosSeaworthADWD.png"
import bastardNightImage from "../../public/images/house-cards/BastardOfNightsongADWD.png"
import stannisADWDImage from "../../public/images/house-cards/StannisBaratheonADWD.png"
import melisandreADWDImage from "../../public/images/house-cards/MelisandreADWD.png"
import jonSnowADWDImage from "../../public/images/house-cards/JonSnowADWD.png"
// Martell
import quentynImage from "../../public/images/house-cards/QuentynMartellADWD.png"
import nymeriaADWDImage from "../../public/images/house-cards/NymeriaSandADWD.png"
import gerrisImage from "../../public/images/house-cards/SerGerrisDrinkwaterADWD.png"
import doranADWDImage from "../../public/images/house-cards/DoranMartellADWD.png"
import bastardGodImage from "../../public/images/house-cards/BastardOfGodsgraceADWD.png"
import bigMenImage from "../../public/images/house-cards/BigManADWD.png"
import areoADWDImage from "../../public/images/house-cards/AreoHotahADWD.png"
// Stark
import bwalderImage from "../../public/images/house-cards/BlackWalderADWD.png"
import rooseBaltonAdwdImage from "../../public/images/house-cards/RooseBoltonADWD.png"
import dancerImage from "../../public/images/house-cards/DamonDanceForMeADWD.png"
import steelshanksImage from "../../public/images/house-cards/SteelshanksWaltonADWD.png"
import ramsayBaltonAdwdImage from "../../public/images/house-cards/RamsayBoltonADWD.png"
import reekAdwdImage from "../../public/images/house-cards/ReekADWD.png"
import walderFreyImage from "../../public/images/house-cards/WalderFreyADWD.png"


const houseCardImages = new BetterMap([
    ["queen-of-thorns", queenImage],
    ["aeron-damphair", aeronImage],
    ["alester-florent", alesterImage],
    ["arianne-martell", arianneImage],
    ["areo-hotah", aeroImage],
    ["asha-greyjoy", ashaImage],
    ["balon-greyjoy", balonImage],
    ["the-blackfish", blackfishImage],
    ["brienne-of-tarth", brienneImage],
    ["catelyn-stark", catelynImage],
    ["cersei-lannister", cerseiImage],
    ["dagmar-cleftjaw", dagmarImage],
    ["darkstar", darkStarImage],
    ["ser-davos-seaworth", davosImage],
    ["doran-martell", doranImage],
    ["eddard-stark", eddardImage],
    ["euron-crows-eye", euronImage],
    ["ser-garlan-tyrell", garlanImage],
    ["greatjon-umber", greatjonImage],
    ["ser-gregor-clegane", gregorImage],
    ["the-hound", houndImage],
    ["ser-jaime-lannister", jaimeImage],
    ["ser-kevan-lannister", kevanImage],
    ["ser-loras-tyrell", lorasImage],
    ["mace-tyrell", maceImage],
    ["margaery-tyrell", margaeryImage],
    ["melisandre", melisandreImage],
    ["nymeria-sand", nymeriaImage],
    ["obara-sand", obaraImage],
    ["patchface", patchfaceImage],
    ["queen-of-thorns", queenImage],
    ["randyll-tarly", randyllImage],
    ["the-red-viper", redViperImage],
    ["renly-baratheon", renlyImage],
    ["robb-stark", robbImage],
    ["ser-rodrick-cassel", rodrickImage],
    ["roose-bolton", rooseImage],
    ["salladhor-saan", salladhorImage],
    ["stannis-baratheon", stannisImage],
    ["theon-greyjoy", theonImage],
    ["tyrion-lannister", tyrionImage],
    ["tywin-lannister", tywinImage],
    ["victarion-greyjoy", victorianImage],
    // A Dance with Dragons House Cards
    // Baratheon
    ["mance-rayder", manceImage],
    ["axel-florent", axelImage],
    ["ser-davos-seaworth-adwd", davosADWDImage],
    ["bastard-of-nightsong", bastardNightImage],
    ["jon-snow-adwd", jonSnowADWDImage],
    ["stannis-baratheon-adwd", stannisADWDImage],
    ["melisandre-adwd", melisandreADWDImage],
    // Martell
    ["ser-gerris-drinkwater", gerrisImage],
    ["nymeria-sand-adwd", nymeriaADWDImage], 
    ["quentyn-martell", quentynImage],
    ["doran-martell-adwd", doranADWDImage],
    ["big-man-adwd", bigMenImage],
    ["areo-hotah-adwd", areoADWDImage],
    ["bastard-of-godsgrace-adwd", bastardGodImage],
    // Stark
    ["black-walder-adwd", bwalderImage],
    ["roose-bolton-adwd", rooseBaltonAdwdImage],
    ["damon-dance-for-me-adwd", dancerImage],
    ["steelshanks-walton-adwd", steelshanksImage],
    ["ramsay-bolton-adwd", ramsayBaltonAdwdImage],
    ["reek-adwd", reekAdwdImage],
    ["walder-frey-adwd", walderFreyImage]
]);

export default houseCardImages;
