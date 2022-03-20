import HouseCardAbility from "./HouseCardAbility";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";import HouseCard from "./HouseCard";
import TyrionLannisterAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/tyrion-lannister-ability-game-state/TyrionLannisterAbilityGameState";
import House from "../House";

export default class TyrionLannisterASoSHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        immediatelyResolutionState.childGameState
            .setChildGameState(new TyrionLannisterAbilityGameState(immediatelyResolutionState.childGameState))
            .firstStart(house);
    }
}
