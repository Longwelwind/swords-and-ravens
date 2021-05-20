import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";

export default class RamsayBoltonHouseCardAbility extends HouseCardAbility {
    modifySwordIcons(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(houseCard, affectedHouseCard, house) ? 3 : 0;
    }

    modifyCombatStrength(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(houseCard, affectedHouseCard, house) ? 1 : 0;
    }

    doesTrigger(houseCard: HouseCard, affectedHouseCard: HouseCard, house: House): boolean {
        if (houseCard != affectedHouseCard) {
            return false;
        }

        const houseCardWithZeroStrength = house.houseCards.values.filter(hc => hc.combatStrength == 0);
        return houseCardWithZeroStrength.length == 1 && houseCardWithZeroStrength[0].state == HouseCardState.AVAILABLE;
    }
}
