import ResolveSingleConsolidatePowerGameState from "../../action-game-state/resolve-consolidate-power-game-state/resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import House from "../House";

export default abstract class LoanCardType {
    id: string;
    name: string;
    description: string;
    preventsAutomaticResolutionOfCpOrders: boolean;

    constructor(id: string, name: string, description: string, preventsAutomaticResolutionOfCpOrders = false) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.preventsAutomaticResolutionOfCpOrders = preventsAutomaticResolutionOfCpOrders;
    }

    abstract execute(resolveSingleConsolidate: ResolveSingleConsolidatePowerGameState, house: House): void;
}
