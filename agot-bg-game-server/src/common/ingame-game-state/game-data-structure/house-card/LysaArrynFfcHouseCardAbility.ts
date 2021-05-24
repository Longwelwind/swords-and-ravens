import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";

export default class LysaArrynFfcHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const enemy = afterCombat.combatGameState.getEnemy(house);
        if (afterCombat.combatGameState.ingameGameState.getControllerOfHouse(enemy).house.powerTokens > house.powerTokens) {
            const gainedPowerTokens = afterCombat.combatGameState.ingameGameState.changePowerTokens(house, 3);
            afterCombat.combatGameState.ingameGameState.log({
                type: "lysa-arryn-ffc-power-tokens-gained",
                house: house.id,
                powerTokens: gainedPowerTokens
            });
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}