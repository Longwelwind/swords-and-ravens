import GameState, {SerializedGameState} from "./GameState";
import LobbyGameState, {SerializedLobbyGameState} from "./lobby-game-state/LobbyGameState";
import IngameGameState, {SerializedIngameGameState} from "./ingame-game-state/IngameGameState";
import {ServerMessage} from "../messages/ServerMessage";
import {ClientMessage} from "../messages/ClientMessage";
import User, {SerializedUser} from "../server/User";
import {observable} from "mobx";
import * as _ from "lodash";
import BetterMap from "../utils/BetterMap";
import GameEndedGameState from "./ingame-game-state/game-ended-game-state/GameEndedGameState";
import { GameSetup, getGameSetupContainer } from "./ingame-game-state/game-data-structure/createGame";
import CancelledGameState, { SerializedCancelledGameState } from "./cancelled-game-state/CancelledGameState";
import { VoteState } from "./ingame-game-state/vote-system/Vote";
import CombatGameState, { CombatStats } from "./ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import PostCombatGameState from "./ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";
import { StoredProfileSettings, StoredUserData } from "../server/website-client/WebsiteClient";
import Player from "./ingame-game-state/Player";
import { v4 } from "uuid";
import { ReplacePlayer, ReplacePlayerByVassal } from "./ingame-game-state/vote-system/VoteType";
import WildlingsAttackGameState from "./ingame-game-state/westeros-game-state/wildlings-attack-game-state/WildlingsAttackGameState";
import BiddingGameState from "./ingame-game-state/westeros-game-state/bidding-game-state/BiddingGameState";
import SimpleChoiceGameState from "./ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import getElapsedSeconds from "../utils/getElapsedSeconds";
import WildlingCardType from "./ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import House from "./ingame-game-state/game-data-structure/House";
import { EntireGameSnapshot } from "./ingame-game-state/game-data-structure/Game";
import SnrError from "../utils/snrError";

export enum NotificationType {
    READY_TO_START,
    BRIBE_FOR_SUPPORT,
    BATTLE_RESULTS,
    NEW_VOTE_STARTED,
    GAME_ENDED
}

export default class EntireGame extends GameState<null, LobbyGameState | IngameGameState | CancelledGameState> {
    id: string;
    @observable users = new BetterMap<string, User>();
    ownerUserId: string;
    name: string;
    publicChatRoomId: string;
    // Keys are the two users participating in the private chat.
    // A pair of user is sorted alphabetically by their id when used as a key.
    @observable privateChatRoomsIds: BetterMap<User, BetterMap<User, string>> = new BetterMap();
    // Client-side callback fired whenever a new private chat-window was created
    leafStateId = v4();
    lastMessageReceivedAt: Date | null = null;

    @observable gameSettings: GameSettings = { setupId: "mother-of-dragons", playerCount: 8, pbem: true, onlyLive: false, startWhenFull: false, private: false,
        addPortToTheEyrie: false, adwdHouseCards: false, asosHouseCards: false, houseCardsEvolution: false,
        vassals: true, ironBank: true, seaOrderTokens: true, allowGiftingPowerTokens: true, randomVassalAssignment: false, customBalancing: false,
        randomHouses: false, randomChosenHouses: false, tidesOfBattle: false, removeTob3: false, removeTobSkulls: false, limitTob2: false,
        draftHouseCards: false, thematicDraft: false, limitedDraft: false, blindDraft: false,
        mixedWesterosDeck1: false, cokWesterosPhase: false, fogOfWar: false, victoryPointsCountNeededToWin: 7, loyaltyTokenCountNeededToWin: 7, endless: false,  faceless: false,
        useVassalPositions: false, precedingMustering: false, randomStartPositions: false, initialLiveClock: 60,
        noPrivateChats: false, tournamentMode: false, fixedClock: false, holdVictoryPointsUntilEndOfRound: false
    };

