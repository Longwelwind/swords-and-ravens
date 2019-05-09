import BetterMap from "../utils/BetterMap";
import crowKillers from "../../public/images/wildling-cards/CrowKillersLarge.png";
import hordeDescends from "../../public/images/wildling-cards/HordeDescendsLarge.png";
import kingBeyond from "../../public/images/wildling-cards/KingBeyondLarge.png";
import mammoth from "../../public/images/wildling-cards/Mammothlarge.png";
import milkwater from "../../public/images/wildling-cards/MilkwaterLarge.png";
import preemptive from "../../public/images/wildling-cards/PreemptiveLarge.png";
import rattleshirt from "../../public/images/wildling-cards/RattleshirtLarge.png";
import silence from "../../public/images/wildling-cards/SilenceLarge.png";
import skinChangerLarge from "../../public/images/wildling-cards/SkinchangerLarge.png";


const wildlingCardImages = new BetterMap([
    ["massing-on-the-milkwater", milkwater],
    ["a-king-beyond-the-wall", kingBeyond],
    ["mammoth-riders", mammoth],
    ["crow-killers", crowKillers],
    ["the-horde-descends", hordeDescends],
    ["skinchanger-scout", skinChangerLarge],
    ["rattleshirts-raiders", rattleshirt],
    ["silence-at-the-wall", silence],
    ["preemptive-raid", preemptive]
]);

export default wildlingCardImages;
