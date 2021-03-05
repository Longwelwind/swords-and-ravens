import WildlingCardType from "./WildlingCardType";
import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import House from "../House";

export default class SkinchangerScout extends WildlingCardType {
    executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void {
        if (wildlingsAttack.biddingResults == null) {
            throw new Error();
        }

        const amount = wildlingsAttack.biddingResults[0][0];
        const house = wildlingsAttack.highestBidder;

        wildlingsAttack.ingame.changePowerTokens(house, amount);

        wildlingsAttack.ingame.log({
            type: "skinchanger-scout-nights-watch-victory",
            house: wildlingsAttack.highestBidder.id,
            powerToken: amount
        });

        wildlingsAttack.onWildlingCardExecuteEnd();
    }

    executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void {
        const lowestBidder = wildlingsAttack.lowestBidder;
        const powerTokensToLose = [wildlingsAttack.lowestBidder]
            .concat(wildlingsAttack.participatingHouses.filter(h => h != lowestBidder))
            .map((h, i) => [h, i == 0 ? -h.powerTokens : -2] as [House, number]);

        powerTokensToLose.forEach(([house, powerTokens]) => {
            wildlingsAttack.ingame.changePowerTokens(house, powerTokens);
        });

        wildlingsAttack.ingame.log({
            type: "skinchanger-scout-wildling-victory",
            house: wildlingsAttack.lowestBidder.id,
            powerTokensLost: powerTokensToLose.map(([house, amount]) => [house.id, amount])
        });

        wildlingsAttack.onWildlingCardExecuteEnd();
    }

    lowestBidderChoiceCanBeSkipped(wildlingsAttack: WildlingsAttackGameState): boolean {
        return wildlingsAttack.lowestBidders.every(h => h.powerTokens <= 2);
    }
}
