import HouseCardAbility from "./HouseCardAbility";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import QueenOfThornsAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/queen-of-thorns-ability-game-state/QueenOfThornsAbilityGameState";

export default class QueenOfThornsHouseCardAbility extends HouseCardAbility {

    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, houseCard: HouseCard): void {
        immediatelyResolutionState.childGameState
            .setChildGameState(new QueenOfThornsAbilityGameState(immediatelyResolutionState.childGameState))
            .firstStart(house, houseCard.id == "queen-of-thorns-asos");
    }
}
