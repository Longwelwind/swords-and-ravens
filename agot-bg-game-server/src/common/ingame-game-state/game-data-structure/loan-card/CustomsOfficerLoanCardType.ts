import ResolveSingleConsolidatePowerGameState from "../../action-game-state/resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import House from "../House";
import LoanCardType from "./LoanCardType";

export default class CustomsOfficerLoanCardType extends LoanCardType {
    execute(resolveSingleConsolidate: ResolveSingleConsolidatePowerGameState, house: House): void {
        const gained = resolveSingleConsolidate.ingame.changePowerTokens(house, 10);
        resolveSingleConsolidate.ingame.log({
            type: "customs-officer-power-tokens-gained",
            house: house.id,
            gained: gained
        });
        resolveSingleConsolidate.onResolveSingleConsolidatePowerFinish();
    }
}