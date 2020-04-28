export default interface GameLog {
    time: Date;
    data: GameLogData;
}

export type GameLogData = TurnBegin | SupportDeclared | SupportRefused | Attack | MarchResolved
    | WesterosCardExecuted | WesterosCardDrawn | CombatResult | WildlingCardRevealed | WildlingBidding
    | HighestBidderChosen | LowestBidderChosen | PlayerMustered | WinnerDeclared
    | RavenHolderWildlingCardPutBottom | RavenHolderWildlingCardPutTop | RavenHolderReplaceOrder | RavenNotUsed | RaidDone | DarkWingsDarkWordsChoice
    | PutToTheSwordChoice | AThroneOfBladesChoice | WinterIsComing | WesterosPhaseBegan
    | CombatHouseCardChosen | CombatValyrianSwordUsed | ClashOfKingsBiddingDone | ClashOfKingsFinalOrdering
    | ActionPhaseBegan | ActionPhaseResolveRaidBegan | ActionPhaseResolveMarchBegan | ActionPhaseResolveConsolidatePowerBegan | PlanningPhaseBegan | WildlingStrengthTriggerWildlingsAttack | MarchOrderRemoved
    | ConsolidatePowerOrderResolved | ArmiesReconciled | EnemyPortTaken | ShipsDestroyedByEmptyCastle
    | HouseCardAbilityNotUsed | PatchfaceUsed | DoranUsed
    | TyrionLannisterHouseCardReplaced | TyrionLannisterChoiceMade
    | ArianneMartellPreventMovement | LorasTyrellAttackOrderMoved | TywinLannisterPowerTokensGained
    | RooseBoltonHouseCardsReturned | QueenOfThornsOrderRemoved | QueenOfThornsNoOrderAvailable
    | RenlyBaratheonNoFootmanAvailable | RenlyBaratheonNoKnightAvailable | RenlyBaratheonFootmanUpgradedToKnight
    | MaceTyrellNoFootmanAvailable | MaceTyrellCasualtiesPrevented | MaceTyrellFootmanKilled
    | CerseiLannisterNoOrderAvailable | CerseiLannisterOrderRemoved | RobbStarkRetreatRegionOverriden
    | RetreatRegionChosen | RetreatCasualtiesSuffered | RetreatFailed | SilenceAtTheWallExecuted
    | PreemptiveRaidChoiceDone | PreemptiveRaidTrackReduced | PreemptiveRaidUnitsKilled | PreemptiveRaidWildlingsAttack
    | MassingOnTheMilkwaterHouseCardsBack | MassingOnTheMilkwaterWildlingVictory
    | MassingOnTheMilkwaterHouseCardsRemoved
    | AKingBeyondTheWallHighestTopTrack | AKingBeyondTheWallHouseReduceTrack | AKingBeyondTheWallLowestReduceTracks
    | MammothRidersDestroyUnits | MammothRidersReturnCard | TheHordeDescendsHighestMuster | TheHordeDescendsUnitsKilled
    | CrowKillersFootmanUpgraded | CrowKillersKnightsReplaced | CrowKillersKnightsKilled
    | SkinchangerScoutNightsWatchVictory | SkinchangerScoutWildlingVictory
    | RattleshirtsRaidersNightsWatchVictory | RattleshirtsRaidersWildlingVictory
    | GameOfThronesPowerTokensGained | ImmediatelyBattleCasualtiesSuffered | BattleCasualtiesSuffered
    | SupplyAdjusted | PlayerReplaced;

interface TurnBegin {
    type: "turn-begin";
    turn: number;
}

interface SupportDeclared {
    type: "support-declared";
    supporter: string;
    supported: string | null;
}

interface SupportRefused {
    type: "support-refused";
    house: string;
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
    leftPowerToken: boolean | null;
}

