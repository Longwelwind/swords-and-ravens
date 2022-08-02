import HouseCardAbility from "./HouseCardAbility";
import HouseCard from "./HouseCard";
import House from "../House";
import PostCombatGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";

export default class ArianneMartellHouseCardAbility extends HouseCardAbility {
    doesPreventAttackingArmyFromMoving(postCombat: PostCombatGameState, house: House, houseCard: HouseCard): boolean {
        if (postCombat.loser == house && postCombat.defender == house) {
            if (houseCard.id == "arianne-martell-asos") {
                return Math.abs(postCombat.combat.stats[0].total - postCombat.combat.stats[1].total) <= 2;
            }

            return true;
        }

        return false;
    }

    forcesRetreatOfVictoriousDefender(postCombat: PostCombatGameState, house: House, houseCard: HouseCard): boolean {
        return houseCard.id == "arianne-martell-asos" &&
            postCombat.attacker == house &&
            postCombat.loser == house &&
            Math.abs(postCombat.combat.stats[0].total - postCombat.combat.stats[1].total) <= 2;
    }
}
