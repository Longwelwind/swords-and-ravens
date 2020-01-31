export default interface GameLog {
    time: Date;
    data: GameLogData;
}

export type GameLogData = TurnBegin | SupportDeclared | Attack | MarchResolved
    | WesterosCardExecuted | WesterosCardDrawn | CombatResult | WildlingCardRevealed | WildlingBidding
    | HighestBidderChosen | LowestBidderChosen | PlayerMustered | WinnerDeclared
    | RavenHolderWildlingCardPutBottom | RavenHolderWildlingCardPutTop | RaidDone | DarkWingsDarkWordsChoice
    | PutToTheSwordChoice | AThroneOfBladesChoice | WinterIsComing | WesterosPhaseBegan
    | CombatHouseCardChosen | CombatValyrianSwordUsed | ClashOfKingsBiddingDone | ClashOfKingsFinalOrdering
    | ActionPhaseBegan | PlanningPhaseBegan | WildlingStrengthTriggerWildlingAttack | MarchOrderRemoved
    | StarredConsolidatePowerForPowerTokens | ArmiesReconciled
    | TyrionLannisterHouseCardReplaced | TyrionLannisterChoiceMade
    | ArianneMartellPreventMovement | LorasTyrellAttackOrderMoved | TywinLannisterPowerTokensGained
    | RooseBoltonHouseCardsReturned | QueenOfThornsOrderRemoved | QueenOfThornsNoOrderAvailable
    | RenlyBaratheonNoFootmanAvailable | RenlyBaratheonNoKnightAvailable | RenlyBaratheonFootmanUpgradedToKnight
    | MaceTyrellNoFootmanAvailable | MaceTyrellCasualtiesPrevented | MaceTyrellFootmanKilled;

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
        garrison: number;
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

interface RavenHolderWildlingCardPutBottom {
    type: "raven-holder-wildling-card-put-bottom";
    ravenHolder: string;
}

interface RavenHolderWildlingCardPutTop {
    type: "raven-holder-wildling-card-put-top";
    ravenHolder: string;
}

interface RaidDone {
    type: "raid-done";
    raider: string;
    raidee: string | null;
    raiderRegion: string;
    raidedRegion: string | null;
    orderRaided: number | null;
}

interface DarkWingsDarkWordsChoice {
    type: "dark-wings-dark-words-choice";
    house: string;
    choice: number;
}

interface PutToTheSwordChoice {
    type: "put-to-the-sword-choice";
    house: string;
    choice: number;
}

interface AThroneOfBladesChoice {
    type: "a-throne-of-blades-choice";
    house: string;
    choice: number;
}

interface WinterIsComing {
    type: "winter-is-coming";
    drawnCardType: string;
}

interface WesterosPhaseBegan {
    type: "westeros-phase-began";
}

interface CombatHouseCardChosen {
    type: "combat-house-card-chosen";
    houseCards: [string, string][];
}

interface CombatValyrianSwordUsed {
    type: "combat-valyrian-sword-used";
    house: string;
}

interface ClashOfKingsBiddingDone {
    type: "clash-of-kings-bidding-done";
    trackerI: number;
    results: [number, string[]][];
}

interface ClashOfKingsFinalOrdering {
    type: "clash-of-kings-final-ordering";
    trackerI: number;
    finalOrder: string[];
}

interface ActionPhaseBegan {
    type: "action-phase-began";
}

interface PlanningPhaseBegan {
    type: "planning-phase-began";
}

interface WildlingStrengthTriggerWildlingAttack {
    type: "wildling-strength-trigger-wildling-attack";
    wildlingStrength: number;
}

interface MarchOrderRemoved {
    type: "march-order-removed";
    house: string;
    region: string;
}

interface StarredConsolidatePowerForPowerTokens {
    type: "starred-consolidate-power-for-power-tokens";
    house: string;
    region: string;
    powerTokenCount: number;
}

interface ArmiesReconciled {
    type: "armies-reconciled";
    house: string;
    armies: [string, string[]][];
}

interface TyrionLannisterChoiceMade {
    type: "tyrion-lannister-choice-made";
    house: string;
    affectedHouse: string;
    chooseToReplace: boolean;
}

interface TyrionLannisterHouseCardReplaced {
    type: "tyrion-lannister-house-card-replaced";
    house: string;
    affectedHouse: string;
    oldHouseCard: string;
    newHouseCard: string | null;
}

interface ArianneMartellPreventMovement {
    type: "arianne-martell-prevent-movement";
    house: string;
    enemyHouse: string;
}

interface RooseBoltonHouseCardsReturned {
    type: "roose-bolton-house-cards-returned";
    house: string;
    houseCards: string[];
}

interface LorasTyrellAttackOrderMoved {
    type: "loras-tyrell-attack-order-moved";
    house: string;
    order: number;
    region: string;
}

interface QueenOfThornsNoOrderAvailable {
    type: "queen-of-thorns-no-order-available";
    house: string;
    affectedHouse: string;
}

interface QueenOfThornsOrderRemoved {
    type: "queen-of-thorns-order-removed";
    house: string;
    affectedHouse: string;
    orderRemoved: number;
    region: string;
}

interface TywinLannisterPowerTokensGained {
    type: "tywin-lannister-power-tokens-gained";
    house: string;
    powerTokensGained: number;
}

interface RenlyBaratheonNoFootmanAvailable {
    type: "renly-baratheon-no-footman-available";
    house: string;
}

interface RenlyBaratheonNoKnightAvailable {
    type: "renly-baratheon-no-knight-available";
    house: string;
}

interface RenlyBaratheonFootmanUpgradedToKnight {
    type: "renly-baratheon-footman-upgraded-to-knight";
    house: string;
    region: string;
}

interface MaceTyrellNoFootmanAvailable {
    type: "mace-tyrell-no-footman-available";
    house: string;
}

interface MaceTyrellCasualtiesPrevented {
    type: "mace-tyrell-casualties-prevented";
    house: string;
}

interface MaceTyrellFootmanKilled {
    type: "mace-tyrell-footman-killed";
    house: string;
    region: string;
}
