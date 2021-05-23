import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class DaenerysTargaryenBHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const enemy = afterCombat.combatGameState.getEnemy(house);
        const houseFinalCombatStrength = Math.max(afterCombat.combatGameState.getTotalCombatStrength(house), 0);
        const enemyFinalCombatStrength = Math.max(afterCombat.combatGameState.getTotalCombatStrength(enemy), 0);

        const difference = Math.abs(houseFinalCombatStrength-enemyFinalCombatStrength);

        const powerTokensDiscarded = afterCombat.combatGameState.ingameGameState.changePowerTokens(enemy, -difference);

        afterCombat.combatGameState.ingameGameState.log({
            type: "daenerys-targaryen-b-power-tokens-discarded",
            house: house.id,
            affectedHouse: enemy.id,
            powerTokensDiscarded: powerTokensDiscarded
        });

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }

    forcesValyrianSteelBladeDecision(_combat: CombatGameState, _valyrianSteelBladeHolder: House): boolean {
        return true;
    }
}
