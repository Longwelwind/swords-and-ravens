import ResolveSingleConsolidatePowerGameState from "../../action-game-state/resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import House from "../House";
import LoanCardType from "./LoanCardType";

export default class TheFacelessMenLoanCardType extends LoanCardType {
    execute(resolveSingleConsolidate: ResolveSingleConsolidatePowerGameState, _house: House): void {
        resolveSingleConsolidate.onResolveSingleConsolidatePowerFinish();
    }
}