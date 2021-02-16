import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import AeronDamphairDwDAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/aeron-damphair-dwd-ability-game-state/AeronDamphairDwDAbilityGameState";

export default class AeronDamphairDwDHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        beforeCombat.childGameState.setChildGameState(new AeronDamphairDwDAbilityGameState(beforeCombat.childGameState))
            .firstStart(house);
    }
}
