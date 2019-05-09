import marchMinusOneImage from "../../public/images/orders/MarchM.png";
import marchImage from "../../public/images/orders/March.png";
import marchPlusOneImage from "../../public/images/orders/MarchP.png";
import defendImage from "../../public/images/orders/Defend.png";
import defendPlusOneImage from "../../public/images/orders/DefendP.png";
import supportImage from "../../public/images/orders/Support.png";
import supportPlusOneImage from "../../public/images/orders/SupportP.png";
import consolidateImage from "../../public/images/orders/Consolidate.png";
import consolidatePImage from "../../public/images/orders/ConsolidateP.png";
import raidImage from "../../public/images/orders/Raid.png";
import raidPImage from "../../public/images/orders/RaidP.png";
import BetterMap from "../utils/BetterMap";
import {
    consolidatePower,
    defensePlusOne, defensePlusTwo,
    march,
    marchMinusOne,
    marchPlusOne, raid, specialConsolidatePower, specialRaid, support, supportPlusOne
} from "../common/ingame-game-state/game-data-structure/order-types/orderTypes";

const orderImages = new BetterMap([
    [marchMinusOne.id, marchMinusOneImage],
    [march.id, marchImage],
    [marchPlusOne.id, marchPlusOneImage],
    [defensePlusOne.id, defendImage],
    [defensePlusTwo.id, defendPlusOneImage],
    [support.id, supportImage],
    [supportPlusOne.id, supportPlusOneImage],
    [consolidatePower.id, consolidateImage],
    [specialConsolidatePower.id, consolidatePImage],
    [raid.id, raidImage],
    [specialRaid.id, raidPImage]
]);

export default orderImages;
