import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import QyburnAbilityGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/qyburn-ability-game-state/QyburnAbilityGameState";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";

export default class QyburnHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        beforeCombat.childGameState.setChildGameState(new QyburnAbilityGameState(beforeCombat.childGameState))
            .firstStart(house);
    }
}
