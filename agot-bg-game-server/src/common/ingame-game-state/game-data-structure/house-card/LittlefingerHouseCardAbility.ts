import HouseCardAbility from "./HouseCardAbility";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import HouseCard from "./HouseCard";
import House from "../House";

export default class LittlefingerHouseCardAbility extends HouseCardAbility {
    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        const capitalOfHouse = afterCombat.combatGameState.world.regions.values.filter(r => r.superControlPowerToken == house);
        if (capitalOfHouse.length == 1 && capitalOfHouse[0].getController() == house) {
            const enemy = afterCombat.combatGameState.getEnemy(house);
            const enemyHouseCard = afterCombat.combatGameState.houseCombatDatas.get(enemy).houseCard;
            const gainedPowerTokens = afterCombat.combatGameState.ingameGameState.changePowerTokens(house, enemyHouseCard ? enemyHouseCard.combatStrength * 2 : 0);
            afterCombat.combatGameState.ingameGameState.log({
                type: "littlefinger-power-tokens-gained",
                house: house.id,
                powerTokens: gainedPowerTokens
            });
        }

        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }
}