    onSendClientMessage?: (message: ClientMessage) => void;
    onSendServerMessage?: (users: User[], message: ServerMessage) => void;
    onWaitedUsers?: (users: User[]) => void;
    onReadyToStart?: (users: User[]) => void;
    onNewVoteStarted?: (users: User[]) => void;
    onBribeForSupport?: (users: User[]) => void;
    onBattleResults?: (users: User[]) => void;
    onGameEnded?: (users: User[]) => void;
    onNewPbemResponseTime?: (user: User, responseTimeInSeconds: number) => void;
    onClearChatRoom?: (roomId: string) => void;
    onCaptureSentryMessage?: (message: string, severity: "info" | "warning" | "error" | "fatal") => void;
    onSaveGame?: (updateLastActive: boolean) => void;
    onGetUser?: (userId: string) => Promise<StoredUserData | null>;

    // Throttled saveGame so we don't spam the website client
    saveGame: (updateLastActive: boolean) => void = _.throttle(this.privateSaveGame, 2000);

    // Client-side callbacks
    onNewPrivateChatRoomCreated: ((roomId: string) => void) | null = null;
    onGameStarted: (() => void) | null = null;
    onClientGameStateChange: (() => void) | null = null;
    onCombatFastTracked: ((stats: CombatStats[]) => void) | null = null;
    onWildingsAttackFastTracked: ((wildingCard: WildlingCardType,
        biddings: [number, House[]][] | null,
        highestBidder: House | null,
        lowestBidder: House | null) => void) | null = null;

    @observable
    replaySnapshot: EntireGameSnapshot | null = null;

    @observable
    now = new Date();

    get lobbyGameState(): LobbyGameState | null {
        return this.childGameState instanceof LobbyGameState ? this.childGameState : null;
    }

    get ingameGameState(): IngameGameState | null {
        return this.childGameState instanceof IngameGameState ? this.childGameState : null;
    }

    get selectedGameSetup(): GameSetup {
        const container = getGameSetupContainer(this.gameSettings.setupId);

        const playerSetups = container.playerSetups;

        const gameSetup = playerSetups.find(gameSetup => this.gameSettings.playerCount == gameSetup.playerCount);

        if (gameSetup == undefined) {
            throw new SnrError(this, `Invalid playerCount ${this.gameSettings.playerCount} for setupId ${this.gameSettings.setupId}`);
        }

        return gameSetup;
    }

    get isDanceWithDragons(): boolean {
        return this.gameSettings.setupId == "a-dance-with-dragons";
    }

    get isFeastForCrows(): boolean {
        return this.gameSettings.setupId == "a-feast-for-crows";
    }

    get isMotherOfDragons(): boolean {
        return this.gameSettings.setupId == "mother-of-dragons";
    }

    get isDanceWithMotherOfDragons(): boolean {
        return this.gameSettings.setupId == "a-dance-with-mother-of-dragons";
    }

    get minPlayerCount(): number {
        // For Debug we can manipulate this to allow games with only 1 player
        //return 1;
        return this.gameSettings.playerCount >= 8 ? 4 : 3;
    }

    constructor(id: string, ownerId: string, name: string) {
        super(null);
        this.id = id;
        this.ownerUserId = ownerId;
        this.name = name;
    }

    firstStart(): void {
        this.setChildGameState(new LobbyGameState(this)).firstStart();
    }

    proceedToIngameGameState(housesToCreate: string[], futurePlayers: BetterMap<string, User>): void {
        if (this.gameSettings.faceless && this.onClearChatRoom) {
            this.onClearChatRoom(this.publicChatRoomId);
            this.broadcastToClients({
                type: "clear-chat-room",
                roomId: this.publicChatRoomId
            });
        }

        this.setChildGameState(new IngameGameState(this)).beginGame(housesToCreate, futurePlayers);

        this.checkGameStateChanged();

        this.doPlayerClocksHandling();

        // Assign new faceless names after we have updated the game-state tree on client-side.
        // This will load the IngameComponent first and prevent the new names to be shown
        // in the LobbyComponent for a short period.
        this.ingameGameState?.assignNewFacelessNames();
    }

