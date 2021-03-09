import marchMinusOneImage from "../../public/images/orders/MarchM.png";
import marchImage from "../../public/images/orders/March.png";
import marchPlusOneImage from "../../public/images/orders/MarchP.png";
import defendImage from "../../public/images/orders/Defend.png";
import defendPlusOneImage from "../../public/images/orders/DefendP.png";
import supportImage from "../../public/images/orders/Support.png";
import supportPlusOneImage from "../../public/images/orders/SupportP.png";
import consolidateImage from "../../public/images/orders/Consolidate.png";
import consolidatePImage from "../../public/images/orders/ConsolidateP.png";
import marchPlusThreeImage from "../../public/images/orders/DefenceP3Vassal.png";
import defencePusOneMusterImage from "../../public/images/orders/DefenceMusterVassal.png";
import supportPlusOneRaidImage from "../../public/images/orders/SupportorRaidVassal.png";
import raidImage from "../../public/images/orders/Raid.png";
import raidPImage from "../../public/images/orders/RaidP.png";
import seaMarchMinusOneImage from "../../public/images/orders/SeaMarchM.png"
import seaSupportImage from "../../public/images/orders/SeaSupport.png"
import seaIronBankImage from "../../public/images/orders/SeaIronBank.png"

import BetterMap from "../utils/BetterMap";
import {
    raid, specialRaid,
    marchMinusOne, march, marchPlusOne,
    support, supportPlusOne,
    defensePlusOne, defensePlusTwo,
    consolidatePower, specialConsolidatePower,
    seaMarchMinusOne, seaSupport, seaIronBank,
    defensePlusThree, raidSupportPlusOne, defensePlusOneMuster
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
    [specialRaid.id, raidPImage],
    [defensePlusThree.id, marchPlusThreeImage],
    [raidSupportPlusOne.id, supportPlusOneRaidImage],
    [defensePlusOneMuster.id, defencePusOneMusterImage],
    [seaMarchMinusOne.id, seaMarchMinusOneImage],
    [seaSupport.id, seaSupportImage],
    [seaIronBank.id, seaIronBankImage]
]);

export default orderImages;
