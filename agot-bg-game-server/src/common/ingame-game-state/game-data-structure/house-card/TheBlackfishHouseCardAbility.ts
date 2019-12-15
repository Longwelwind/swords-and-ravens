import HouseCardAbility from "./HouseCardAbility";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";

export default class TheBlackfishHouseCardAbility extends HouseCardAbility {

    doesPreventCasualties(_combat: CombatGameState, _house: House, _houseCard: HouseCard): boolean {
        return true;
    }
}