    checkGameStateChanged(skipNotifyWaitedUsers = false): boolean {
        const {level, gameState} = this.getFirstGameStateToBeRetransmitted();

        if (gameState) {
            // console.log("===GAME STATE CHANGED===");
            // The GameState tree has been changed, broadcast a message to transmit to them
            // the new game state.
            this.broadcastCustomToClients(u => {
                // To serialize the specific game state that has changed, the code serializes the entire
                // game state tree and pick the appropriate serializedGameState.
                // TODO: Find less wasteful way of doing this
                const serializedEntireGame = this.serializeToClient(u);
                const serializedGameState = _.range(level).reduce((s, _) => s.childGameState, serializedEntireGame as SerializedGameState);

                if (!serializedGameState) {
                    throw new SnrError(this);
                }

                return {
                    type: "game-state-change",
                    level,
                    serializedGameState,
                    newLeafId: this.leafStateId
                };
            });

            // Mark everything as transmitted
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            let gameState: GameState<any, any> | null = this;
            while (gameState != null) {
                gameState.needsToBeTransmittedToClient = false;

                gameState = gameState.childGameState;
            }

            if (skipNotifyWaitedUsers) {
                return true;
            }

            // Reset WaitedForData for all players
            this.ingameGameState?.players.values.filter(p => p.waitedForData != null).forEach(p => {
                // In case there is still an unhandled WaitedForData we now send the response time
                // Basically this should not happen, but we keep it for safety!
                if (p.waitedForData?.handled === false) {
                    console.warn(`Unhandled waitedForData for user ${p.user.name} (${p.user.id})`);
                    if (this.onCaptureSentryMessage) {
                        this.onCaptureSentryMessage(`Unhandled waitedForData for user ${p.user.name} (${p.user.id})`, "warning");
                    }
                }
                p.resetWaitedFor();
            });

            this.notifyWaitedUsers();
            return true;
        }

        return false;
    }

    notifyWaitedUsers(waitedUsers: User[] = []): void {
        // If the game is PBEM, send a notification to all waited users
        if (this.gameSettings.pbem && this.onWaitedUsers) {
            if (waitedUsers.length > 0) {
                this.onWaitedUsers(waitedUsers);
            } else {
                this.onWaitedUsers(this.leafState.getWaitedUsers());
            }
        }
    }

    notifyUsers(users: User[], type: NotificationType): void {
        // Always notify on Ready to Start and Game Ended, even for live games!
        switch (type) {
            case NotificationType.READY_TO_START:
                if (this.onReadyToStart) {
                    this.onReadyToStart(users);
                }
                break;
            case NotificationType.GAME_ENDED:
                if (this.onGameEnded) {
                    this.onGameEnded(users);
                }
                break;
        }

        if (!this.gameSettings.pbem) {
            // If game is no PBEM, don't send further notifications
            return;
        }

        switch (type) {
            case NotificationType.NEW_VOTE_STARTED:
                if (this.onNewVoteStarted) {
                    this.onNewVoteStarted(users);
                }
                break;
            case NotificationType.BATTLE_RESULTS:
                if (this.onBattleResults) {
                    this.onBattleResults(users);
                }
                break;
            case NotificationType.BRIBE_FOR_SUPPORT:
                if (this.onBribeForSupport) {
                    this.onBribeForSupport(users);
                }
                break;
        }
    }

