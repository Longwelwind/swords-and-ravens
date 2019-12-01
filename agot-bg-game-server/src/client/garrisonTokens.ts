import theEyrie from "../../public/images/garrisons/the-eyrie-6.png";
import kingsLanding from "../../public/images/garrisons/kings-landing-5.png";
import pyke from "../../public/images/garrisons/pyke-2.png";
import winterfell from "../../public/images/garrisons/winterfell-2.png";
import lannisport from "../../public/images/garrisons/lannisport-2.png";
import sunspear from "../../public/images/garrisons/sunspear-2.png";
import highgarden from "../../public/images/garrisons/highgarden-2.png";
import dragonstone from "../../public/images/garrisons/dragonstone-2.png";

import BetterMap from "../utils/BetterMap";


const garrisonTokens = new BetterMap([
    ["the-eyrie", theEyrie],
    ["kings-landing", kingsLanding],
    ["pyke", pyke],
    ["winterfell", winterfell],
    ["sunspear", sunspear],
    ["highgarden", highgarden],
    ["lannisport", lannisport],
    ["dragonstone", dragonstone],
]);

export default garrisonTokens;
