import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default abstract class WesterosCardType {
    id: string;
    name: string;
    description: string;
    wildlingStrength: number;
    shortDescription: string;
    loyaltyTokenRegions: string[];
    choosableLoyaltyTokenRegions: string[];

    constructor(id: string, name: string, description: string, shortDescription: string, wildlingStrength = 0,
        loyaltyTokenRegions: string[] = [], choosableLoyaltyTokenRegions: string[] = []) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.shortDescription = shortDescription;
        this.wildlingStrength = wildlingStrength;
        this.loyaltyTokenRegions = loyaltyTokenRegions;
        this.choosableLoyaltyTokenRegions = choosableLoyaltyTokenRegions;
    }

    abstract execute(westerosGameState: WesterosGameState): void;

    placeLoyaltyTokens(westerosGameState: WesterosGameState): void {
        if (this.loyaltyTokenRegions.length == 0) {
            return;
        }

        const regions = this.loyaltyTokenRegions.map(rid => westerosGameState.world.regions.get(rid));
        regions.forEach(r => westerosGameState.placeLoyaltyToken(r));
    }

    executeImmediately(_westerosGameState: WesterosGameState, _currentDeckI: number): void {
        return;
    }
}
