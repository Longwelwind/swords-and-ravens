import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard, {HouseCardState} from "./HouseCard";

export default class SerDavosSeaworthHouseCardAbility extends HouseCardAbility {
    modifySwordIcons(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return this.doesTrigger(_houseCard, _affectedHouseCard, _house) ? 1 : 0;
    }

    modifyHouseCardCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return this.doesTrigger(_houseCard, _affectedHouseCard, _house) ? 1 : 0;
    }

    doesTrigger(houseCard: HouseCard, affectedHouseCard: HouseCard, house: House): boolean {
        if (!house.houseCards.has("stannis-baratheon")) {
            // This should never happen as Stannis Baratheon will always be with Ser Davos
            // Seaworth. It could happen if a house is created with Davos but without Stannis.
            return false;
        }

        const stannisBaratheon = house.houseCards.get("stannis-baratheon");

        return houseCard == affectedHouseCard && stannisBaratheon.state == HouseCardState.USED;
    }
}