    canActAsOwner(user: User): boolean {
        if (this.gameSettings.tournamentMode) {
            // Tournament games can only be changed and started by the game owner (creator)
            return this.isRealOwner(user);
        }

        if (this.ingameGameState) {
            // If game owner is not present ingame
            // every player can toggle between PBEM and Live
            return this.ingameGameState.players.keys.map(u => u.id).includes(this.ownerUserId)
                ? this.isRealOwner(user)
                : this.ingameGameState.players.keys.includes(user);
        }

        if (this.lobbyGameState) {
            // In case game owner is not seated, every player is allowed to start the game when it is full
            const seatedUserIds = this.lobbyGameState.players.values.map(u => u.id);
            if (!seatedUserIds.includes(this.ownerUserId) && seatedUserIds.includes(user.id) && seatedUserIds.length >= this.gameSettings.playerCount) {
                return true;
            }
        }

        return this.isRealOwner(user);
    }

    isRealOwner(user: User): boolean {
        return user.id == this.ownerUserId;
    }

    addUser(userId: string, userName: string, profileSettings: StoredProfileSettings): User {
        const user = new User(userId, userName, `Nobody ${this.users.size + 1}`, this, {
            chatHouseNames: profileSettings.houseNamesForChat,
            mapScrollbar: profileSettings.mapScrollbar,
            responsiveLayout: profileSettings.responsiveLayout,
            muted: profileSettings.muted,
            lastOpenedTab: null,
            tracksColumnCollapsed: false,
            showMapWhenDrafting: false,
            musicMuted: profileSettings.muted
        });
        this.users.set(user.id, user);

        this.broadcastToClients({
            type: "new-user",
            user: user.serializeToClient(false, null, this.gameSettings.faceless)
        });

        // Save the new user to the database
        this.saveGame(false);
        return user;
    }

    isCustomBalancingOptionAvailable(settings: GameSettings): boolean {
        return (settings.setupId == "mother-of-dragons" && settings.playerCount == 8)
            || (settings.setupId == "base-game" && settings.playerCount == 6);
    }

    onClientMessage(user: User, message: ClientMessage): void {
        let updateLastActive = false;
        if (message.type == "change-settings") {
            user.settings = message.settings;

            this.broadcastToClients({
                type: "settings-changed",
                user: user.id,
                settings: user.settings
            });
        } else if (message.type == "change-game-settings") {
            if (!this.canActAsOwner(user)) {
                return;
            }

            if (this.lobbyGameState?.readyUsers != null) {
                // Disallow changing settings when ready check is running
                message.settings = this.gameSettings;
            }

            // Only allow PBEM and Private to be changed ingame
            const settings = message.settings as GameSettings;

            if (!this.gameSettings.pbem && this.gameSettings.onlyLive) {
                // Don't allow changing PBEM if onlyLive is set
                settings.pbem = false;
            }

            if (this.ingameGameState) {
                if (settings.pbem && !this.gameSettings.pbem) {
                    this.gameSettings.pbem = settings.pbem;
                    // Notify waited users due to ingame PBEM change
                    this.notifyWaitedUsers();
                    // Do not activate waitedForData now. We start calculating with the next game state change
                } else if (this.gameSettings.pbem && !settings.pbem) {
                    // Reset waitedFor as we are now Live
                    this.ingameGameState.resetAllWaitedForData();
                }
            }

            this.gameSettings.pbem = settings.pbem;

            if (!this.gameSettings.pbem) {
                this.gameSettings.startWhenFull = false;
                settings.startWhenFull = false;
            } else {
                this.gameSettings.onlyLive = false;
                settings.onlyLive = false;
            }

            if (this.isRealOwner(user)) {
                // For changing settings other than PBEM or Private pass the message to the client game state
                this.childGameState.onClientMessage(user, message);
            }

            this.broadcastToClients({
                type: "game-settings-changed",
                settings: this.gameSettings
            });
        } else {
            updateLastActive = this.childGameState.onClientMessage(user, message);
        }

        const notWaitedAnymore = this.ingameGameState?.checkWaitedForPlayers() ?? [];
        const gameStateChanged = this.checkGameStateChanged();
        this.ingameGameState?.setWaitedForPlayers(gameStateChanged ? notWaitedAnymore : []);

        this.doPlayerClocksHandling();

        this.saveGame(updateLastActive);
    }

