import { SerializedSeeTopWildlingCardGameState } from "../common/ingame-game-state/action-game-state/use-raven-game-state/see-top-wildling-card-game-state/SeeTopWildlingCardGameState";
import { SerializedGameState } from "../common/GameState";
import { SerializedUnit } from "../common/ingame-game-state/game-data-structure/Unit";
import { SerializedUser } from "../server/User";
import {
  HouseCardState,
  SerializedHouseCard,
} from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import { GameLogData } from "../common/ingame-game-state/game-data-structure/GameLog";
import { UserSettings } from "./ClientMessage";
import { SerializedWesterosCard } from "../common/ingame-game-state/game-data-structure/westeros-card/WesterosCard";
import { SerializedVote } from "../common/ingame-game-state/vote-system/Vote";
import { CrowKillersStep } from "../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import HouseCardModifier from "../common/ingame-game-state/game-data-structure/house-card/HouseCardModifier";
import { CombatStats } from "../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import { DraftStep } from "../common/ingame-game-state/draft-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import { SerializedLoanCard } from "../common/ingame-game-state/game-data-structure/loan-card/LoanCard";
import { SerializedWaitedForData } from "../common/ingame-game-state/Player";
import { SerializedRegion } from "../common/ingame-game-state/game-data-structure/Region";

export type ServerMessage =
  | NewUser
  | HouseChosen
  | AuthenticationResponse
  | OrderPlaced
  | PlayerReady
  | PlayerUnready
  | HouseCardChosen
  | SupportDeclared
  | SupportRefused
  | NewTurn
  | RemovePlacedOrder
  | MoveUnits
  | CombatChangeArmy
  | NextHouse
  | UnitsWounded
  | ChangeCombatHouseCard
  | BeginSeeTopWildlingCard
  | RavenOrderReplaced
  | RevealTopWildlingCard
  | HideTopWildlingCard
  | ProceedWesterosCard
  | ChangeGarrison
  | BiddingBegin
  | BidDone
  | BiddingNextTrack
  | GameStateChange
  | SupplyAdjusted
  | ChangeControlPowerToken
  | ChangePowerToken
  | ChangeWildlingStrength
  | AddGameLog
  | RevealWildlingCard
  | RemoveUnits
  | AddUnits
  | ChangeTracker
  | ActionPhaseChangeOrder
  | ChangeStateHouseCard
  | SettingsChanged
  | ChangeValyrianSteelBladeUse
  | NewPrivateChatRoom
  | GameSettingsChanged
  | UpdateWesterosDecks
  | UpdateConnectionStatus
  | UpdateOtherUsersFromSameNetwork
  | VoteStarted
  | VoteCancelled
  | VoteDone
  | PlayerReplaced
  | VassalReplaced
  | CrowKillersStepChanged
  | ManipulateCombatHouseCard
  | ChangeCombatTidesOfBattleCard
  | VassalRelations
  | UpdateHouseCardModifier
  | UpdateHouseCards
  | UpdateDraftPool
  | UpdateGameHouseCards
  | UpdateCombatStats
  | UpdateDraftState
  | RevealBids
  | UpdateMaxTurns
  | PasswordResponse
  | ReplacedByVassal
  | UpdateDeletedHouseCards
  | UpdateOldPlayerHouseCards
  | LoyaltyTokenGained
  | LoyaltyTokenPlaced
  | DrangonStrengthTokenRemoved
  | UpdateLoanCards
  | UpdateRegionModifiers
  | UpdateCompletedObjectives
  | UpdateSecretObjectives
  | SyncShiftingAmbitionsGameState
  | HideOrRevealUserNames
  | ClearChatRoom
  | UpdateSelectableObjectives
  | UpdateSpecialHouseCardModifier
  | UpdateUsurper
  | StartPlayerClock
  | StopPlayerClock
  | GamePaused
  | GameResumed
  | LaterHouseCardsApplied
  | WildlingTiesResolved
  | PreemptiveRaidNewAttack
  | GameStarted
  | ReadyCheck
  | HousesSwapped
  | RevealOrders
  | RemoveOrders
  | AcceptAllLoyaltyTokenMovementsChanged
  | UpdateWaitedForData
  | UserBanned
  | UserUnbanned
  | UpdateVisibleRegions
  | UpdatePublicVisibleRegionsForSpectators
  | Reload;

