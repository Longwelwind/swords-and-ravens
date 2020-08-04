import WildlingsAttackGameState from "../../westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";

export default abstract class WildlingCardType {
    id: string;
    name: string;
    wildlingVictoryLowestBidderDescription: string;
    wildlingVictoryEverybodyElseDescription: string;
    nightsWatchDescription: string;

    constructor(id: string, name: string, wildlingVictoryLowestBidderDescription: string, wildlingVictoryEverybodyElseDescription: string, nightsWatchDescription: string) {
        this.id = id;
        this.name = name;
        this.wildlingVictoryLowestBidderDescription = wildlingVictoryLowestBidderDescription;
        this.wildlingVictoryEverybodyElseDescription = wildlingVictoryEverybodyElseDescription;
        this.nightsWatchDescription = nightsWatchDescription;
    }

    abstract executeWildlingWon(wildlingsAttack: WildlingsAttackGameState): void;
    abstract executeNightsWatchWon(wildlingsAttack: WildlingsAttackGameState): void;

    lowestBidderChoiceCanBeSkipped(_wildlingsAttack: WildlingsAttackGameState): boolean {
        return false;
    }

    highestBidderChoiceCanBeSkipped(_wildlingsAttack: WildlingsAttackGameState): boolean {
        return false;
    }
}
