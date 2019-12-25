import WildlingCardType from "./WildlingCardType";
import WildlingAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";

export default class SkinchangerScout extends WildlingCardType {
    executeNightsWatchWon(wildlingAttack: WildlingAttackGameState): void {
        if (wildlingAttack.biddingResults == null) {
            throw new Error();
        }

        const amount = wildlingAttack.biddingResults[0][0];
        const house = wildlingAttack.highestBidder;

        house.changePowerTokens(amount);

        wildlingAttack.entireGame.broadcastToClients({
            type: "change-power-token",
            houseId: house.id,
            powerTokenCount: house.powerTokens
        });

        wildlingAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingAttack: WildlingAttackGameState): void {
        const lowestBidder = wildlingAttack.lowestBidder;
        [wildlingAttack.lowestBidder].concat(wildlingAttack.participatingHouses.filter(h => h != lowestBidder)).map((h, i) => {
            const amount = i == 0 ? -h.powerTokens : -2;

            h.changePowerTokens(amount);

            wildlingAttack.entireGame.broadcastToClients({
                type: "change-power-token",
                houseId: h.id,
                powerTokenCount: h.powerTokens
            });
        });

        wildlingAttack.onWildlingCardExecuteEnd();
    }
}
