import HouseCardAbility from "./HouseCardAbility";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import HouseCard from "./HouseCard";
import House from "../House";
import AeronDamphairDwDAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";

export default class AeronDamphairDwDHouseCardAbility extends HouseCardAbility {    
    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        immediatelyResolutionState.childGameState.setChildGameState(new AeronDamphairDwDAbilityGameState(immediatelyResolutionState.childGameState))
            .firstStart(house);
    }
}
