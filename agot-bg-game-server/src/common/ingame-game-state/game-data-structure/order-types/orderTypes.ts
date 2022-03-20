import OrderType from "./OrderType";
import MarchOrderType from "./MarchOrderType";
import SupportOrderType from "./SupportOrderType";
import ConsolidatePowerOrderType from "./ConsolidatePowerOrderType";
import RaidOrderType from "./RaidOrderType";
import DefenseOrderType from "./DefenseOrderType";
import BetterMap from "../../../../utils/BetterMap";
import RaidSupportOrderType from "./RaidSupportOrderType";
import DefenseMusterOrderType from "./DefenseMusterOrderType";
import RegionKind from "../RegionKind";
import IronBankOrderType from "./IronBankOrderType";

export const marchMinusOne = new MarchOrderType("march-minus-one", "March -1", false, -1);
export const march = new MarchOrderType("march", "March", false, 0);
export const marchPlusOne = new MarchOrderType("march-plus-one", "March +1", true, 1);

export const defensePlusOne = new DefenseOrderType("defense-plus-one", "Defense +1", false, 1);
export const defensePlusTwo = new DefenseOrderType("defense-plus-two", "Defense +2", true, 2);
export const defensePlusThree = new DefenseOrderType("defense-plus-three", "Defense +3", false, 3);

export const support = new SupportOrderType("support", "Support", false);
export const supportPlusOne = new SupportOrderType("support-plus-one", "Support +1", true, 1);

export const consolidatePower = new ConsolidatePowerOrderType("consolidate-power", "Consolidate Power", false);
export const specialConsolidatePower = new ConsolidatePowerOrderType("special-consolidate-power", "Special Consolidate Power", true);

export const raid = new RaidOrderType("raid", "Raid", false);
export const specialRaid = new RaidOrderType("special-raid", "Special Raid", true);

export const raidSupportPlusOne = new RaidSupportOrderType("raid-support-plus-one", "Raid/Support +1", false, 1);
export const defensePlusOneMuster = new DefenseMusterOrderType();

export const seaMarchMinusOne = new MarchOrderType("sea-march", "Sea March -1", false, -1, RegionKind.SEA);
export const seaSupport = new SupportOrderType("sea-support", "Sea Support", false, 0, RegionKind.SEA);
export const seaIronBank = new IronBankOrderType();

const orderTypes = new BetterMap<string, OrderType>([
    [marchMinusOne.id, marchMinusOne],
    [march.id, march],
    [defensePlusOne.id, defensePlusOne],
    [defensePlusTwo.id, defensePlusTwo],
    [defensePlusThree.id, defensePlusThree],
    [marchPlusOne.id, marchPlusOne],
    [support.id, support],
    [supportPlusOne.id, supportPlusOne],
    [consolidatePower.id, consolidatePower],
    [specialConsolidatePower.id, specialConsolidatePower],
    [raid.id, raid],
    [specialRaid.id, specialRaid],
    [raidSupportPlusOne.id, raidSupportPlusOne],
    [defensePlusOneMuster.id, defensePlusOneMuster],
    [seaMarchMinusOne.id, seaMarchMinusOne],
    [seaSupport.id, seaSupport],
    [seaIronBank.id, seaIronBank]
]);

export default orderTypes;
