import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";

export default class SerDavosSeaworthHouseCardAbility extends HouseCardAbility {
    modifySwordIcons(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(houseCard, affectedHouseCard, house) ? 1 : 0;
    }

    modifyCombatStrength(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return this.doesTrigger(houseCard, affectedHouseCard, house) ? 1 : 0;
    }

    doesTrigger(houseCard: HouseCard, affectedHouseCard: HouseCard, house: House): boolean {
        if (houseCard != affectedHouseCard) {
            return false;
        }

        const houseCardWithFourStrength = house.houseCards.values.filter(hc => hc.combatStrength == 4);
        return houseCardWithFourStrength.length == 1 && houseCardWithFourStrength[0].state == HouseCardState.USED;
    }
}
