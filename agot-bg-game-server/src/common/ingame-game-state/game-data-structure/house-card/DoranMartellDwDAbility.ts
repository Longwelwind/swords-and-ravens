import HouseCardAbility from "./HouseCardAbility";
import HouseCard, {HouseCardState} from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class DoranMartellDwDAbility extends HouseCardAbility {
    modifySwordIcons(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return houseCard == affectedHouseCard ? house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE && hc != houseCard).length : 0
    }

    modifyTowerIcons(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        return houseCard == affectedHouseCard ? house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE && hc != houseCard).length : 0
    }

    modifyCombatStrength(_combat: CombatGameState, house: House, houseCard: HouseCard, affectedHouseCard: HouseCard, _baseValue: number): number {
        return houseCard == affectedHouseCard ? Math.max(-houseCard.combatStrength, -house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE && hc != houseCard).length) : 0
    }
}