interface AuthenticationResponse {
  type: "authenticate-response";
  userId: string;
  game: any;
}

interface NewUser {
  type: "new-user";
  user: SerializedUser;
}

interface HouseChosen {
  type: "house-chosen";
  players: [string, string][];
}

interface AddGameLog {
  type: "add-game-log";
  data: GameLogData;
  time: number;
  resolvedAutomatically?: boolean;
}

interface OrderPlaced {
  type: "order-placed";
  order: number | null;
  region: string;
}

interface RemovePlacedOrder {
  type: "remove-placed-order";
  regionId: string;
}

interface PlayerReady {
  type: "player-ready";
  userId: string;
}

interface PlayerUnready {
  type: "player-unready";
  userId: string;
}

interface SupportDeclared {
  type: "support-declared";
  houseId: string;
  supportedHouseId: string | null;
}

interface SupportRefused {
  type: "support-refused";
  houseId: string;
}

interface HouseCardChosen {
  type: "house-card-chosen";
  houseId: string;
  houseCardId: string | null;
  dontSkipVsbQuestion: boolean;
}

interface ChangeCombatHouseCard {
  type: "change-combat-house-card";
  houseCardIds: [string, string | null][];
  animate?: boolean;
}

interface ChangeCombatTidesOfBattleCard {
  type: "change-combat-tides-of-battle-card";
  tidesOfBattleCardIds: [string, string | null][];
}

interface ManipulateCombatHouseCard {
  type: "manipulate-combat-house-card";
  manipulatedHouseCards: [string, SerializedHouseCard][];
}

interface CombatChangeArmy {
  type: "combat-change-army";
  house: string;
  region: string;
  army: number[];
}

interface ChangeStateHouseCard {
  type: "change-state-house-card";
  houseId: string;
  cardIds: string[];
  state: HouseCardState;
}

interface UnitsWounded {
  type: "units-wounded";
  regionId: string;
  unitIds: number[];
}

interface BeginSeeTopWildlingCard {
  type: "begin-see-top-wildling-card";
  serializedSeeTopWildlingCardGameState: SerializedSeeTopWildlingCardGameState;
}

interface RavenOrderReplaced {
  type: "raven-order-replaced";
  regionId: string;
  orderId: number;
}

interface RevealTopWildlingCard {
  type: "reveal-top-wildling-card";
  cardId: number | null;
  houseId: string;
}

interface HideTopWildlingCard {
  type: "hide-top-wildling-card";
}

interface ProceedWesterosCard {
  type: "proceed-westeros-card";
  currentCardI: number;
}

interface BiddingBegin {
  type: "bidding-begin";
}

interface BidDone {
  type: "bid-done";
  houseId: string;
  value: number;
}

interface GameStateChange {
  type: "game-state-change";
  level: number;
  serializedGameState: SerializedGameState;
  newLeafId: string;
}

interface SupplyAdjusted {
  type: "supply-adjusted";
  supplies: [string, number][];
}

interface ChangeControlPowerToken {
  type: "change-control-power-token";
  regionId: string;
  houseId: string | null;
}

interface ChangePowerToken {
  type: "change-power-token";
  houseId: string;
  powerTokenCount: number;
}

interface AddUnits {
  type: "add-units";
  regionId: string;
  units: SerializedUnit[];
  isTransform?: boolean;
}

interface ChangeWildlingStrength {
  type: "change-wildling-strength";
  wildlingStrength: number;
}

interface RevealWildlingCard {
  type: "reveal-wildling-card";
  wildlingCard: number;
}

