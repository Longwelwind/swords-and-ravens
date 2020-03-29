import {SerializedSeeTopWildlingCardGameState} from "../common/ingame-game-state/action-game-state/use-raven-game-state/see-top-wildling-card-game-state/SeeTopWildlingCardGameState";
import {SerializedGameState} from "../common/GameState";
import {SerializedUnit} from "../common/ingame-game-state/game-data-structure/Unit";
import {SerializedUser} from "../server/User";
import {HouseCardState} from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import {GameLogData} from "../common/ingame-game-state/game-data-structure/GameLog";
import {UserSettings} from "./ClientMessage";
import { SerializedWesterosCard } from "../common/ingame-game-state/game-data-structure/westeros-card/WesterosCard";
import { SerializedVote } from "../common/ingame-game-state/vote-system/Vote";

export type ServerMessage = NewUser | HouseChosen | AuthenticationResponse | OrderPlaced | PlayerReady | PlayerUnready
    | HouseCardChosen | CombatImmediatelyKilledUnits | SupportDeclared | NewTurn | RemovePlacedOrder
    | MoveUnits | CombatChangeArmy | VassalsClaimed
    | UnitsWounded | ChangeCombatHouseCard | BeginSeeTopWildlingCard
    | RavenOrderReplaced | RevealTopWildlingCard | HideTopWildlingCard | ProceedWesterosCard | ChangeGarrison
    | BidDone | GameStateChange | SupplyAdjusted
    | ChangeControlPowerToken | ChangePowerToken | ChangeWildlingStrength | AddGameLog | RevealWildlingCard
    | RemoveUnits | AddUnits | ChangeTracker | ActionPhaseChangeOrder | ChangeStateHouseCard
    | SettingsChanged | ChangeValyrianSteelBladeUse | BiddingNextTrack | NewPrivateChatRoom | GameSettingsChanged
    | UpdateWesterosDecks | UpdateConnectionStatus | VoteStarted | VoteCancelled | VoteDone | PlayerReplaced;

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

interface HouseCardChosen {
    type: "house-card-chosen";
    houseId: string;
    houseCardId: string | null;
}

interface ChangeCombatHouseCard {
    type: "change-combat-house-card";
    houseCardIds: [string, string | null][];
}

interface CombatImmediatelyKilledUnits {
    type: "combat-immediately-killed-units";
    regionId: string;
    unitIds: number[];
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

interface ArmyRetreated {
    type: "army-retreated";
    startingRegionId: string;
    retreatRegionId: string;
    unitIds: number[];
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
    cardId: number;
    houseId: string;
}

interface HideTopWildlingCard {
    type: "hide-top-wildling-card";
}

interface ProceedWesterosCard {
    type: "proceed-westeros-card";
    currentCardI: number;
}

interface BidDone {
    type: "bid-done";
    houseId: string;
}

interface GameStateChange {
    type: "game-state-change";
    level: number;
    serializedGameState: SerializedGameState;
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
    units: [string, SerializedUnit[]][];
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
}

interface GameSettingsChanged {
    type: "game-settings-changed";
    settings: any;
}

interface UpdateWesterosDecks {
    type: "update-westeros-decks";
    westerosDecks: SerializedWesterosCard[][];
}

interface UpdateConnectionStatus {
    type: "update-connection-status";
    user: string;
    status: boolean;
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
    newUser: string;
}

interface VassalsClaimed {
    type: "vassals-claimed";
    vassals: string[];
    house: string;
}