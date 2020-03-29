import OrderType from "./OrderType";
import MarchOrderType from "./MarchOrderType";
import SupportOrderType from "./SupportOrderType";
import ConsolidatePowerOrderType from "./ConsolidatePowerOrderType";
import RaidOrderType from "./RaidOrderType";
import DefenseOrderType from "./DefenseOrderType";
import BetterMap from "../../../../utils/BetterMap";
import RaidSupportOrderType from "./RaidSupportOrderType";
import DefenseMusterOrderType from "./DefenseMusterOrderType";

export const marchMinusOne = new MarchOrderType("march-minus-one", "March -1", false, -1);
export const march = new MarchOrderType("march", "March", false, 0);
export const marchPlusOne = new MarchOrderType("march-plus-one", "March +1", true, 1);

export const defensePlusOne = new DefenseOrderType("defensePlusOne", "Defense +1", false, 1);
export const defensePlusTwo = new DefenseOrderType("defense-plus-one", "Defense +2", true, 2);
export const defensePlusThree = new DefenseOrderType("defense-plus-three", "Defense +3", false, 3);

export const support = new SupportOrderType("support", "Support", false);
export const supportPlusOne = new SupportOrderType("support-plus-one", "Support +1", true, 1);

export const consolidatePower = new ConsolidatePowerOrderType("consolidate-power", "Consolidate Power", false);
export const specialConsolidatePower = new ConsolidatePowerOrderType("special-consolidate-power", "Special Consolidate Power", true);

export const raid = new RaidOrderType("raid", "Raid", false);
export const specialRaid = new RaidOrderType("special-raid", "Special Raid", true);

export const raidSupportPlusOne = new RaidSupportOrderType("raid-support-plus-one", "Raid/Support +1", false);
export const defensePlusOneMuster = new DefenseMusterOrderType("defense-plus-one-muster", "Defense +1/Muster", false);

const orderTypes = new BetterMap<string, OrderType>([
    [marchMinusOne.id, marchMinusOne],
    [march.id, march],
    [defensePlusOne.id, defensePlusOne],
    [defensePlusTwo.id, defensePlusTwo],
    [marchPlusOne.id, marchPlusOne],
    [support.id, support],
    [supportPlusOne.id, supportPlusOne],
    [consolidatePower.id, consolidatePower],
    [specialConsolidatePower.id, specialConsolidatePower],
    [raid.id, raid],
    [specialRaid.id, specialRaid],
    [defensePlusThree.id, defensePlusThree],
]);

export default orderTypes;
