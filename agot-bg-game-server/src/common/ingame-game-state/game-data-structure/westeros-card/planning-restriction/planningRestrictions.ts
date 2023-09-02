import BetterMap from "../../../../../utils/BetterMap";
import PlanningRestriction from "./PlanningRestriction";
import DefenseOrderType from "../../order-types/DefenseOrderType";
import SupportOrderType from "../../order-types/SupportOrderType";
import RaidOrderType from "../../order-types/RaidOrderType";
import ConsolidatePowerOrderType from "../../order-types/ConsolidatePowerOrderType";
import MarchOrderType from "../../order-types/MarchOrderType";
import DefenseMusterOrderType from "../../order-types/DefenseMusterOrderType";
import RaidSupportOrderType from "../../order-types/RaidSupportOrderType";

export const noMarchPlusOneOrder = new PlanningRestriction("no-march-plus-one-order", orderType => orderType instanceof MarchOrderType && orderType.attackModifier == 1);
export const noDefenseOrder = new PlanningRestriction("no-defense-order", orderType => orderType instanceof DefenseOrderType || orderType instanceof DefenseMusterOrderType);
export const noSupportOrder = new PlanningRestriction("no-support-order", orderType => orderType instanceof SupportOrderType || orderType instanceof RaidSupportOrderType);
export const noRaidOrder = new PlanningRestriction("no-raid-order", orderType => orderType instanceof RaidOrderType || orderType instanceof RaidSupportOrderType);
export const noConsolidatePowerOrder = new PlanningRestriction("no-consolidate-power-order", orderType => orderType instanceof ConsolidatePowerOrderType);
export const denseFog = new PlanningRestriction("dense-fog", () => false);

const planningRestrictions = new BetterMap<string, PlanningRestriction>([
    [noMarchPlusOneOrder.id, noMarchPlusOneOrder],
    [noDefenseOrder.id, noDefenseOrder],
    [noSupportOrder.id, noSupportOrder],
    [noRaidOrder.id, noRaidOrder],
    [noConsolidatePowerOrder.id, noConsolidatePowerOrder],
    [denseFog.id, denseFog],
]);

export default planningRestrictions;
