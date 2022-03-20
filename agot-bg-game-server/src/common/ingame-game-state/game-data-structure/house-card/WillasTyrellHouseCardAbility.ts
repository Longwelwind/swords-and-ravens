import HouseCardAbility from "./HouseCardAbility";
import House from "../House";
import HouseCard from "./HouseCard";
import ImmediatelyHouseCardAbilitiesResolutionGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";

export default class WillasTyrellHouseCardAbility extends HouseCardAbility {
    immediatelyResolution(immediately: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, houseCard: HouseCard): void {
        if (immediately.combatGameState.defender == house) {
            houseCard.originalCombatStrength = houseCard.combatStrength;
            houseCard.combatStrength = 3;
            immediately.entireGame.broadcastToClients({
                type: "manipulate-combat-house-card",
                manipulatedHouseCards: [[houseCard.id, houseCard.serializeToClient()]]
            });
        }

        immediately.childGameState.onHouseCardResolutionFinish(house);
    }
}
