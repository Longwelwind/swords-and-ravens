import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import House from "../House";
import DoranMartellAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/doran-martell-ability-game-state/DoranMartellAbilityGameState";

export default class DoranMartellHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        immediatelyResolutionState.childGameState
            .setChildGameState(new DoranMartellAbilityGameState(immediatelyResolutionState.childGameState))
            .firstStart(house);
    }
}
