import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import House from "../House";

export default class MelisandreOfAsshaiHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        const enemy = immediatelyResolutionState.combatGameState.getEnemy(house);
        const enemyHouseCardStrength = immediatelyResolutionState.combatGameState.houseCombatDatas.get(enemy).houseCard?.combatStrength ?? 0;
        const gainedPowerTokens = immediatelyResolutionState.combatGameState.ingameGameState.changePowerTokens(house, enemyHouseCardStrength);
        immediatelyResolutionState.combatGameState.ingameGameState.log({
            type: "melisandre-of-asshai-power-tokens-gained",
            house: house.id,
            powerTokens: gainedPowerTokens
        });
        immediatelyResolutionState.childGameState.onHouseCardResolutionFinish(house);
    }
}
