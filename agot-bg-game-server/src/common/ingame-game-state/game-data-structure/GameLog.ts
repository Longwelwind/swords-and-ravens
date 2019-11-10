export default interface GameLog {
    time: Date;
    data: GameLogData;
}

export type GameLogData = TurnBegin | SupportDeclared | HouseCardChosen | Attack | MarchResolved
    | WesterosCardExecuted | WesterosCardDrawn | CombatResult;

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
