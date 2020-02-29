export type ClientMessage = Ping | Authenticate | PlaceOrder | Ready | Unready | ResolveMarchOrder | DeclareSupport
    | UseValyrianSteelBlade | ChooseHouseCard | ChooseCasualties | ChooseRavenAction
    | ChooseTopWildlingCardAction | ReplaceOrder | SkipReplaceOrder | ResolveRaid | Bid | ChooseChoice
    | DecideBiggest | ReconcileArmies | Muster | ResolveTies | SelectUnits | LaunchGame | ChooseHouse
    | SelectOrders | SelectHouseCard | SelectRegion | ChangeSettings | CreatePrivateChatRoom | ChangeGameSettings
    | CancelGame;

interface Ping {
    type: "ping";
}

interface Authenticate {
    type: "authenticate";
    authData: {
        userId: string;
        gameId: string;
        authToken: string;
    };
}

interface PlaceOrder {
    type: "place-order";
    orderId: number | null;
    regionId: string;
}

interface CancelGame {
    type: "cancel-game";
}

interface ChooseHouse {
    type: "choose-house";
    house: string | null;
}

interface Ready {
    type: "ready";
}

interface Unready {
    type: "unready";
}

interface LaunchGame {
    type: "launch-game";
}

interface ResolveMarchOrder {
    type: "resolve-march-order";
    startingRegionId: string;
    moves: [string, number[]][];
    leavePowerToken: boolean;
}

interface DeclareSupport {
    type: "declare-support";
    supportedHouseId: string | null;
}

interface UseValyrianSteelBlade {
    type: "use-valyrian-steel-blade";
    use: boolean;
}

interface ChooseHouseCard {
    type: "choose-house-card";
    houseCardId: string;
}

interface ChooseCasualties {
    type: "choose-casualties";
    chosenCasualties: number[];
}

interface ChooseRavenAction {
    type: "choose-raven-action";
    action: RavenAction;
}

export enum RavenAction {
    REPLACE_ORDER,
    SEE_TOP_WILDLING_CARD,
    NONE
}

interface ChooseTopWildlingCardAction {
    type: "choose-top-wildling-card-action";
    action: SeeTopWildlingCardAction;
}

export enum SeeTopWildlingCardAction {
    LEAVE_AT_THE_TOP,
    PUT_AT_BOTTOM
}

interface SkipReplaceOrder {
    type: "skip-replace-order";
}

interface ReplaceOrder {
    type: "replace-order";
    regionId: string;
    orderId: number;
}

interface ResolveRaid {
    type: "resolve-raid";
    orderRegionId: string;
    targetRegionId: string | null;
}

interface SelectOrders {
    type: "select-orders";
    regions: string[];
}

interface Bid {
    type: "bid";
    powerTokens: number;
}

interface ChooseChoice {
    type: "choose-choice";
    choice: number;
}

interface DecideBiggest {
    type: "decide-biggest";
    house: string;
}

interface ReconcileArmies {
    type: "reconcile-armies";
    unitsToRemove: [string, number[]][];
}

interface Muster {
    type: "muster";
    // This represents a map of recruitements.
    // The first string is a region id from where the mustering points is isued.
    // After, it's a list of objects. In those objects, to is the type of unit
    // that will be mustered, from is the possible unit that will
    // be transformed and region is the region in which the mustering is happening.
    units: [string, {from: number | null; to: string; region: string}[]][];
}

interface ResolveTies {
    type: "resolve-ties";
    resolvedTies: string[][];
}

interface SelectUnits {
    type: "select-units";
    units: [string, number[]][];
}

interface SelectHouseCard {
    type: "select-house-card";
    houseCard: string;
}

interface SelectRegion {
    type: "select-region";
    region: string;
}

interface ChangeSettings {
    type: "change-settings";
    settings: UserSettings;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserSettings {
}

interface ChangeGameSettings {
    type: "change-game-settings";
    settings: any;
}

interface CreatePrivateChatRoom {
    type: "create-private-chat-room";
    otherUser: string;
}
