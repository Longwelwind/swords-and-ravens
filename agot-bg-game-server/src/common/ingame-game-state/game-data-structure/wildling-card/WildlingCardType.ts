import WildlingsAttackGameState from "../../westeros-game-state/wildling-attack-game-state/WildlingAttackGameState";

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

    abstract executeWildlingWon(wildlingAttack: WildlingsAttackGameState): void;
    abstract executeNightsWatchWon(wildlingAttack: WildlingsAttackGameState): void;
}