interface WesterosCardExecuted {
    type: "westeros-card-executed";
    westerosCardType: string;
    westerosDeckI: number;
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
        armyUnits: string[];
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
    wildlingStrength: number;
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

interface RavenHolderReplaceOrder {
    type: "raven-holder-replace-order";
    ravenHolder: string;
    region: string;
    originalOrder: number;
    newOrder: number;
}

interface RavenNotUsed {
    type: "raven-not-used";
    ravenHolder: string;
}

interface RaidDone {
    type: "raid-done";
    raider: string;
    raidee: string | null;
    raiderRegion: string;
    raidedRegion: string | null;
    orderRaided: number | null;
    raiderGainedPowerToken: boolean | null;
    raidedHouseLostPowerToken: boolean | null;
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
    deckIndex: number;
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

interface ActionPhaseResolveRaidBegan {
    type: "action-phase-resolve-raid-began";
}

interface ActionPhaseResolveMarchBegan {
    type: "action-phase-resolve-march-began";
}

interface ActionPhaseResolveConsolidatePowerBegan {
    type: "action-phase-resolve-consolidate-power-began";
}

interface PlanningPhaseBegan {
    type: "planning-phase-began";
}

interface WildlingStrengthTriggerWildlingsAttack {
    type: "wildling-strength-trigger-wildlings-attack";
    wildlingStrength: number;
}

interface MarchOrderRemoved {
    type: "march-order-removed";
    house: string;
    region: string;
}

interface ConsolidatePowerOrderResolved {
    type: "consolidate-power-order-resolved";
    house: string;
    region: string;
    starred: boolean;
    powerTokenCount: number;
}

interface ArmiesReconciled {
    type: "armies-reconciled";
    house: string;
    armies: [string, string[]][];
}

interface HouseCardAbilityNotUsed {
    type: "house-card-ability-not-used";
    house: string;
    houseCard: string;
}

interface PatchfaceUsed {
    type: "patchface-used";
    house: string;
    affectedHouse: string;
    houseCard: string;
}

interface DoranUsed {
    type: "doran-used";
    house: string;
    affectedHouse: string;
    influenceTrack: number;
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

interface CerseiLannisterNoOrderAvailable {
    type: "cersei-lannister-no-order-available";
}

interface CerseiLannisterOrderRemoved {
    type: "cersei-lannister-order-removed";
    house: string;
    affectedHouse: string;
    region: string;
    order: number;
}

interface RobbStarkRetreatRegionOverriden {
    type: "robb-stark-retreat-location-overriden";
    house: string;
    affectedHouse: string;
}

interface RetreatRegionChosen {
    type: "retreat-region-chosen";
    house: string;
    regionFrom: string;
    regionTo: string;
}

interface RetreatFailed {
    type: "retreat-failed";
    house: string;
    isAttacker: boolean;
    region: string;
}

interface RetreatCasualtiesSuffered {
    type: "retreat-casualties-suffered";
    house: string;
    units: string[];
}

interface EnemyPortTaken {
    type: "enemy-port-taken";
    oldController: string;
    newController: string;
    shipCount: number;
    port: string;
}

interface ShipsDestroyedByEmptyCastle {
    type: "ships-destroyed-by-empty-castle";
    house: string;
    castle: string;
    port: string;
    shipCount: number;
}

interface SilenceAtTheWallExecuted {
    type: "silence-at-the-wall-executed";
}

interface PreemptiveRaidChoiceDone {
    type: "preemptive-raid-choice-done";
    house: string;
    choice: number;
}

interface PreemptiveRaidUnitsKilled {
    type: "preemptive-raid-units-killed";
    house: string;
    units: [string, string[]][];
}

interface PreemptiveRaidTrackReduced {
    type: "preemptive-raid-track-reduced";
    chooser: string | null;
    house: string;
    trackI: number;
}

interface PreemptiveRaidWildlingsAttack {
    type: "preemptive-raid-wildlings-attack";
    house: string;
    wildlingStrength: number;
}

interface MassingOnTheMilkwaterHouseCardsBack {
    type: "massing-on-the-milkwater-house-cards-back";
    house: string;
    houseCardsReturned: string[];
}

interface MassingOnTheMilkwaterWildlingVictory {
    type: "massing-on-the-milkwater-wildling-victory";
    lowestBidder: string;
}

interface MassingOnTheMilkwaterHouseCardsRemoved {
    type: "massing-on-the-milkwater-house-cards-removed";
    house: string;
    houseCardsUsed: string[];
}

interface AKingBeyondTheWallLowestReduceTracks {
    type: "a-king-beyond-the-wall-lowest-reduce-tracks";
    lowestBidder: string;
}

interface AKingBeyondTheWallHouseReduceTrack {
    type: "a-king-beyond-the-wall-house-reduce-track";
    house: string;
    trackI: number;
}

interface AKingBeyondTheWallHighestTopTrack {
    type: "a-king-beyond-the-wall-highest-top-track";
    house: string;
    trackI: number;
}

interface MammothRidersDestroyUnits {
    type: "mammoth-riders-destroy-units";
    house: string;
    units: [string, string[]][];
}

interface MammothRidersReturnCard {
    type: "mammoth-riders-return-card";
    house: string;
    houseCard: string;
}

interface TheHordeDescendsHighestMuster {
    type: "the-horde-descends-highest-muster";
    house: string;
}

interface TheHordeDescendsUnitsKilled {
    type: "the-horde-descends-units-killed";
    house: string;
    units: [string, string[]][];
}

interface CrowKillersKnightsReplaced {
    type: "crow-killers-knights-replaced";
    house: string;
    units: [string, string[]][];
}

interface CrowKillersKnightsKilled {
    type: "crow-killers-knights-killed";
    house: string;
    units: [string, string[]][];
}

interface CrowKillersFootmanUpgraded {
    type: "crow-killers-footman-upgraded";
    house: string;
    units: [string, string[]][];
}

interface SkinchangerScoutNightsWatchVictory {
    type: "skinchanger-scout-nights-watch-victory";
    house: string;
    powerToken: number;
}

interface SkinchangerScoutWildlingVictory {
    type: "skinchanger-scout-wildling-victory";
    house: string;
    powerTokensLost: [string, number][];
}

interface RattleshirtsRaidersNightsWatchVictory {
    type: "rattleshirts-raiders-nights-watch-victory";
    house: string;
    newSupply: number;
}

interface RattleshirtsRaidersWildlingVictory {
    type: "rattleshirts-raiders-wildling-victory";
    lowestBidder: string;
    newSupply: [string, number][];
}

interface GameOfThronesPowerTokensGained {
    type: "game-of-thrones-power-tokens-gained";
    gains: [string, number][];
}

interface ImmediatelyBattleCasualtiesSuffered {
    type: "immediatly-killed-after-combat";
    house: string;
    killedBecauseWounded: string[];
    killedBecauseCantRetreat: string[];
}

interface BattleCasualtiesSuffered {
    type: "killed-after-combat";
    house: string;
    killed: string[];
}

interface SupplyAdjusted {
    type: "supply-adjusted";
    supplies: [string, number][];
}

interface PlayerReplaced {
    type: "player-replaced";
    oldUser: string;
    newUser: string;
    house: string;
}