interface RemoveUnits {
  type: "remove-units";
  regionId: string;
  unitIds: number[];
  animate: boolean;
}

interface ChangeTracker {
  type: "change-tracker";
  trackerI: number;
  tracker: string[];
}

interface ActionPhaseChangeOrder {
  type: "action-phase-change-order";
  region: string;
  order: number | null;
  animate?: "yellow" | "red" | "white";
}

interface ChangeGarrison {
  type: "change-garrison";
  region: string;
  newGarrison: number;
}

interface MoveUnits {
  type: "move-units";
  from: string;
  to: string;
  units: number[];
  isRetreat?: boolean;
}

interface NewTurn {
  type: "new-turn";
}

interface SettingsChanged {
  type: "settings-changed";
  user: string;
  settings: UserSettings;
}

interface ChangeValyrianSteelBladeUse {
  type: "change-valyrian-steel-blade-use";
  used: boolean;
}

interface BiddingNextTrack {
  type: "bidding-next-track";
  nextTrack: number;
}

interface NewPrivateChatRoom {
  type: "new-private-chat-room";
  users: string[];
  roomId: string;
  initiator: string;
}

interface GameSettingsChanged {
  type: "game-settings-changed";
  settings: any;
}

interface UpdateWesterosDecks {
  type: "update-westeros-decks";
  westerosDecks: SerializedWesterosCard[][];
  winterIsComingHappened: boolean[];
}

interface UpdateConnectionStatus {
  type: "update-connection-status";
  user: string;
  status: boolean;
}

interface UpdateOtherUsersFromSameNetwork {
  type: "update-other-users-with-same-ip";
  user: string;
  otherUsers: string[];
}

interface VoteStarted {
  type: "vote-started";
  vote: SerializedVote;
}

interface VoteCancelled {
  type: "vote-cancelled";
  vote: string;
}

interface VoteDone {
  type: "vote-done";
  vote: string;
  voter: string;
  choice: boolean;
}

interface PlayerReplaced {
  type: "player-replaced";
  oldUser: string;
  newUser?: string;
  liveClockRemainingSeconds?: number;
  timedOut?: boolean;
}

interface VassalReplaced {
  type: "vassal-replaced";
  house: string;
  user: string;
  liveClockRemainingSeconds?: number;
}

interface CrowKillersStepChanged {
  type: "crow-killers-step-changed";
  newStep: CrowKillersStep;
}

interface VassalRelations {
  type: "vassal-relations";
  vassalRelations: [string, string][];
}

interface UpdateHouseCardModifier {
  type: "update-house-card-modifier";
  id: string;
  modifier: HouseCardModifier;
}

interface UpdateSpecialHouseCardModifier {
  type: "update-special-house-card-modifier";
  houseCardId: string;
  combatStrength: number;
}

interface UpdateHouseCards {
  type: "update-house-cards";
  house: string;
  houseCards: string[];
}

interface UpdateDraftPool {
  type: "update-draft-pool";
  houseCards: string[];
}

interface UpdateGameHouseCards {
  type: "update-game-house-cards";
  draftPool: string[];
  houseCards: [string, string[]];
}

interface UpdateCombatStats {
  type: "update-combat-stats";
  stats: CombatStats[];
}

interface UpdateDraftState {
  type: "update-draft-state";
  rowIndex: number;
  columnIndex: number;
  draftStep: DraftStep;
}

interface RevealBids {
  type: "reveal-bids";
  bids: [number, string[]][];
}

interface UpdateMaxTurns {
  type: "update-max-turns";
  maxTurns: number;
}

interface PasswordResponse {
  type: "password-response";
  password: string;
}

interface ReplacedByVassal {
  type: "replaced-by-vassal";
}

interface UpdateDeletedHouseCards {
  type: "update-deleted-house-cards";
  houseCards: string[];
}

interface UpdateOldPlayerHouseCards {
  type: "update-old-player-house-cards";
  houseCards: [string, string[]][];
}

