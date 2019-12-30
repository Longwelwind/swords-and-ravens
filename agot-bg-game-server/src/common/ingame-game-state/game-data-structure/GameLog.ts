export default interface GameLog {
    time: Date;
    data: GameLogData;
}

export type GameLogData = TurnBegin | SupportDeclared | HouseCardChosen | Attack | MarchResolved
    | WesterosCardExecuted | WesterosCardDrawn | CombatResult | WildlingCardRevealed | WildlingBidding
    | HighestBidderChosen | LowestBidderChosen | PlayerMustered | WinnerDeclared;

interface TurnBegin {
    type: "turn-begin";
    turn: number;
}

interface SupportDeclared {
    type: "support-declared";
    supporter: string;
    supported: string | null;
}

interface HouseCardChosen {
    type: "house-card-chosen";
    houseCards: [string, string][];
}

interface Attack {
    type: "attack";
    attacker: string;
    attacked: string | null;
    attackingRegion: string;
    attackedRegion: string;
    units: string[];
}

interface MarchResolved {
    type: "march-resolved";
    house: string;
    startingRegion: string;
    moves: [string, string[]][];
}

interface WesterosCardExecuted {
    type: "westeros-card-executed";
    westerosCardType: string;
    cardI: number;
}

interface WesterosCardDrawn {
    type: "westeros-cards-drawn";
    addedWildlingStrength: number;
    westerosCardTypes: string[];
}

interface CombatResult {
    type: "combat-result";
    winner: string;
    stats: {
        house: string;
        region: string;
        army: number;
        orderBonus: number;
        support: number;
        houseCard: string | null;
        houseCardStrength: number;
        valyrianSteelBlade: number;
        total: number;
    }[];
}

interface WildlingCardRevealed {
    type: "wildling-card-revealed";
    wildlingCard: number;
}

interface WildlingBidding {
    type: "wildling-bidding";
    results: [number, string[]][];
    nightsWatchVictory: boolean;
}

interface HighestBidderChosen {
    type: "highest-bidder-chosen";
    highestBidder: string;
}

interface LowestBidderChosen {
    type: "lowest-bidder-chosen";
    lowestBidder: string;
}

interface PlayerMustered {
    type: "player-mustered";
    house: string;
    musterings: [string, {from: string | null; to: string; region: string}[]][];
}

interface WinnerDeclared {
    type: "winner-declared";
    winner: string;
}
