import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";

export default class DaenerysTargaryenBHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const enemy = afterCombat.combatGameState.getEnemy(house);
        const totalDifference = Math.abs(afterCombat.postCombatGameState.combatStats[0].total -
            afterCombat.postCombatGameState.combatStats[1].total);

        const powerTokensDiscarded = afterCombat.combatGameState.ingameGameState.changePowerTokens(enemy, -totalDifference);

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
