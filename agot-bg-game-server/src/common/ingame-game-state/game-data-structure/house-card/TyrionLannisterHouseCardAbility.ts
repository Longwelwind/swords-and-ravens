import HouseCardAbility from "./HouseCardAbility";
import CancelHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/CancelHouseCardAbilitiesGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import TyrionLannisterAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/tyrion-lannister-ability-game-state/TyrionLannisterAbilityGameState";

export default class TyrionLannisterHouseCardAbility extends HouseCardAbility {

    cancel(cancelResolutionState: CancelHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        cancelResolutionState.childGameState
            .setChildGameState(new TyrionLannisterAbilityGameState(cancelResolutionState.childGameState))
            .firstStart(house);
    }
}
