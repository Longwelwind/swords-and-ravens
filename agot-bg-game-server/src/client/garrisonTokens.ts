import theEyrie6 from "../../public/images/garrisons/the-eyrie-6.png";
import theEyrie4 from "../../public/images/garrisons/the-eyrie-4.png";
import kingsLanding from "../../public/images/garrisons/kings-landing-5.png";
import pyke from "../../public/images/garrisons/pyke-2.png";
import winterfell from "../../public/images/garrisons/winterfell-2.png";
import lannisport from "../../public/images/garrisons/lannisport-2.png";
import sunspear from "../../public/images/garrisons/sunspear-2.png";
import highgarden from "../../public/images/garrisons/highgarden-2.png";
import dragonstone from "../../public/images/garrisons/dragonstone-2.png";
import stormsend from "../../public/images/garrisons/storms-end.png";
import oldtown from "../../public/images/garrisons/oldtown.png";

import BetterMap from "../utils/BetterMap";

const garrisonTokens = new BetterMap([
    ["the-eyrie", new BetterMap([[4, theEyrie4], [6, theEyrie6]])],
    ["kings-landing", new BetterMap([[5, kingsLanding]])],
    ["pyke", new BetterMap([[2, pyke]])],
    ["winterfell", new BetterMap([[2, winterfell]])],
    ["sunspear", new BetterMap([[2, sunspear]])],
    ["highgarden", new BetterMap([[2, highgarden]])],
    ["lannisport", new BetterMap([[2, lannisport]])],
    ["dragonstone", new BetterMap([[2, dragonstone]])],
    ["storms-end", new BetterMap([[4, stormsend]])],
    ["oldtown", new BetterMap([[3, oldtown]])]
]);

export default function getGarrisonToken(regionId: string, garrisonValue: number): string | null {
    if (!garrisonTokens.has(regionId)) {
        console.warn(`Garrison for ${regionId} with value ${garrisonValue} is not defined!`);
        return null;
    }

    const garrisons = garrisonTokens.get(regionId);

    if (garrisons.size == 1) {
        return garrisons.values[0];
    }

    if (garrisons.has(garrisonValue)) {
        return garrisons.get(garrisonValue);
    }

    console.warn(`Garrison for ${regionId} with value ${garrisonValue} is not defined!`);
    return null;
}
