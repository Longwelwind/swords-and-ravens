import HouseCardAbility from "./HouseCardAbility";
import HouseCard, { HouseCardState } from "./HouseCard";
import House from "../House";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class SerIlynPaybeAdwdHouseCardAbility extends HouseCardAbility {

    modifyCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        var discardedCards = 0;

        _house.houseCards.forEach((card, _) =>{
        if (card.state == HouseCardState.USED) {
            discardedCards += 1;
            }
        });

        return _houseCard == _affectedHouseCard ? discardedCards : 0;
    }
}
