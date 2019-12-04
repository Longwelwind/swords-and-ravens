import HouseCardAbility from "./HouseCardAbility";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import AeronDamphairAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/aeron-damphair-ability-game-state/AeronDamphairAbilityGameState";

export default class AeronDamphairHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        immediatelyResolutionState.childGameState.setChildGameState(new AeronDamphairAbilityGameState(immediatelyResolutionState.childGameState))
            .firstStart(house);
    }
}