    doPlayerClocksHandling(): void {
        if (!this.gameSettings.onlyLive || !this.ingameGameState) {
            return;
        }

        const waitedPlayers = this.leafState.getWaitedUsers().map(u => (this.ingameGameState as IngameGameState).players.get(u));
        const notWaitedPlayers = _.difference(this.ingameGameState.players.values, waitedPlayers);

        if (!this.ingameGameState.paused) {
            waitedPlayers.forEach(p => {
                if (!p.liveClockData) {
                    throw new Error("LiveClockData must be present in doPlayerClocksHandling");
                }

                // If timer is already running but player is still active, do nothing
                if (p.liveClockData.timerStartedAt == null) {
                    if (p.liveClockData.remainingSeconds > 0) {
                        p.liveClockData.serverTimer = setTimeout(() => { this.ingameGameState?.onPlayerClockTimeout(p) }, p.liveClockData.remainingSeconds * 1000);
                        p.liveClockData.timerStartedAt = new Date();

                        this.broadcastToClients({
                            type: "start-player-clock",
                            remainingSeconds: p.liveClockData.remainingSeconds,
                            timerStartedAt: p.liveClockData.timerStartedAt.getTime(),
                            userId: p.user.id
                        });
                    } else {
                        this.ingameGameState?.onPlayerClockTimeout(p);
                    }
                }
            });
        }

        notWaitedPlayers.forEach(p => {
            if (!p.liveClockData) {
                throw new SnrError(this, "LiveClockData must be present in doPlayerClocksHandling");
            }

            if (p.liveClockData.timerStartedAt) {
                if (!p.liveClockData.serverTimer) {
                    throw new SnrError(this, "serverTimer must be present in doPlayerClocksHandling");
                }

                // Stop the timer
                clearTimeout(p.liveClockData.serverTimer);
                p.liveClockData.serverTimer = null;

                // This user is no longer waited for
                // Calculate new remainingSeconds and broadcast to clients
                p.liveClockData.remainingSeconds -= getElapsedSeconds(p.liveClockData.timerStartedAt);
                p.liveClockData.remainingSeconds = Math.max(0, p.liveClockData.remainingSeconds);
                p.liveClockData.timerStartedAt = null;

                this.broadcastToClients({
                    type: "stop-player-clock",
                    remainingSeconds: p.liveClockData.remainingSeconds,
                    userId: p.user.id
                });
            }
        });
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "game-state-change") {
            // Get the GameState for whose the childGameState must change
            const parentGameState = this.getGameStateNthLevelDown(message.level - 1);

            const newChildGameState = parentGameState.deserializeChildGameState(message.serializedGameState);

            this.checkGameStatesFastTracked(parentGameState, newChildGameState);

            parentGameState.childGameState = newChildGameState;

            this.leafStateId = message.newLeafId;
            if (this.onClientGameStateChange) {
                this.onClientGameStateChange();
            }
        } else if (message.type == "new-user") {
            const user = User.deserializeFromServer(this, message.user);

            this.users.set(user.id, user);
        } else if (message.type == "settings-changed") {
            const user = this.users.get(message.user);

            user.settings = message.settings;
        } else if (message.type == "game-settings-changed") {
            this.gameSettings = message.settings;
        } else if (message.type == "update-connection-status") {
            const user = this.users.get(message.user);
            user.connected = message.status;
        } else if (message.type == "update-other-users-with-same-ip") {
            const user = this.users.get(message.user);
            user.otherUsersFromSameNetwork = message.otherUsers;
        } else if (message.type == "hide-or-reveal-user-names") {
            message.names.forEach(([uid, name]) => this.users.get(uid).name = name);
        } else if (message.type == "game-started") {
            if (this.onGameStarted) {
                this.onGameStarted();
            }
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    checkGameStatesFastTracked(parentGameState: GameState<any, any>, newChildGameState: GameState<any, any>): void {
        // Wait 5 seconds when CombatGameState was completely fast-tracked to show the battle results via the CombatInfoComponent
        if (this.hasChildGameState(CombatGameState) &&
                // Only do it when there is no PostCombatGameState in the tree as PostCombat shows the dialog already
                !this.hasChildGameState(PostCombatGameState) &&
                !parentGameState.hasParentGameState(CombatGameState) &&
                !newChildGameState.hasChildGameState(CombatGameState)) {

            if (this.onCombatFastTracked) {
                const combat = this.getChildGameState(CombatGameState) as CombatGameState;
                this.onCombatFastTracked(combat.stats);
            }
        }

        // Wait 5 seconds when WildlingsAttackGameState was completely fast-tracked to show the revealed Wildling card
        if (this.hasChildGameState(WildlingsAttackGameState) &&
                !parentGameState.hasParentGameState(WildlingsAttackGameState) &&
                !newChildGameState.hasChildGameState(WildlingsAttackGameState)) {

            // We can identify if it was fast-tracked if the current child state is Bidding or SimpleChoice (= Resolving ties).
            // As we checked earlier that WildlingsAttackGameState is no longer part of the tree we now know that no other WildlingsAttack
            // child state was set which would have shown the revealed Wildling card to the clients.
            const wildlings = this.getChildGameState(WildlingsAttackGameState) as WildlingsAttackGameState;
            if (wildlings.childGameState instanceof BiddingGameState || wildlings.childGameState instanceof SimpleChoiceGameState) {
                if (this.onWildingsAttackFastTracked && wildlings.wildlingCard) {
                    this.onWildingsAttackFastTracked(wildlings.wildlingCard.type, wildlings.biddingResults,  wildlings._highestBidder, wildlings._lowestBidder);
                }
            }
        }
    }

    broadcastToClients(message: ServerMessage, ...except: User[]): void {
        this.sendMessageToClients(_.difference(this.users.values, except), message);
    }

    sendMessageToServer(message: ClientMessage): void {
        if (this.onSendClientMessage) {
            this.onSendClientMessage(message);
        }
    }

    broadcastCustomToClients(craftMessage: (u: User) => ServerMessage): void {
        this.users.values.forEach(u => {
            if (u.connected) {
                this.sendMessageToClients([u], craftMessage(u));
            }
        });
    }

    sendMessageToClients(users: User[], message: ServerMessage): void {
        if (this.onSendServerMessage) {
            this.onSendServerMessage(users, message);
        }
    }

    getStateOfGame(): string {
        if (this.childGameState instanceof LobbyGameState) {
            return "IN_LOBBY";
        } else if (this.childGameState instanceof IngameGameState) {
            const ingame = this.childGameState;
            if (ingame.isEnded) {
                return "FINISHED";
            } else if (ingame.isCancelled) {
                return "CANCELLED";
            }
            return "ONGOING";
        } else {
            return "CANCELLED";
        }
    }

    getViewOfGame(): any {
        // Creating a view of the current turn of the game
        const turn = this.ingameGameState?.game.turn ?? -1;
        const maxPlayerCount = this.gameSettings.playerCount;
        const settings = this.gameSettings;
        const _waitingFor = (this.ingameGameState?.leafState.getWaitedUsers().map(u =>
            this.ingameGameState?.players.tryGet(u, null) ?? null)
                .filter(p => p != null).map((p: Player) => ({
                    house: p.house.name,
                    user: p.user
                })) ?? []);
        const waitingFor = _waitingFor.map(wf => `${wf.house}${this.gameSettings.faceless ? "" : (` (${wf.user.name})`)}`).join(", ");
        const waitingForIds = _waitingFor.map(wf => wf.user.id);
        let winner: any = null;
        if (this.ingameGameState?.leafState instanceof GameEndedGameState) {
            const user = this.ingameGameState.getControllerOfHouse(this.ingameGameState.leafState.winner).user;
            winner = `${user.name} (${this.ingameGameState.leafState.winner.name})`;
        }

        const replacePlayerVoteOngoing = (this.ingameGameState?.votes.values.filter(v =>
            v.state == VoteState.ONGOING && (v.type instanceof ReplacePlayer || v.type instanceof ReplacePlayerByVassal)).length ?? -1) > 0;

        const oldPlayerIds = this.entireGame.ingameGameState?.oldPlayerIds ?? [];
        const timeoutPlayerIds = this.entireGame.ingameGameState?.timeoutPlayerIds ?? [];
        const replacerIds = this.entireGame.ingameGameState?.replacerIds ?? [];

        return {
            turn,
            maxPlayerCount,
            settings,
            waitingFor,
            waitingForIds,
            winner,
            replacePlayerVoteOngoing,
            oldPlayerIds,
            timeoutPlayerIds,
            replacerIds,
            publicChatRoomId: this.publicChatRoomId
        };
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    getPlayersInGame(): {userId: string; data: object}[] {
        // eslint-disable-next-line @typescript-eslint/ban-types
        const players: {userId: string; data: object}[] = [];
        if (this.childGameState instanceof LobbyGameState) {
            this.childGameState.players.forEach((user, house) => {
                // If the game is in "randomize house" mode, don't specify any houses in the PlayerInGame data
                const playerData: {[key: string]: any} = {};

                if (!this.gameSettings.randomHouses && !this.gameSettings.randomChosenHouses) {
                    playerData["house"] = house.id;
                }

                players.push({
                    userId: user.id,
                    data: playerData
                });
            });
        } else if (this.childGameState instanceof IngameGameState) {
            const ingame = this.childGameState as IngameGameState;
            const waitedForUsers = ingame.getWaitedUsers();

            ingame.players.forEach((player, user) => {
                // "Important chat rooms" are chat rooms where unseen messages will display
                // a badge next to the game in the website.
                // In this case, it's all private rooms with this player in it. The next line
                // fetches the list of private chat rooms, the website will take care of
                // showing the badge or not, based on whether there are unseen messages.
                const importantChatRooms = this.getPrivateChatRoomsOf(user);

                players.push({
                    userId: user.id,
                    data: {
                        "house": player.house.id,
                        "waited_for": waitedForUsers.includes(user),
                        "important_chat_rooms": importantChatRooms.map(cr => cr.roomId),
                        "is_winner": ingame.childGameState instanceof GameEndedGameState ? ingame.childGameState.winner == player.house : false,
                        "needed_for_vote": player.isNeededForVote
                    }
                });
            });
        }

        return players;
    }

    updateGameSettings(settings: GameSettings): void {
        this.sendMessageToServer({
            type: "change-game-settings",
            settings
        });
    }

    getPrivateChatRoomsOf(user: User): {user: User; roomId: string}[] {
        return _.flatMap(this.privateChatRoomsIds
            .map((u1, bm) => bm.entries
                // Only get the private chat rooms that contains the authenticated player
                .filter(([u2, _]) => u1 == user || u2 == user)
                .map(([u2, roomId]) => {
                    const otherUser = user == u1 ? u2 : u1;

                    return {user: otherUser, roomId};
                })
        ));
    }

    hideOrRevealUserNames(revealForever: boolean): void {
        if (revealForever) {
            this.gameSettings.faceless = false;
        }

        this.broadcastToClients({
            type: "hide-or-reveal-user-names",
            names: this.users.values.map(u => u.serializeToClient(false, null, this.gameSettings.faceless)).map(su => [su.id, su.name])
        });
    }

    private privateSaveGame(updateLastActive: boolean): void {
        if (this.onSaveGame) {
            this.onSaveGame(updateLastActive);
        }
    }

    serializeToClient(user: User | null): SerializedEntireGame {
        const admin = user == null;

        return {
            id: this.id,
            name: this.name,
            users: this.users.values.map(u => u.serializeToClient(admin, user, this.gameSettings.faceless)),
            ownerUserId: this.ownerUserId,
            publicChatRoomId: this.publicChatRoomId,
            gameSettings: this.gameSettings,
            privateChatRoomIds: this.privateChatRoomsIds.map((u1, v) => [u1.id, v.map((u2, rid) => [u2.id, rid])]),
            leafStateId: this.leafStateId,
            childGameState: this.childGameState.serializeToClient(admin, user)
        };
    }

    static deserializeFromServer(data: SerializedEntireGame): EntireGame {
        const entireGame = new EntireGame(data.id, data.ownerUserId, data.name);

        entireGame.users = new BetterMap<string, User>(data.users.map(ur => [ur.id, User.deserializeFromServer(entireGame, ur)]));
        entireGame.ownerUserId = data.ownerUserId;
        entireGame.publicChatRoomId = data.publicChatRoomId;
        entireGame.gameSettings = data.gameSettings;
        entireGame.privateChatRoomsIds = new BetterMap(data.privateChatRoomIds.map(([uid1, bm]) => [
            entireGame.users.get(uid1),
            new BetterMap(bm.map(([uid2, roomId]) => [entireGame.users.get(uid2), roomId]))
        ]));

        entireGame.leafStateId = data.leafStateId;
        entireGame.childGameState = entireGame.deserializeChildGameState(data.childGameState);

        return entireGame;
    }

    deserializeChildGameState(data: SerializedEntireGame["childGameState"]): this["childGameState"] {
        if (data.type == "lobby") {
            return LobbyGameState.deserializeFromServer(this, data);
        } else if (data.type == "ingame") {
            return IngameGameState.deserializeFromServer(this, data);
        } else if (data.type == "cancelled") {
            return CancelledGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedEntireGame {
    id: string;
    name: string;
    users: SerializedUser[];
    ownerUserId: string;
    childGameState: SerializedLobbyGameState | SerializedIngameGameState | SerializedCancelledGameState;
    publicChatRoomId: string;
    privateChatRoomIds: [string, [string, string][]][];
    gameSettings: GameSettings;
    leafStateId: string;
}

export interface GameSettings {
    setupId: string;
    playerCount: number;
    pbem: boolean;
    onlyLive: boolean;
    startWhenFull: boolean;
    private: boolean;
    randomHouses: boolean;
    randomChosenHouses: boolean;
    adwdHouseCards: boolean;
    asosHouseCards: boolean;
    cokWesterosPhase: boolean;
    vassals: boolean;
    seaOrderTokens: boolean;
    allowGiftingPowerTokens: boolean;
    ironBank: boolean;
    tidesOfBattle: boolean;
    draftHouseCards: boolean;
    thematicDraft: boolean;
    limitedDraft: boolean;
    blindDraft: boolean;
    endless: boolean;
    useVassalPositions: boolean;
    precedingMustering: boolean;
    mixedWesterosDeck1: boolean;
    removeTob3: boolean;
    removeTobSkulls: boolean;
    limitTob2: boolean;
    faceless: boolean;
    randomStartPositions: boolean;
    addPortToTheEyrie: boolean;
    victoryPointsCountNeededToWin: number;
    loyaltyTokenCountNeededToWin: number;
    randomVassalAssignment: boolean;
    customBalancing: boolean;
    houseCardsEvolution: boolean;
    initialLiveClock: number;
    noPrivateChats: boolean;
    tournamentMode: boolean;
    fixedClock: boolean;
    holdVictoryPointsUntilEndOfRound: boolean;
    fogOfWar: boolean;
}
