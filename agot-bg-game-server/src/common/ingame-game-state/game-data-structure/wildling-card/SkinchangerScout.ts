import WildlingCardType from "./WildlingCardType";
import WildlingAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";
import House from "../House";

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

        wildlingAttack.ingame.log({
            type: "skinchanger-scout-nights-watch-victory",
            house: wildlingAttack.highestBidder.id,
            powerToken: amount
        });

        wildlingAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingAttack: WildlingAttackGameState): void {
        const lowestBidder = wildlingAttack.lowestBidder;
        const powerTokensToLose = [wildlingAttack.lowestBidder]
            .concat(wildlingAttack.participatingHouses.filter(h => h != lowestBidder))
            .map((h, i) => [h, i == 0 ? -h.powerTokens : -2] as [House, number]);

        powerTokensToLose.forEach(([house, powerTokens]) => {
            house.changePowerTokens(powerTokens);

            wildlingAttack.entireGame.broadcastToClients({
                type: "change-power-token",
                houseId: house.id,
                powerTokenCount: house.powerTokens
            });
        });

        wildlingAttack.ingame.log({
            type: "skinchanger-scout-wildling-victory",
            house: wildlingAttack.lowestBidder.id,
            powerTokensLost: powerTokensToLose.map(([house, amount]) => [house.id, amount])
        });

        wildlingAttack.onWildlingCardExecuteEnd();
    }
}