interface LoyaltyTokenGained {
  type: "loyalty-token-gained";
  newLoyaltyTokenCount: number;
  region: string;
}

interface LoyaltyTokenPlaced {
  type: "loyalty-token-placed";
  region: string;
  newLoyaltyTokenCount: number;
}

interface DrangonStrengthTokenRemoved {
  type: "dragon-strength-token-removed";
  fromRound: number;
}

interface UpdateLoanCards {
  type: "update-loan-cards";
  loanCardDeck: SerializedLoanCard[];
  purchasedLoans: SerializedLoanCard[];
  loanSlots: (SerializedLoanCard | null)[];
}

interface UpdateRegionModifiers {
  type: "update-region-modifiers";
  region: string;
  castleModifier?: number;
  barrelModifier?: number;
  crownModifier?: number;
}

interface UpdateCompletedObjectives {
  type: "update-completed-objectives";
  objectives: [string, string[]][];
  victoryPointCount: [string, number][];
}

interface UpdateSecretObjectives {
  type: "update-secret-objectives";
  house: string;
  objectives: string[];
}

interface SyncShiftingAmbitionsGameState {
  type: "sync-shifting-ambitions";
  step: number;
  objectiveCardPool: string[];
  turnOrder: string[];
}

interface HideOrRevealUserNames {
  type: "hide-or-reveal-user-names";
  names: [string, string][];
}

interface ClearChatRoom {
  type: "clear-chat-room";
  roomId: string;
}

interface UpdateSelectableObjectives {
  type: "update-selectable-objectives";
  house: string;
  selectableObjectives: string[];
}

interface UpdateUsurper {
  type: "update-usurper";
  house: string | null;
}

interface StartPlayerClock {
  type: "start-player-clock";
  userId: string;
  remainingSeconds: number;
  timerStartedAt: number;
}

interface StopPlayerClock {
  type: "stop-player-clock";
  userId: string;
  remainingSeconds: number;
}

interface LaterHouseCardsApplied {
  type: "later-house-cards-applied";
  house: string;
}

interface GamePaused {
  type: "game-paused";
  willBeAutoResumedAt: number | null;
}

interface GameResumed {
  type: "game-resumed";
}

interface WildlingTiesResolved {
  type: "wilding-ties-resolved";
  highestBidder?: string;
  lowestBidder?: string;
}

interface PreemptiveRaidNewAttack {
  type: "preemptive-raid-new-attack";
  biddings: [number, string[]][];
  highestBidder: string;
}

interface GameStarted {
  type: "game-started";
}

interface ReadyCheck {
  type: "ready-check";
  readyUsers: string[] | null;
  readyCheckWillTimeoutAt: number | null;
}

interface HousesSwapped {
  type: "houses-swapped";
  initiator: string;
  swappingUser: string;
}

interface RevealOrders {
  type: "reveal-orders";
  orders: [string, number][];
}

interface RemoveOrders {
  type: "remove-orders";
  regions: string[];
}

interface AcceptAllLoyaltyTokenMovementsChanged {
  type: "accept-all-loyalty-token-movements-changed";
  newValue: boolean;
}

interface UpdateWaitedForData {
  type: "update-waited-for-data";
  userId: string;
  waitedForData: SerializedWaitedForData | null;
}

interface UserBanned {
  type: "user-banned";
  userId: string;
}

interface UserUnbanned {
  type: "user-unbanned";
  userId: string;
}

interface UpdateVisibleRegions {
  type: "update-visible-regions";
  playerUserId: string;
  regionsToMakeVisible: SerializedRegion[];
  regionsToHide: string[];
  ordersToMakeVisible: [string, number][];
}

interface UpdatePublicVisibleRegionsForSpectators {
  type: "update-public-visible-regions";
  regionsToMakeVisible?: SerializedRegion[];
  ordersToMakeVisible?: [string, number][];
  clear?: boolean;
  applyChangesNow?: boolean;
}

interface NextHouse {
  type: "next-house";
  house: string;
}

interface Reload {
  type: "reload";
}
