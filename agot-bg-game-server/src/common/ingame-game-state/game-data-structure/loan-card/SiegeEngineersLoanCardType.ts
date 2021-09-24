import ExecuteLoanGameState from "../../action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/ExecuteLoanGameState";
import ResolveSingleConsolidatePowerGameState from "../../action-game-state/resolve-consolidate-power-game-state/resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import House from "../House";
import LoanCardType from "./LoanCardType";

export default class SiegeEngineersLoanCardType extends LoanCardType {
    execute(resolveSingleConsolidate: ResolveSingleConsolidatePowerGameState, house: House): void {
        resolveSingleConsolidate.parentGameState.setChildGameState(new ExecuteLoanGameState(resolveSingleConsolidate.parentGameState)).firstStart(house, this);
    }
}