import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import BeforeCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import StannisBaratheonASoSAbilityGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/stannis-baratheon-asos-ability-game-state/StannisBaratheonASoSAbilityGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class StannisBaratheonASoSHouseCardAbility extends HouseCardAbility {
    beforeCombatResolution(beforeCombat: BeforeCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const enemy = beforeCombat.combatGameState.getEnemy(house);
        if (beforeCombat.combatGameState.ingameGameState.game.ironThroneHolder == enemy) {
            beforeCombat.childGameState.setChildGameState(new StannisBaratheonASoSAbilityGameState(beforeCombat.childGameState)).firstStart(house);
            return;
        }

        beforeCombat.childGameState.onHouseCardResolutionFinish(house);
    }

    modifySwordIcons(combat: CombatGameState, _house: House, houseCard: HouseCard, affectedHouseCard: HouseCard): number {
        const houseCardModifier = combat.houseCardModifiers.tryGet(this.id, null);
        return houseCardModifier && houseCard == affectedHouseCard ? houseCardModifier.swordIcons : 0;
    }
}
