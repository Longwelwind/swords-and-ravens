import HouseCardAbility from "./HouseCardAbility";
import PostCombatGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";
import HouseCard from "./HouseCard";
import House from "../House";

export default class RobbStarkHouseCardAbility extends HouseCardAbility {
    overrideRetreatLocationChooser(postCombat: PostCombatGameState, house: House, _houseCard: HouseCard, retreater: House): House | null {
        return retreater == postCombat.combat.getEnemy(house) ? house : null;
    }
}
