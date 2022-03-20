import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import House from "../House";
import _ from "lodash";

export default class DoranMartellASoSHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        const enemy = immediatelyResolutionState.combatGameState.getEnemy(house);
        const fiefdoms = _.without(immediatelyResolutionState.game.fiefdomsTrack, enemy);
        fiefdoms.push(enemy);
        immediatelyResolutionState.combatGameState.ingameGameState.setInfluenceTrack(1, fiefdoms);

        immediatelyResolutionState.combatGameState.ingameGameState.log({
            type: "doran-martell-asos-used",
            house: house.id,
            affectedHouse: enemy.id
        });

        immediatelyResolutionState.childGameState.onHouseCardResolutionFinish(house);
    }
}
