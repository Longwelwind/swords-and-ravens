import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";

export default class RamsayBoltonHouseCardAbility extends HouseCardAbility {
    modifySwordIcons(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return this.doesTrigger(_houseCard, _affectedHouseCard, _house) ? 3 : 0;
    }

    modifyCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return this.doesTrigger(_houseCard, _affectedHouseCard, _house) ? 1 : 0;
    }

    doesTrigger(houseCard: HouseCard, affectedHouseCard: HouseCard, house: House): boolean {
        if (!house.houseCards.has("reek")) {
            // This should never happen as Reek will always be with Ramsay
            // It could happen if a house is created with Ramsay but without Reek.
            return false;
        }

        const reek = house.houseCards.get("reek");
        return houseCard == affectedHouseCard && reek.state == HouseCardState.AVAILABLE;
    }
}
