import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterCombatHouseCardAbilitiesGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";

export default class CerseiLannisterASoSHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const enemy = afterCombat.combatGameState.getEnemy(house);

        const powerTokensDiscarded = afterCombat.combatGameState.ingameGameState.changePowerTokens(enemy, -2);

        afterCombat.combatGameState.ingameGameState.log({
            type: "cersei-lannister-asos-power-tokens-discarded",
            house: house.id,
            affectedHouse: enemy.id,
            powerTokensDiscarded: Math.abs(powerTokensDiscarded)
        });

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}
