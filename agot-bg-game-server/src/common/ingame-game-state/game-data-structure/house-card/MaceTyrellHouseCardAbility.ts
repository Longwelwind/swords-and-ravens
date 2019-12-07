import HouseCardAbility from "./HouseCardAbility";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import MaceTyrellAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/mace-tyrell-ability-game-state/MaceTyrellAbilityGameState";

export default class MaceTyrellHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediately: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        immediately.childGameState.setChildGameState(new MaceTyrellAbilityGameState(immediately.childGameState))
            .firstStart(house);
    }
}
