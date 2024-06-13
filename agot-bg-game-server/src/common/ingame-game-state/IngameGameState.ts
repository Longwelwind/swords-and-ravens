import EntireGame, { NotificationType } from "../EntireGame";
import GameState, { AnyGameState } from "../GameState";
import {ClientMessage} from "../../messages/ClientMessage";
import {ServerMessage} from "../../messages/ServerMessage";
import User from "../../server/User";
import World from "./game-data-structure/World";
import Player, {SerializedPlayer} from "./Player";
import Region, { RegionSnapshot } from "./game-data-structure/Region";
import PlanningGameState, {SerializedPlanningGameState} from "./planning-game-state/PlanningGameState";
import ActionGameState, {SerializedActionGameState} from "./action-game-state/ActionGameState";
import Order from "./game-data-structure/Order";
import Game, {SerializedGame} from "./game-data-structure/Game";
import WesterosGameState, {SerializedWesterosGameState} from "./westeros-game-state/WesterosGameState";
import createGame, { applyChangesForDanceWithMotherOfDragons, applyChangesForDragonWar, ensureDragonStrengthTokensArePresent } from "./game-data-structure/createGame";
import BetterMap from "../../utils/BetterMap";
import House from "./game-data-structure/House";
import Unit from "./game-data-structure/Unit";
import PlanningRestriction from "./game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import GameLogManager, {SerializedGameLogManager} from "./game-data-structure/GameLogManager";
import {GameLogData} from "./game-data-structure/GameLog";
import GameEndedGameState, {SerializedGameEndedGameState} from "./game-ended-game-state/GameEndedGameState";
import UnitType from "./game-data-structure/UnitType";
import WesterosCard from "./game-data-structure/westeros-card/WesterosCard";
import Vote, { SerializedVote, VoteState } from "./vote-system/Vote";
import VoteType, { CancelGame, EndGame, ExtendPlayerClocks, PauseGame, ReplacePlayer, ReplacePlayerByVassal, ReplaceVassalByPlayer, ResumeGame, SwapHouses, DeclareWinner } from "./vote-system/VoteType";
import { v4 } from "uuid";
import CancelledGameState, { SerializedCancelledGameState } from "../cancelled-game-state/CancelledGameState";
import HouseCard from "./game-data-structure/house-card/HouseCard";
import { observable } from "mobx";
import _ from "lodash";
import DraftHouseCardsGameState, { houseCardCombatStrengthAllocations, SerializedDraftHouseCardsGameState } from "./draft-house-cards-game-state/DraftHouseCardsGameState";
import CombatGameState from "./action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import DeclareSupportGameState from "./action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import ThematicDraftHouseCardsGameState, { SerializedThematicDraftHouseCardsGameState } from "./thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";
import shuffle from "../../utils/shuffle";
import shuffleInPlace from "../../utils/shuffleInPlace";
import popRandom from "../../utils/popRandom";
import LoanCard from "./game-data-structure/loan-card/LoanCard";
import PayDebtsGameState, { SerializedPayDebtsGameState } from "./pay-debts-game-state/PayDebtsGameState";
import { objectiveCards } from "./game-data-structure/static-data-structure/objectiveCards";
import ChooseInitialObjectivesGameState, { SerializedChooseInitialObjectivesGameState } from "./choose-initial-objectives-game-state/ChooseInitialObjectivesGameState";
import facelessMenNames from "../../../data/facelessMenNames.json";
import WildlingCardEffectInTurnOrderGameState from "./westeros-game-state/wildlings-attack-game-state/WildlingCardEffectInTurnOrderGameState";
import getElapsedSeconds from "../../utils/getElapsedSeconds";
import orders from "./game-data-structure/orders";
import { OrderOnMapProperties, UnitOnMapProperties } from "../../client/MapControls";
import houseCardAbilities from "./game-data-structure/house-card/houseCardAbilities";
import SnrError from "../../utils/snrError";
import { TakeOverPort, findOrphanedShipsAndDestroyThem, isTakeControlOfEnemyPortRequired } from "./port-helper/PortHelper";
import { dragon } from "./game-data-structure/unitTypes";

export const NOTE_MAX_LENGTH = 5000;

export const enum ReplacementReason {
    VOTE,
    CLOCK_TIMEOUT
}

export interface UnitLossConsequence {
    victoryConditionsFulfilled?: true;
    takeOverPort?: TakeOverPort;
}

export default class IngameGameState extends GameState<
    EntireGame,
    WesterosGameState | PlanningGameState | ActionGameState | CancelledGameState | GameEndedGameState
    | DraftHouseCardsGameState | ThematicDraftHouseCardsGameState | PayDebtsGameState
    | ChooseInitialObjectivesGameState
> {
    players: BetterMap<User, Player> = new BetterMap();
    oldPlayerIds: string[] = [];
    replacerIds: string[] = [];
    timeoutPlayerIds: string[] = [];
    @observable housesTimedOut: House[] = [];
    game: Game;
    gameLogManager: GameLogManager = new GameLogManager(this);
    @observable ordersOnBoard: BetterMap<Region, Order> = new BetterMap();
    @observable visibleRegionsPerPlayer: BetterMap<Player, Region[]> = new BetterMap();
    @observable publicVisibleRegions: Region[] = [];

    votes: BetterMap<string, Vote> = new BetterMap();
    @observable paused: Date | null = null;
    @observable willBeAutoResumedAt: Date | null = null;

    @observable bannedUsers: Set<string> = new Set();

    // Server-side only
    autoResumeTimeout: NodeJS.Timeout | null = null;

    // Client-side only
    @observable rerender = 0;
    @observable marchMarkers: BetterMap<Unit, Region> = new BetterMap();
    @observable unitsToBeAnimated: BetterMap<Unit, UnitOnMapProperties> = new BetterMap();
    @observable ordersToBeAnimated: BetterMap<Region, OrderOnMapProperties> = new BetterMap();

    onVoteStarted: (() => void) | null = null;
    onPreemptiveRaidNewAttack: ((biddings: [number, House[]][], highestBidder: House) => void) | null = null;
    onLogReceived: ((log: GameLogData) => void) | null = null;

    get entireGame(): EntireGame {
        return this.parentGameState;
    }

    get world(): World {
        return this.game.world;
    }

    get actionState(): ActionGameState | null {
        return this.childGameState as ActionGameState;
    }

    get sortedByLeadingPlayers(): Player[] {
        return this.game.getPotentialWinners().map(h => this.getControllerOfHouse(h));
    }

    get isEnded(): boolean {
        return this.childGameState instanceof GameEndedGameState;
    }

    get isCancelled(): boolean {
        return this.childGameState instanceof CancelledGameState;
    }

    get isEndedOrCancelled(): boolean {
        return this.isEnded || this.isCancelled;
    }

    get fogOfWar(): boolean {
        return this.entireGame.gameSettings.fogOfWar;
    }

    get isDragonGame(): boolean {
        return this.entireGame.gameSettings.playerCount == 8 ||
            this.entireGame.gameSettings.dragonWar ||
            (this.entireGame.gameSettings.dragonRevenge
                && _.some(_.flatMap(this.world.regions.values.map(r => r.units.values)), u => u.type.id == "dragon"));
    }

    constructor(entireGame: EntireGame) {
        super(entireGame);

        entireGame.onBeforeGameStateChangedTransmitted = () => {
            this.updateVisibleRegions();
        }
    }

    beginGame(housesToCreate: string[], futurePlayers: BetterMap<string, User>): void {
        this.entireGame.broadcastToClients({
            type: "game-started"
        });

        this.game = createGame(this, housesToCreate, futurePlayers.keys);
        this.players = new BetterMap(futurePlayers.map((house, user) => [user, new Player(user, this.game.houses.get(house))]));

        if (this.fogOfWar) {
            this.players.values.forEach(p => this.visibleRegionsPerPlayer.set(p, this.calculateVisibleRegionsForPlayer(p)));
        }

        if (this.entireGame.isDanceWithMotherOfDragons) {
            applyChangesForDanceWithMotherOfDragons(this);
        }

        if (this.entireGame.gameSettings.dragonWar) {
            applyChangesForDragonWar(this);
        }

        if (this.entireGame.gameSettings.dragonRevenge) {
            ensureDragonStrengthTokensArePresent(this);
        }

        if (this.game.dragonStrengthTokens.length == 4) {
            // If the dragons will only raise in 4 rounds instead of 5 (6 round only scenarios)
            // we push one dummy token from round 10 to removed tokens for correct calculation.
            this.game.removedDragonStrengthTokens.push(10);
        }

        if (this.entireGame.gameSettings.onlyLive) {
            this.players.values.forEach(p => p.liveClockData = {
                remainingSeconds: this.entireGame.gameSettings.initialLiveClock * 60,
                timerStartedAt: null,
                serverTimer: null
            });
        }

        // In the past we always used the supply limits from the game setup, though we simply could have calculated them
        // as every house starts according to their controlled barrels.
        // For the custom settings "Random Start Positions" and "Vassal Start Positions"
        // we now have to calculate the supply limits of player houses in the beginning. (Vassals always start at supply level 4)
        this.game.nonVassalHouses.forEach(h =>  {
            h.supplyLevel = Math.min(this.game.supplyRestrictions.length - 1, this.game.getControlledSupplyIcons(h));
        });

        this.log({
            type: "user-house-assignments",
            assignments: futurePlayers.map((house, user) => [house, user.id]) as [string, string][]
        });

        if (this.entireGame.gameSettings.draftHouseCards) {
            this.beginDraftingHouseCards();
        } else if (this.entireGame.isFeastForCrows) {
            this.chooseObjectives();
        } else {
            this.beginNewRound();
        }
    }

    assignNewFacelessNames(): void {
        if (this.entireGame.gameSettings.faceless) {
            const facelessNames: string[] = [...facelessMenNames];
            this.players.values.forEach(p => p.user.facelessName = popRandom(facelessNames) ?? p.user.facelessName);
            this.entireGame.hideOrRevealUserNames(false);
        }
    }

    chooseObjectives(): void {
        this.setChildGameState(new ChooseInitialObjectivesGameState(this)).firstStart();
    }

    onChooseInitialObjectivesGameStateEnd(): void {
        this.beginNewRound();
    }

    beginDraftingHouseCards(): void {
        if (this.entireGame.gameSettings.thematicDraft) {
            this.setChildGameState(new ThematicDraftHouseCardsGameState(this)).firstStart();
        } else if (this.entireGame.gameSettings.blindDraft || this.entireGame.gameSettings.randomDraft) {
            houseCardCombatStrengthAllocations.entries.forEach(([hcStrength, count]) => {
                for(let i=0; i<count; i++) {
                    this.players.values.forEach(p => {
                        const house = p.house;
                        const availableCards = this.game.draftableHouseCards.values.filter(hc => hc.combatStrength == hcStrength);
                        const houseCard = popRandom(availableCards) as HouseCard;
                        house.houseCards.set(houseCard.id, houseCard);
                        this.game.draftableHouseCards.delete(houseCard.id);
                    });
                }
            });

            this.game.draftableHouseCards.clear();

            do {
                this.setInfluenceTrack(0, this.getRandomInitialInfluenceTrack());
                this.setInfluenceTrack(1, this.getRandomInitialInfluenceTrack());
                // Move blade holder to bottom of kings court
                this.setInfluenceTrack(2, this.getRandomInitialInfluenceTrack(this.game.valyrianSteelBladeHolder));
            } while (this.hasAnyHouseTooMuchDominanceTokens());

            this.onDraftingFinish();
        } else {
            this.setChildGameState(new DraftHouseCardsGameState(this)).firstStart();
        }
    }

    setInfluenceTrack(i: number, track: House[]): House[] {
        const fixedTrack = this.getFixedInfluenceTrack(track);
        if (i == 0) {
            this.game.ironThroneTrack = fixedTrack;
        } else if (i == 1) {
            this.game.fiefdomsTrack = fixedTrack;
        } else if (i == 2) {
            this.game.kingsCourtTrack = fixedTrack;
        } else {
            throw new Error();
        }

        this.entireGame.broadcastToClients({
            type: "change-tracker",
            trackerI: i,
            tracker: fixedTrack.map(h => h.id)
        });

        return fixedTrack;
    }

    getFixedInfluenceTrack(track: House[]): House[] {
        if (!this.game.targaryen) {
            return track;
        }

        return _.concat(_.without(track, this.game.targaryen), this.game.targaryen);
    }

    getRandomInitialInfluenceTrack(moveToBottom: House | null = null): House[] {
        let track = shuffleInPlace(this.game.houses.values);

        if (moveToBottom) {
            track = _.without(track, moveToBottom);
            track.push(moveToBottom);
        }

        const playerHouses = this.players.values.map(p => p.house);
        const areVassalsInTopThreeSpaces = _.take(track, 3).some(h => !playerHouses.includes(h));

        if (areVassalsInTopThreeSpaces) {
            const vassals = track.filter(h => !playerHouses.includes(h));
            const newTrack = _.difference(track, vassals);
            newTrack.push(...vassals);
            return newTrack;
        }

        return track;
    }

    private hasAnyHouseTooMuchDominanceTokens(): boolean {
        const uniqDominanceHolders = _.uniq(this.game.influenceTracks.map(track => this.game.getTokenHolder(track)));

        switch (this.players.size) {
            case 0:
                throw new Error("Games with 0 players cannot start");
            case 1:
                // Ensure a single player can hold all 3 dominance tokens in a debug game:
                return false;
            case 2:
                // Ensure a player does not get all dominance tokens in 2p games
                // With Targaryen the other player can hold all 3 tokens.
                return this.game.targaryen ? uniqDominanceHolders.length != 1 : uniqDominanceHolders.length != 2;
            case 3:
                // Ensure every dominance token is held by another house
                // With Targaryen the other player can hold all 3 tokens.
                return this.game.targaryen ? uniqDominanceHolders.length != 2 : uniqDominanceHolders.length != 3;
            default:
                // Ensure every dominance token is held by another house
                return uniqDominanceHolders.length != 3;
        }
    }

    log(data: GameLogData, resolvedAutomatically = false): void {
        this.gameLogManager.log(data, resolvedAutomatically);
    }

    onDraftingFinish(): void {
        if (this.entireGame.isFeastForCrows) {
            this.chooseObjectives();
        } else {
            this.beginNewRound();
        }
    }

    onActionGameStateFinish(): void {
        this.beginNewRound();
    }

    onWesterosGameStateFinish(planningRestrictions: PlanningRestriction[], revealedWesterosCards: WesterosCard[]): void {
        this.proceedPlanningGameState(planningRestrictions, revealedWesterosCards);
    }

    proceedPlanningGameState(planningRestrictions: PlanningRestriction[] = [], revealedWesterosCards: WesterosCard[] = []): void {
        this.game.vassalRelations = new BetterMap();
        this.broadcastVassalRelations();
        this.updateVisibleRegions(true);
        this.setChildGameState(new PlanningGameState(this)).firstStart(planningRestrictions, revealedWesterosCards);
    }

    proceedToActionGameState(placedOrders: BetterMap<Region, Order>, planningRestrictions: PlanningRestriction[]): void {
        this.ordersOnBoard = placedOrders;
        const mappedOrders = placedOrders.mapOver(r => r.id, o => o.id);

        if (!this.fogOfWar) {
            this.entireGame.broadcastToClients({
                type: "reveal-orders",
                orders: mappedOrders
            });
        } else {
            this.entireGame.users.values.forEach(u => {
                const p = this.players.tryGet(u, null);
                const visibleRegionIds = this.getVisibleRegionsForPlayer(p).map(r => r.id);
                this.entireGame.sendMessageToClients([u], {
                    type: "reveal-orders",
                    orders: mappedOrders.filter(([rid, _oid]) => visibleRegionIds.includes(rid))
                });
            });
        }

        this.setChildGameState(new ActionGameState(this)).firstStart(planningRestrictions);
    }

    beginNewRound(): void {
        if (this.checkVictoryConditions(true)) {
            return;
        }

        if (this.game.turn == this.game.maxTurns) {
            const winner = this.game.getPotentialWinner(true);
            this.setChildGameState(new GameEndedGameState(this)).firstStart(winner);
            return;
        }

        if (this.ordersOnBoard.size > 0) {
            this.entireGame.broadcastToClients({
                type: "remove-orders",
                regions: this.ordersOnBoard.keys.map(r => r.id)
            });

            this.ordersOnBoard.clear();
        }

        if (this.game.ironBank) {
            this.game.ironBank.drawNewLoanCard();
        }

        if (this.game.turn != 0 && this.game.turn % 10 == 0) {
            // Refresh Westeros deck 3 after every 10th round
            const deck3 = this.game.westerosDecks[2];
            deck3.forEach(wc => wc.discarded = false);
            this.game.westerosDecks[2] = shuffle(deck3);

            this.broadcastWesterosDecks();

            // Reshuffle the wildling deck
            this.game.wildlingDeck = shuffle(this.game.wildlingDeck);
            this.game.houses.forEach(h => h.knowsNextWildlingCard = false);
            this.entireGame.broadcastToClients({type: "hide-top-wildling-card"});

            // Reshuffle the loan deck
            if (this.game.ironBank) {
                shuffleInPlace(this.game.ironBank.loanCardDeck);
                this.game.ironBank.loanCardDeck.forEach(lc => lc.discarded = false);
                this.game.ironBank.sendUpdateLoanCards();
            }
        }

        this.game.turn++;
        this.log({type: "turn-begin", turn: this.game.turn});

        this.game.valyrianSteelBladeUsed = false;

        // Unwound each units
        this.world.regions.forEach(r => r.units.forEach(u => u.wounded = false));

        for (let i = 0; i < this.game.winterIsComingHappened.length; i++) {
            this.game.winterIsComingHappened[i] = false;
        }

        this.entireGame.broadcastToClients({
            type: "new-turn"
        });

        this.publicVisibleRegions = [];

        this.entireGame.users.values.filter(u => u.connected).forEach(u => {
            this.entireGame.sendMessageToClients([u], {
                type: "update-public-visible-regions",
                regionsToMakeVisible: [],
                ordersToMakeVisible: [],
                clear: true,
                applyChangesNow: !this.players.has(u)
            });
        });

        this.updateVisibleRegions(true);

        if (this.game.turn > 1) {
            const unpaidInterest = this.game.ironBank?.payInterest() ?? []
            if (unpaidInterest.length == 0) {
                this.setChildGameState(new WesterosGameState(this)).firstStart();
            } else {
                this.setChildGameState(new PayDebtsGameState(this)).firstStart(unpaidInterest);
            }
        } else if (this.entireGame.isDanceWithMotherOfDragons) {
            // Reveal top 3 Westeros deck 4 cards
            this.setChildGameState(new WesterosGameState(this)).firstStart(true);
        } else {
            // No Westeros phase during the first turn
            this.proceedPlanningGameState();
        }
    }

    onPayDebtsGameStateFinish(): void {
        // The decider may remove a unit in an enemy home town.
        // If the enemy regains this castle, he might win the game.
        if (this.checkVictoryConditions()) {
            return;
        }

        this.updateVisibleRegions(true);
        this.setChildGameState(new WesterosGameState(this)).firstStart();
    }

    gainLoyaltyTokens(): void {
        const targaryen = this.game.targaryen;
        if (targaryen) {
            this.world.regions.values.filter(r => r.loyaltyTokens > 0 && r.getController() == targaryen).forEach(r => {
                targaryen.victoryPoints += r.loyaltyTokens;

                this.entireGame.broadcastToClients({
                    type: "loyalty-token-gained",
                    newLoyaltyTokenCount: targaryen.victoryPoints,
                    region: r.id
                });

                this.log({
                    type: "loyalty-token-gained",
                    count: r.loyaltyTokens,
                    region: r.id
                });

                r.loyaltyTokens = 0;
            });
        }
    }

    getFreeFacelessName(): string | null {
        const freeFacelessNames: string[] = _.difference(facelessMenNames, this.players.values.map(p => p.user.facelessName));
        return popRandom(freeFacelessNames);
    }

    cancelPendingReplaceVotes(): void {
        this.votes.values.forEach(v => {
            if (v.state == VoteState.ONGOING && v.isReplaceVoteType) {
                v.cancelVote();
            }
        });
    }

    onClientMessage(user: User, message: ClientMessage): boolean {
        if (message.type == "launch-replace-player-vote") {
            const player = this.players.get(this.entireGame.users.get(message.player));

            if (!this.canLaunchReplacePlayerVote(user).result) {
                return false;
            }

            this.createVote(user, new ReplacePlayer(user, player.user, player.house));
        } else if (message.type == "launch-replace-vassal-by-player-vote") {
            const house = this.game.houses.get(message.house);

            if (!this.canLaunchReplaceVassalVote(user, house).result) {
                return false;
            }

            this.createVote(user, new ReplaceVassalByPlayer(user, house));
        } else if (message.type == "game-log-seen") {
            this.gameLogManager.lastSeenLogTimes.set(user, message.time);
        } else if (message.type == "ban-user") {
            if (this.entireGame.onGetUser != null && this.entireGame.canActAsOwner(user) && !this.players.keys.map(u => u.id).includes(message.userId)) {
                this.entireGame.onGetUser(message.userId).then(storedData => {
                    if (!storedData || storedData.groups.some(g => g.name == "Admin" || g.name == "High Member")) {
                        return;
                    }

                    this.bannedUsers.add(message.userId);
                    this.entireGame.broadcastToClients({
                        type: "user-banned",
                        userId: message.userId
                    });
                });
            }
        } else if (message.type == "unban-user") {
            if (this.entireGame.canActAsOwner(user)) {
                this.bannedUsers.delete(message.userId);
                this.entireGame.broadcastToClients({
                    type: "user-unbanned",
                    userId: message.userId
                });
            }
        } else if (this.players.has(user)) {
            const player = this.players.get(user);

            this.onPlayerMessage(player, message);
            return !message.type.includes("vote");
        }

        return false;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "vote") {
            const vote = this.votes.get(message.vote);

            if (vote.state != VoteState.ONGOING ||
                !vote.participatingHouses.includes(player.house) ||
                !vote.canVote.result) {
                return;
            }

            vote.votes.set(player.house, message.choice);

            this.entireGame.broadcastToClients({
                type: "vote-done",
                vote: vote.id,
                voter: player.house.id,
                choice: message.choice
            });

            vote.checkVoteFinished();
        } else if (message.type == "launch-resume-game-vote") {
            if (this.canLaunchResumeGameVote(player).result) {
                this.createVote(
                    player.user,
                    new ResumeGame()
                );
            }
        }
        else if (message.type == "update-note") {
            player.user.note = message.note.substring(0, NOTE_MAX_LENGTH);
        } else if (message.type == "launch-swap-houses-vote") {
            const swappingPlayer = this.players.get(this.entireGame.users.get(message.swappingUser));
            if (this.canLaunchSwapHousesVote(player.user, swappingPlayer).result) {
                this.createVote(
                    player.user,
                    new SwapHouses(player.user, swappingPlayer.user, player.house, swappingPlayer.house)
                );
            }
        } else  if (message.type == "launch-cancel-game-vote") {
            if (this.canLaunchCancelGameVote(player).result) {
                this.createVote(
                    player.user,
                    new CancelGame()
                );
            }
        } else if (message.type == "launch-declare-winner-vote") {
            const winner = this.game.houses.get(message.winner);
            if (this.canLaunchDeclareWinnerVote(player.user)) {
                this.createVote(
                    player.user,
                    new DeclareWinner(winner)
                )
            }
        }

        if (this.paused) {
            return;
        }

        if (message.type == "launch-pause-game-vote") {
            if (this.canLaunchPauseGameVote(player).result) {
                this.createVote(
                    player.user,
                    new PauseGame()
                );
            }
        } else if (message.type == "launch-end-game-vote") {
            if (this.canLaunchEndGameVote(player).result) {
                this.createVote(
                    player.user,
                    new EndGame()
                );
            }
        } else if (message.type == "launch-extend-player-clocks-vote") {
            if (this.canLaunchExtendPlayerClocksVote(player).result) {
                this.createVote(
                    player.user,
                    new ExtendPlayerClocks()
                );
            }
        } else if (message.type == "launch-replace-player-by-vassal-vote") {
            const playerToReplace = this.players.get(this.entireGame.users.get(message.player));

            if (!this.canLaunchReplacePlayerVote(player.user, true).result) {
                return;
            }

            this.createVote(player.user, new ReplacePlayerByVassal(playerToReplace.user, playerToReplace.house));
        } else if (message.type == "gift-power-tokens") {
            if (!this.canGiftPowerTokens(player.house)) {
                return;
            }

            const toHouse = this.game.houses.get(message.toHouse);

            if (!this.isVassalHouse(toHouse)
                    && player.house != toHouse
                    && message.powerTokens > 0
                    && message.powerTokens <= player.house.powerTokens) {
                const delta = Math.abs(this.changePowerTokens(toHouse, message.powerTokens));
                this.changePowerTokens(player.house, -delta);
                this.log({
                    type: "power-tokens-gifted",
                    house: player.house.id,
                    affectedHouse: toHouse.id,
                    powerTokens: message.powerTokens
                });
            }
        } else if (message.type == "drop-power-tokens") {
            // Only allow Targ to drop their Power tokens
            if (player.house != this.game.targaryen || !this.isHouseDefeated(player.house)) {
                return;
            }

            this.changePowerTokens(player.house, -player.house.powerTokens);
        } else {
            this.childGameState.onPlayerMessage(player, message);
        }
    }

    setWaitedForPlayers(previouslyWaitedFor: Player[]): void {
        if (!this.entireGame.gameSettings.pbem) {
            return;
        }

        this.players.values.forEach(p => {
            const isWaitedFor = this.leafState.getWaitedUsers().includes(p.user);

            if (isWaitedFor && !p.waitedForData) {
                // We wait for the user now
                p.setWaitedFor(previouslyWaitedFor.includes(p));
            }
        });
    }

    resetAllWaitedForData(): void {
        this.players.values.forEach(p => p.resetWaitedFor());
    }

    checkWaitedForPlayers(): Player[] {
        const waitedUsers = this.leafState.getWaitedUsers();
        const notWaitedForAnymore: Player[] = [];
        this.players.values.forEach(p => {
            if (!p.waitedForData || p.waitedForData.handled) {
                // We are either still waiting for the user or  we are in a state like
                // PlaceOrders, ChooseHouseCards or Bidding, which allows changing the decision.
                // To make it totally perfect we would need to add the possibilty to delete
                // the last sent value and send a new one. But for now we just use the
                // response time value of the first user message that made him not-waited-for anymore.
                return;
            }

            if (!waitedUsers.includes(p.user) || p.waitedForData.leafStateId != this.entireGame.leafStateId) {
                // We don't wait for the user anymore, send their personal response time to the website
                p.sendPbemResponseTime();
                notWaitedForAnymore.push(p);
            }
        });

        return notWaitedForAnymore;
    }

    createVote(initiator: User, type: VoteType): Vote {
        const vote = new Vote(this, v4(), this.players.values.map(p => p.house), initiator, type);
        vote.type.onVoteCreated(vote);

        this.votes.set(vote.id, vote);

        this.entireGame.broadcastToClients({
            type: "vote-started",
            vote: vote.serializeToClient(false, null)
        });

        this.entireGame.notifyUsers(_.without(this.players.keys, initiator), NotificationType.NEW_VOTE_STARTED);

        return vote;
    }

    getControllerOfHouse(house: House): Player {
        if (this.isVassalHouse(house)) {
            const suzerainHouse = this.game.vassalRelations.tryGet(house, null);

            if (suzerainHouse == null) {
                throw new SnrError(this.entireGame, `getControllerOfHouse(${house.name}) failed as there is no suzerainHouse`);
            }

            return this.getControllerOfHouse(suzerainHouse);
        } else {
            const player = this.players.values.find(p => p.house == house);

            if (player == null) {
                throw new SnrError(this.entireGame, `getControllerOfHouse(${house.name}) failed due to a fatal error`);
            }

            return player;
        }
    }

    getNextInTurnOrder(house: House | null, except: House | null = null): House {
        const turnOrder = this.game.getTurnOrder();

        if (house == null) {
            return turnOrder[0];
        }

        const i = turnOrder.indexOf(house);

        const nextHouse = turnOrder[(i + 1) % turnOrder.length];

        if (nextHouse == except) {
            return this.getNextInTurnOrder(nextHouse);
        }

        return nextHouse;
    }

    getNextNonVassalInTurnOrder(house: House | null): House {
        house = this.getNextInTurnOrder(house);

        if (!this.isVassalHouse(house)) {
            return house;
        } else {
            return this.getNextNonVassalInTurnOrder(house);
        }
    }

    changePowerTokens(house: House, delta: number): number {
        if (this.isVassalHouse(house)) {
            return 0;
        }

        const originalValue = house.powerTokens;

        const powerTokensOnBoardCount = this.game.countPowerTokensOnBoard(house);
        const maxPowerTokenCount = house.maxPowerTokens - powerTokensOnBoardCount;

        house.powerTokens += delta;
        house.powerTokens = Math.max(0, Math.min(house.powerTokens, maxPowerTokenCount));

        this.entireGame.broadcastToClients({
            type: "change-power-token",
            houseId: house.id,
            powerTokenCount: house.powerTokens
        });

        return house.powerTokens - originalValue;
    }

    transformUnits(region: Region, units: Unit[], targetType: UnitType): Unit[] {
        this.broadcastRemoveUnits(region, units, false);

        const transformed = units.map(unit => {
            unit.region.units.delete(unit.id);

            const newUnit = this.game.createUnit(unit.region, targetType, unit.allegiance);
            newUnit.region.units.set(newUnit.id, newUnit);

            newUnit.wounded = unit.wounded;

            return newUnit;
        });

        this.broadcastAddUnits(region, transformed, true);

        return transformed;
    }

    checkVictoryConditions(isCheckAtEndOfRound = false): boolean {
        if (this.entireGame.gameSettings.holdVictoryPointsUntilEndOfRound && !isCheckAtEndOfRound) {
            return false;
        }

        if (this.game.areVictoryConditionsFulfilled()) {
            // Game is finished
            this.setChildGameState(new GameEndedGameState(this)).firstStart(this.game.getPotentialWinner());
            return true;
        } else {
            return false;
        }
    }

    onPlayerClockTimeout(player: Player): void {
        // Avoid this method to be called twice on the same player
        if (!this.players.has(player.user)) {
            if (this.entireGame.onCaptureSentryMessage) {
                this.entireGame.onCaptureSentryMessage(
                    `onPlayerClockTimeout was called twice for user ${player.user.name} (${player.user.id}). LiveClockData.remainingSeconds: ${player.liveClockData?.remainingSeconds}`,
                    "warning");
            }
            return;
        }

        // Use a try catch here as an exception in a timer callback seems to crash the server
        let updateLastActive = false;

        try {
            if (!player.liveClockData) {
                throw new SnrError(this.entireGame, "LiveClockData must be present in onPlayerClockTimeout");
            }

            this.endPlayerClock(player, false);

            if (this.players.size == 2) {
                // Replacing a vassal now could lead to an invalid state.
                // E.G. PayDebtsGameState will fail because there is no-one left to do the destroy units choice
                // When we are in combat, replacing vassal will fail, as there is no house left to assign the new vassal
                // Therefore we go to GameEnded first and then replace the last house with a vassal:

                const winner = _.without(this.players.values, player)[0].house;
                this.setChildGameState(new GameEndedGameState(this)).firstStart(winner);
                updateLastActive = true;
                this.entireGame.checkGameStateChanged();
            }

            // Vassal replacement during drafting would crash the game!
            // It's unlikely to happen, but if it does, let's handle it gracefully by ending the game
            // and declaring the player with the most time remaining the winner ...
            if (this.hasChildGameState(ThematicDraftHouseCardsGameState) || this.hasChildGameState(DraftHouseCardsGameState)) {
                // Determine winner by finding the one with the most time left. On draw normal tie breaker is applied.
                const winner = _.orderBy(this.game.getPotentialWinners().filter(h => h != player.house && !this.isVassalHouse(h)),
                    h => this.getControllerOfHouse(h).liveClockData?.remainingSeconds, "desc")[0];

                this.setChildGameState(new GameEndedGameState(this)).firstStart(winner);
                updateLastActive = true;
                return;
            }

            this.replacePlayerByVassal(player, ReplacementReason.CLOCK_TIMEOUT);
        } catch (e) {
            const message = typeof e === "string"
                ? e
                : e instanceof Error
                    ? e.message
                    : "Unknown error in onPlayerClockTimeout";
            console.error(message);
            if (this.entireGame.onCaptureSentryMessage) {
                this.entireGame.onCaptureSentryMessage(`onPlayerClockTimeout failed for user ${player.user.name} (${player.user.id}): ${message}`, "fatal");
            }
        } finally {
            this.entireGame.checkGameStateChanged();
            this.entireGame.doPlayerClocksHandling();
            this.entireGame.saveGame(updateLastActive);
        }
    }

    endPlayerClock(player: Player, clearTimer = true): void {
        if (!player.liveClockData) {
            return;
        }

        if (clearTimer && player.liveClockData.serverTimer) {
            clearTimeout(player.liveClockData.serverTimer);
        }

        player.liveClockData.serverTimer = null;
        player.liveClockData.timerStartedAt = null;
        player.liveClockData.remainingSeconds = 0;

        this.entireGame.broadcastToClients({
            type: "stop-player-clock",
            remainingSeconds: 0,
            userId: player.user.id
        });
    }

    resumeGame(byVote = false): void {
        try {
            if (!this.paused) {
                throw new Error("Game must be paused here");
            }

            const pauseTimeInSeconds = getElapsedSeconds(this.paused);
            this.paused = null;
            this.willBeAutoResumedAt = null;
            this.autoResumeTimeout = null;

            // Cancel possible ResumeGame votes
            this.votes.values.filter(v => v.type instanceof ResumeGame && v.state == VoteState.ONGOING).forEach(v => {
                v.cancelVote();
            });

            this.log({
                type: "game-resumed",
                pauseTimeInSeconds: pauseTimeInSeconds,
                autoResumed: !byVote
            });
            this.entireGame.broadcastToClients({
                type: "game-resumed"
            });

            this.entireGame.doPlayerClocksHandling();
            this.entireGame.saveGame(false);
        } catch (e) {
            const message = typeof e === "string"
                ? e
                : e instanceof Error
                    ? e.message
                    : "Unknown error in resumeGame";
            console.error(message);
            if (this.entireGame.onCaptureSentryMessage) {
                this.entireGame.onCaptureSentryMessage(`resumeGame failed: ${message}`, "fatal");
            }
        }
    }

    applyAverageOfRemainingClocksToNewPlayer(newPlayer: Player, oldPlayer: Player | null): void {
        if (!this.entireGame.gameSettings.onlyLive) {
            return;
        }

        const otherPlayers = this.players.values;
        _.pull(otherPlayers, newPlayer, oldPlayer);

        const values = otherPlayers.map(p => p.totalRemainingSeconds).sort((a, b) => a - b);
        if (values.length > 2) {
            // Remove value of the fastest player
            values.pop();
        }

        const avg = Math.round(_.sum(values) / values.length);
        newPlayer.liveClockData = {
            remainingSeconds: avg,
            serverTimer: null,
            timerStartedAt: null
        }
    }

    replacePlayerByVassal(player: Player, reason: ReplacementReason): void {
        this.cancelPendingReplaceVotes();

        const newVassalHouse = player.house;

        // In case the new vassal house is needed for another vote, vote with Reject
        const missingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.participatingHouses.includes(newVassalHouse) && !v.votes.has(newVassalHouse));
        missingVotes.forEach(v => {
            v.votes.set(newVassalHouse, false);
            this.entireGame.broadcastToClients({
                type: "vote-done",
                choice: false,
                vote: v.id,
                voter: newVassalHouse.id
            });

            // We don't need to call v.checkVoteFinished() here as we vote with Reject and therefore never call executeAccepted()
        });

        const forbiddenCommanders: House[] = [];
        // If we are in combat we can't assign the vassal to the opponent
        const anyCombat = this.getFirstChildGameState(CombatGameState);
        if (anyCombat) {
            const combat = anyCombat as CombatGameState;
            if (combat.isCommandingHouseInCombat(newVassalHouse)) {
                const commandedHouse = combat.getCommandedHouseInCombat(newVassalHouse);
                const enemy = combat.getEnemy(commandedHouse);

                forbiddenCommanders.push(this.getControllerOfHouse(enemy).house);
            }
        }

        if (reason == ReplacementReason.VOTE && !this.oldPlayerIds.includes(player.user.id)) {
            this.oldPlayerIds.push(player.user.id);
        } else if (reason == ReplacementReason.CLOCK_TIMEOUT) {
            this.housesTimedOut.push(player.house);
            if (!this.timeoutPlayerIds.includes(player.user.id)) {
                this.timeoutPlayerIds.push(player.user.id);
            }
        }

        // Delete the old player so the house is a vassal now
        this.players.delete(player.user);

        // Find new random commander
        let newCommander: House | null = null;
        for (const house of shuffle(this.game.getTurnOrder()).filter(h => !this.isVassalHouse(h))) {
            if (!forbiddenCommanders.includes(house)) {
                newCommander = house;
                break;
            }
        }

        if (!newCommander) {
            throw new SnrError(this.entireGame, "Unable to determine new commander");
        }

        // It may happen that you replace a player which commands vassals. Assign them to the potential winner.
        this.game.vassalRelations.entries.forEach(([vassal, commander]) => {
            if (newVassalHouse == commander) {
                this.game.vassalRelations.set(vassal, newCommander as House);
            }
        });

        // Assign new commander to replaced house
        this.game.vassalRelations.set(newVassalHouse, newCommander);

        // Broadcast new vassal relations before deletion of player!
        this.broadcastVassalRelations();

        newVassalHouse.hasBeenReplacedByVassal = true;

        this.entireGame.broadcastToClients({
            type: "player-replaced",
            oldUser: player.user.id,
            timedOut: reason == ReplacementReason.CLOCK_TIMEOUT
        });

        this.log({
            type: "player-replaced",
            oldUser: player.user.id,
            house: newVassalHouse.id,
            reason: reason,
            newCommanderHouse: newCommander.id
        });

        // Save the house cards, so vassalization can be undone and cards can be re-assigned to a new player
        this.game.oldPlayerHouseCards.set(newVassalHouse, newVassalHouse.houseCards);
        this.entireGame.broadcastToClients({
            type: "update-old-player-house-cards",
            houseCards: this.game.oldPlayerHouseCards.entries.map(([h, hcs]) => [h.id, hcs.values.map(hc => hc.id)])
        });

        // In case we are in combat we will do proceedHouseCardHandling() where we eventually recycle the deck,
        // then save the oldPlayerHouseCards again and then remove the house cards from this vassal house.
        if (!this.hasChildGameState(CombatGameState)) {
            // If we're not in combat, we have to remove the house cards from the new vassal now
            newVassalHouse.houseCards = new BetterMap();
            this.entireGame.broadcastToClients({
                type: "update-house-cards",
                house: newVassalHouse.id,
                houseCards: []
            });
        }

        // Perform action of current state
        this.leafState.actionAfterVassalReplacement(newVassalHouse);

        // In case the new vassal should execute a wildlings effect, skip it
        if (this.hasChildGameState(WildlingCardEffectInTurnOrderGameState)) {
            const wildlingEffect = this.getChildGameState(WildlingCardEffectInTurnOrderGameState) as WildlingCardEffectInTurnOrderGameState<GameState<any, any>>;
            const leaf = this.leafState as any;
            if (leaf.house && leaf.house == newVassalHouse) {
                wildlingEffect.proceedNextHouse(newVassalHouse);
            }
        }

        const newCommanderPlayer = this.players.values.find(p => p.house == newCommander);
        // If we are waiting for the new commander, notify them about their turn
        if (newCommanderPlayer && this.leafState.getWaitedUsers().includes(newCommanderPlayer.user)) {
            this.entireGame.notifyWaitedUsers([newCommanderPlayer.user]);
        }
    }

    // returns true, if game is over and calling state needs to exit from processing
    processPossibleConsequencesOfUnitLoss(): UnitLossConsequence {
        // Check for last unit in dragon revenge
        if (this.entireGame.gameSettings.dragonRevenge) {
            for (const house of this.game.houses.values) {
                const noCastles = this.world.regions.values.filter(r => r.castleLevel > 0 && r.getController() == house).length == 0;

                if (noCastles) {
                    const nonDragonLandUnits = this.world.getUnitsOfHouse(house).filter(u => u.type.id != "ship" && u.type.id != "dragon");
                    if (nonDragonLandUnits.length == 1) {
                        const unit = nonDragonLandUnits[0];
                        this.log({
                            type: "last-land-unit-transformed-to-dragon",
                            house: house.id,
                            transformedUnitType: unit.type.id,
                            region: unit.region.id
                        }, true);
                        this.transformUnits(unit.region, [unit], dragon);
                    }
                }
            }
        }

        // Restore Pentos garrison
        this.world.regionsThatRegainGarrison.forEach(staticRegion => {
            const region = this.world.getRegion(staticRegion);
            if (region.getController() == region.superControlPowerToken && region.garrison != staticRegion.startingGarrison) {
                region.garrison = staticRegion.startingGarrison;
                this.sendMessageToUsersWhoCanSeeRegion({
                    type: "change-garrison",
                    region: region.id,
                    newGarrison: region.garrison
                }, region);
                this.log({
                    type: "garrison-returned",
                    region: region.id,
                    strength: region.garrison
                });
            }
        });

        // Destroy orphaned ships in ports
        findOrphanedShipsAndDestroyThem(this, this.actionState);

        // Check for Port take over
        const takeOverRequired = isTakeControlOfEnemyPortRequired(this);
        if (takeOverRequired) {
            return { takeOverPort: takeOverRequired };
        }

        // A unit loss may result in a win, if the lost unit
        // was located in an enemy capital => check winning conditions
        if (this.checkVictoryConditions()) {
            return { victoryConditionsFulfilled: true };
        }

        return { };
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "supply-adjusted") {
            const supplies: [House, number][] = message.supplies.map(([houseId, supply]) => [this.game.houses.get(houseId), supply]);

            supplies.forEach(([house, supply]) => house.supplyLevel = supply);
        } else if (message.type == "change-control-power-token") {
            const region = this.world.regions.get(message.regionId);
            const house = message.houseId ? this.game.houses.get(message.houseId) : null;

            region.controlPowerToken = house;
        } else if (message.type == "change-wildling-strength") {
            this.game.wildlingStrength = message.wildlingStrength;
        } else if (message.type == "add-units") {
            const region = this.world.regions.get(message.regionId);
            const units = message.units.map(u => {
                const unit = Unit.deserializeFromServer(this.game, u);
                unit.region = region;
                region.units.set(unit.id, unit);
                return unit;
            });

            if (!this.fogOfWar) {
                units.forEach(u =>
                    this.unitsToBeAnimated.set(u, {
                        highlight: {active: true, color: message.isTransform ? "yellow": "green"},
                        animateAttention: message.isTransform,
                        animateFadeIn: !message.isTransform
                    }));
                window.setTimeout(() => units.forEach(u => this.unitsToBeAnimated.delete(u)), 4000);
            }
        } else if (message.type == "change-garrison") {
            const region = this.world.regions.get(message.region);

            region.garrison = message.newGarrison;
        } else if (message.type == "remove-units") {
            const region = this.world.regions.get(message.regionId);
            const units = message.unitIds.map(uid => region.units.get(uid));

            if (message.animate && !this.fogOfWar) {
                units.forEach(u =>
                    this.unitsToBeAnimated.set(u, {
                        highlight: {active: true, color: "red"},
                        animateFadeOut: true
                    }));
                window.setTimeout(() => units.forEach(unit => {
                    region.units.delete(unit.id);
                    this.unitsToBeAnimated.delete(unit);
                }), 4000);
            } else {
                units.forEach(unit => region.units.delete(unit.id));
            }
        } else if (message.type == "change-state-house-card") {
            const house = this.game.houses.get(message.houseId);
            const cards = message.cardIds.map(cid => house.houseCards.get(cid));

            cards.forEach(hc => hc.state = message.state);
        } else if (message.type == "move-units") {
            const from = this.world.regions.get(message.from);
            const to = this.world.regions.get(message.to);
            const units = message.units.map(uid => from.units.get(uid));

            if (from != to) {
                units.forEach(u => {
                    this.marchMarkers.set(u, to);
                });
            }

            window.setTimeout(() => {
                units.forEach(u => {
                    this.marchMarkers.tryDelete(u);
                    from.units.delete(u.id);
                    to.units.set(u.id, u);
                    u.region = to;
                });
            }, message.isRetreat ? 4500 : 5000);
        } else if (message.type == "units-wounded") {
            const region = this.world.regions.get(message.regionId);
            const units = message.unitIds.map(uid => region.units.get(uid));

            units.forEach(u => u.wounded = true);
        } else if (message.type == "change-power-token") {
            const house = this.game.houses.get(message.houseId);

            house.powerTokens = message.powerTokenCount;
        } else if (message.type == "new-turn") {
            this.game.turn++;
            this.game.valyrianSteelBladeUsed = false;
            this.world.regions.forEach(r => r.units.forEach(u => u.wounded = false));
        } else if (message.type == "add-game-log") {
            this.gameLogManager.logs.push({data: message.data, time: new Date(message.time * 1000), resolvedAutomatically: message.resolvedAutomatically});
            if (this.onLogReceived) {
                this.onLogReceived(message.data);
            }

            if (message.data.type == "last-land-unit-transformed-to-dragon") {
                this.forceRerender();
            }
        } else if (message.type == "change-tracker") {
            const newOrder = message.tracker.map(hid => this.game.houses.get(hid));

            if (message.trackerI == 0) {
                this.game.ironThroneTrack = newOrder;
            } else if (message.trackerI == 1) {
                this.game.fiefdomsTrack = newOrder;
            } else if (message.trackerI == 2) {
                this.game.kingsCourtTrack = newOrder;
            }
        } else if (message.type == "update-westeros-decks") {
            this.game.westerosDecks = message.westerosDecks.map(wd => wd.map(wc => WesterosCard.deserializeFromServer(wc)));
            this.game.winterIsComingHappened = message.winterIsComingHappened;
        } else if (message.type == "hide-top-wildling-card") {
            this.game.houses.forEach(h => h.knowsNextWildlingCard = false);
            this.game.clientNextWildlingCardId = null;
        } else if (message.type == "reveal-top-wildling-card") {
            this.game.houses.get(message.houseId).knowsNextWildlingCard = true;
            this.game.clientNextWildlingCardId = message.cardId;
        } else if (message.type == "vote-started") {
            const vote = Vote.deserializeFromServer(this, message.vote);
            this.votes.set(vote.id, vote);
            if (this.onVoteStarted) {
                this.onVoteStarted();
            }
        } else if (message.type == "vote-cancelled") {
            const vote = this.votes.get(message.vote);
            vote.cancelled = true;
        } else if (message.type == "vote-done") {
            const vote = this.votes.get(message.vote);
            const voter = this.game.houses.get(message.voter);

            vote.votes.set(voter, message.choice);
        } else if (message.type == "player-replaced") {
            const oldPlayer = this.players.get(this.entireGame.users.get(message.oldUser));
            const newUser = message.newUser ? this.entireGame.users.get(message.newUser) : null;
            const newPlayer = newUser ? new Player(newUser, oldPlayer.house) : null;

            if (newPlayer && message.liveClockRemainingSeconds !== undefined) {
                newPlayer.liveClockData = {
                    remainingSeconds: message.liveClockRemainingSeconds,
                    serverTimer: null,
                    timerStartedAt: null
                }
            }

            if (newUser && newPlayer) {
                this.players.set(newUser, newPlayer);
            } else {
                oldPlayer.house.hasBeenReplacedByVassal = true;
            }

            if (message.timedOut) {
                this.housesTimedOut.push(oldPlayer.house);
            }

            this.players.delete(oldPlayer.user);

            this.forceRerender();
        } else if (message.type == "vassal-replaced") {
            const house = this.game.houses.get(message.house);
            house.hasBeenReplacedByVassal = false;
            const user = this.entireGame.users.get(message.user);
            const newPlayer = new Player(user, house);

            if (message.liveClockRemainingSeconds !== undefined) {
                newPlayer.liveClockData = {
                    remainingSeconds: message.liveClockRemainingSeconds,
                    serverTimer: null,
                    timerStartedAt: null
                }
            }

            this.players.set(user, newPlayer);

            this.forceRerender();
        } else if (message.type == "vassal-relations") {
            this.game.vassalRelations = new BetterMap(message.vassalRelations.map(([vId, cId]) => [this.game.houses.get(vId), this.game.houses.get(cId)]));
            this.forceRerender();
        } else if (message.type == "update-house-cards") {
            const house = this.game.houses.get(message.house);
            const allHouseCardsInGame = this.game.getAllHouseCardsInGame();
            house.houseCards = new BetterMap(message.houseCards.map(hcid => {
                const hc = allHouseCardsInGame.get(hcid);
                return [hcid, hc];
            }));
        } else if (message.type == "later-house-cards-applied") {
            const house = this.game.houses.get(message.house);
            this.game.previousPlayerHouseCards.set(house, new BetterMap());
            house.houseCards.values.forEach(hc => {
                this.game.previousPlayerHouseCards.get(house).set(hc.id, hc);
                house.houseCards.delete(hc.id);
            });

            house.laterHouseCards?.values.forEach(hc => {
                house.houseCards.set(hc.id, hc);
            });

            house.laterHouseCards = null;
        } else if (message.type == "update-draftable-house-cards") {
            const allHouseCardsInGame = this.game.getAllHouseCardsInGame();
            this.game.draftableHouseCards = new BetterMap(message.houseCards.map(hcid => {
                const hc = allHouseCardsInGame.get(hcid);
                return [hcid, hc];
            }));
        } else if (message.type == "update-deleted-house-cards") {
            const allHouseCardsInGame = this.game.getAllHouseCardsInGame();
            this.game.deletedHouseCards = new BetterMap(message.houseCards.map(hcid => {
                const hc = allHouseCardsInGame.get(hcid);
                return [hcid, hc];
            }));
        } else if (message.type == "update-old-player-house-cards") {
            const allHouseCardsInGame = this.game.getAllHouseCardsInGame();
            this.game.oldPlayerHouseCards = new BetterMap(message.houseCards.map(([hid, hcs]) =>
                [this.game.houses.get(hid), new BetterMap(hcs.map(hcid => {
                    const hc = allHouseCardsInGame.get(hcid);
                    return [hcid, hc];
                }))]
            ));
        } else if (message.type == "update-max-turns") {
            this.game.maxTurns = message.maxTurns;
        } else if (message.type == "loyalty-token-gained") {
            const region = this.world.regions.get(message.region);
            if (this.game.targaryen) {
                this.game.targaryen.victoryPoints = message.newLoyaltyTokenCount;
            }
            region.loyaltyTokens = 0;
        } else if (message.type == "loyalty-token-placed") {
            const region = this.world.regions.get(message.region);
            region.loyaltyTokens = message.newLoyaltyTokenCount;
        } else if (message.type == "dragon-strength-token-removed") {
            _.pull(this.game.dragonStrengthTokens, message.fromRound);
            this.game.removedDragonStrengthTokens.push(message.fromRound);
        } else if (message.type == "update-loan-cards") {
            this.game.theIronBank.loanCardDeck = message.loanCardDeck.map(lc => LoanCard.deserializeFromServer(this.game, lc));
            this.game.theIronBank.purchasedLoans = message.purchasedLoans.map(lc => LoanCard.deserializeFromServer(this.game, lc));
            this.game.theIronBank.loanSlots = message.loanSlots.map(lc => lc ? LoanCard.deserializeFromServer(this.game, lc) : null);
        } else if (message.type == "update-region-modifiers") {
            const region = this.game.world.regions.get(message.region);

            if (message.castleModifier) {
                region.castleModifier = message.castleModifier;
            }
            if (message.barrelModifier) {
                region.barrelModifier = message.barrelModifier;
            }
            if (message.crownModifier) {
                region.crownModifier = message.crownModifier;
            }
        } else if (message.type == "update-completed-objectives") {
            message.objectives.forEach(([hid, objectives]) => {
                this.game.houses.get(hid).completedObjectives = objectives.map(ocid => objectiveCards.get(ocid));
            });

            message.victoryPointCount.forEach(([hid, vpc]) => {
                this.game.houses.get(hid).victoryPoints = vpc;
            });
        } else if (message.type == "update-secret-objectives") {
            this.game.houses.get(message.house).secretObjectives = message.objectives.map(ocid => objectiveCards.get(ocid));
        } else if (message.type == "update-usurper") {
            this.game.usurper = message.house ? this.game.houses.get(message.house) : null;
        } else if (message.type == "start-player-clock") {
            const player = this.players.get(this.entireGame.users.get(message.userId));

            if (!player.liveClockData) {
                throw new Error("LiveClockData must be present in start-player-clock");
            }

            player.liveClockData.remainingSeconds = message.remainingSeconds;
            player.liveClockData.timerStartedAt = new Date(message.timerStartedAt);
        } else if (message.type == "stop-player-clock") {
            const player = this.players.get(this.entireGame.users.get(message.userId));

            if (!player.liveClockData) {
                throw new Error("LiveClockData must be present stop-player-clock");
            }

            player.liveClockData.remainingSeconds = message.remainingSeconds;
            player.liveClockData.timerStartedAt = null;
        } else if (message.type == "game-paused") {
            this.paused = new Date();
            if (message.willBeAutoResumedAt) {
                this.willBeAutoResumedAt = new Date(message.willBeAutoResumedAt);
            }
        } else if (message.type == "game-resumed") {
            this.paused = null;
            this.willBeAutoResumedAt = null;
        } else if (message.type == "preemptive-raid-new-attack" && this.onPreemptiveRaidNewAttack) {
            // Todo: Handle this in WildlingAttackGameState
            const biddings = message.biddings.map(([bid, hids]) =>
                [bid, hids.map(hid => this.game.houses.get(hid))] as [number, House[]]);
            const highestBidder = this.game.houses.get(message.highestBidder);
            this.onPreemptiveRaidNewAttack(biddings, highestBidder);
        } else if (message.type == "houses-swapped") {
            const initiator = this.players.get(this.entireGame.users.get(message.initiator));
            const swappingPlayer = this.players.get(this.entireGame.users.get(message.swappingUser));

            const swappingHouse = swappingPlayer.house;
            swappingPlayer.house = initiator.house;
            initiator.house = swappingHouse;
            this.forceRerender();
        } else if (message.type == "reveal-orders") {
            if (!this.fogOfWar) {
                message.orders.forEach(([rid, _oid]) => {
                    const r = this.world.regions.get(rid);
                    this.ordersToBeAnimated.set(r, {animateFlip: true })
                });
                window.setTimeout(() => {
                    this.ordersOnBoard = new BetterMap(message.orders.map(([rid, oid]) => {
                        const r = this.world.regions.get(rid);
                        this.ordersToBeAnimated.delete(r);
                        return [r, orders.get(oid)];
                    }));
                }, 1200);
            } else {
                this.ordersOnBoard = new BetterMap(message.orders.map(([rid, oid]) => {
                    const r = this.world.regions.get(rid);
                    return [r, orders.get(oid)];
                }));
            }
        } else if (message.type == "remove-orders") {
            message.regions.map(rid => this.world.regions.get(rid)).forEach(r => {
                if (this.ordersOnBoard.has(r)) this.ordersOnBoard.delete(r);
            });
        } else if (message.type == "manipulate-combat-house-card") {
            message.manipulatedHouseCards.forEach(([hcid, shc]) => {
                const houseCard = this.game.getHouseCardById(hcid);
                houseCard.ability = shc.abilityId ? houseCardAbilities.get(shc.abilityId) : null;
                houseCard.disabled = shc.disabled;
                houseCard.disabledAbility = shc.disabledAbilityId ? houseCardAbilities.get(shc.disabledAbilityId) : null;
                houseCard.combatStrength = shc.combatStrength;
                houseCard.originalCombatStrength = shc.originalCombatStrength;
            });

            if (this.hasChildGameState(CombatGameState)) {
                const combat = this.getChildGameState(CombatGameState) as CombatGameState;
                combat.rerender++;
            }
        } else if (message.type == "update-waited-for-data") {
            const player = this.players.get(this.entireGame.users.get(message.userId));
            player.waitedForData = message.waitedForData ?
                {
                    date: new Date(message.waitedForData.date),
                    leafStateId: message.waitedForData.leafStateId,
                    handled: message.waitedForData.handled,
                    hasBeenReactivated: message.waitedForData.hasBeenReactivated
                }
                : null;
        } else if (message.type == "user-banned") {
            this.bannedUsers.add(message.userId);
        } else if (message.type == "user-unbanned") {
            this.bannedUsers.delete(message.userId);
        } else if (message.type == "update-visible-regions") {
            if (this.fogOfWar) {
                const toHide = message.regionsToHide.map(rid => this.world.regions.get(rid));

                toHide.forEach(region => {
                    if (this.ordersOnBoard.has(region)) {
                        this.ordersOnBoard.delete(region);
                    }

                    region.units.keys.forEach(uid => region.units.delete(uid));
                    region.garrison = 0;
                    region.controlPowerToken = null;
                    region.loyaltyTokens = 0;
                    region.castleModifier = 0;
                    region.crownModifier = 0;
                    region.barrelModifier = 0;
                });

                const user = this.entireGame.users.get(message.playerUserId);
                const player = this.players.has(user)
                    ? this.players.get(user)
                    : null;

                if (!player) {
                    this.visibleRegionsPerPlayer.clear();
                    return;
                }

                if (!this.visibleRegionsPerPlayer.has(player)) {
                    this.visibleRegionsPerPlayer.clear();
                    this.visibleRegionsPerPlayer.set(player, []);
                }

                const visibleRegions = message.regionsToMakeVisible.map(sr => Region.deserializeFromServer(this.game, sr));

                visibleRegions.forEach(vr => {
                    const region = this.world.regions.get(vr.id);

                    region.units = vr.units;
                    region.garrison = vr.garrison;
                    region.controlPowerToken = vr.controlPowerToken;
                    region.loyaltyTokens = vr.loyaltyTokens;
                    region.castleModifier = vr.castleModifier;
                    region.crownModifier = vr.crownModifier;
                    region.barrelModifier = vr.barrelModifier;

                    this.visibleRegionsPerPlayer.get(player).push(region);
                });

                message.ordersToMakeVisible.map(([rid, oid]) => {
                    const region = this.world.regions.get(rid);
                    const order = orders.get(oid);

                    this.ordersOnBoard.set(region, order);
                });

                this.visibleRegionsPerPlayer.set(player, _.difference(this.visibleRegionsPerPlayer.get(player), toHide));
            }
        } else if (message.type == "update-public-visible-regions") {
            if (!this.fogOfWar) {
                return;
            }
            // client side visibleRegionsPerPlayer only contains own regions
            if (message.clear) {
                if (message.applyChangesNow) {
                    this.publicVisibleRegions.forEach(region => {
                        if (this.ordersOnBoard.has(region)) {
                            this.ordersOnBoard.delete(region);
                        }

                        region.units.clear();
                        region.garrison = 0;
                        region.controlPowerToken = null;
                        region.loyaltyTokens = 0;
                        region.castleModifier = 0;
                        region.crownModifier = 0;
                        region.barrelModifier = 0;
                    });
                }
                this.publicVisibleRegions = [];
            } else if (message.regionsToMakeVisible) {
                this.publicVisibleRegions.push(...message.regionsToMakeVisible.map(sr => this.world.regions.get(sr.id)));

                if (message.applyChangesNow) {
                    const visibleRegions = message.regionsToMakeVisible.map(sr => Region.deserializeFromServer(this.game, sr));

                    visibleRegions.forEach(vr => {
                        const region = this.world.regions.get(vr.id);

                        region.units = vr.units;
                        region.garrison = vr.garrison;
                        region.controlPowerToken = vr.controlPowerToken;
                        region.loyaltyTokens = vr.loyaltyTokens;
                        region.castleModifier = vr.castleModifier;
                        region.crownModifier = vr.crownModifier;
                        region.barrelModifier = vr.barrelModifier;
                    });

                    if (message.ordersToMakeVisible) {
                        message.ordersToMakeVisible.map(([rid, oid]) => {
                            const region = this.world.regions.get(rid);
                            const order = orders.get(oid);

                            this.ordersOnBoard.set(region, order);
                        });
                    }
                }
            }
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    broadcastAddUnits(region: Region, units: Unit[], isTransform = false): void {
        this.sendMessageToUsersWhoCanSeeRegion({
            type: "add-units",
            regionId: region.id,
            units: units.map(u => u.serializeToClient()),
            isTransform: isTransform
        }, region);
    }

    broadcastRemoveUnits(region: Region, units: Unit[], animate = true): void {
        this.sendMessageToUsersWhoCanSeeRegion({
            type: "remove-units",
            regionId: region.id,
            unitIds: units.map(u => u.id),
            animate: animate && !this.fogOfWar
        }, region);

    }

    sendMessageToUsersWhoCanSeeRegion(message: ServerMessage, region: Region, ...exceptTo: User[]): void {
        if (!this.fogOfWar) {
            this.entireGame.broadcastToClients(message, ...exceptTo);
            return;
        }

        this.entireGame.users.forEach(u => {
            const p = this.players.tryGet(u, null);
            const visibleRegions = this.getVisibleRegionsForPlayer(p);
            if (visibleRegions.includes(region) && !exceptTo.includes(u)) {
                this.entireGame.sendMessageToClients([u], message);
            }
        });
    }

    updateVisibleRegions(hideNonVisibleAreas = false): void {
        if (!this.fogOfWar) {
            return;
        }

        this.players.values.forEach(p => {
            const oldVisibleRegions = this.visibleRegionsPerPlayer.tryGet(p, null) ?? [];
            const visibleRegions = hideNonVisibleAreas
                ? this.calculateVisibleRegionsForPlayer(p)
                : _.uniq(_.concat(oldVisibleRegions, this.calculateVisibleRegionsForPlayer(p)));

                this.visibleRegionsPerPlayer.set(p, visibleRegions);
                const makeVisible =  _.difference(visibleRegions, oldVisibleRegions);
                const toHide = _.difference(oldVisibleRegions, visibleRegions);

                if (makeVisible.length > 0 || toHide.length > 0) {
                    this.entireGame.sendMessageToClients([p.user], {
                        type: "update-visible-regions",
                        playerUserId: p.user.id,
                        regionsToMakeVisible: makeVisible.map(r => r.serializeToClient(true, null)),
                        regionsToHide: toHide.map(r => r.id),
                        ordersToMakeVisible: makeVisible.filter(r => this.ordersOnBoard.has(r)).map(r => [r.id, this.ordersOnBoard.get(r).id])
                    });
                }
        });

        const removedPlayers = _.difference(this.visibleRegionsPerPlayer.keys, this.players.values);

        removedPlayers.forEach(p => {
            this.entireGame.sendMessageToClients([p.user], {
                type: "update-visible-regions",
                playerUserId: p.user.id,
                regionsToMakeVisible: [],
                regionsToHide: _.difference(this.world.regions.keys, this.publicVisibleRegions.map(r => r.id)),
                ordersToMakeVisible: []
            });
        });

        removedPlayers.forEach(p => this.visibleRegionsPerPlayer.delete(p));
    }

    getVisibleRegionsForPlayer(player: Player | null): Region[] {
        if (!this.fogOfWar || this.isEndedOrCancelled) {
            return this.world.regions.values;
        }

        if (!player || !this.visibleRegionsPerPlayer.has(player)) {
            return this.publicVisibleRegions;
        }

        return this.visibleRegionsPerPlayer.get(player);
    }

    calculateVisibleRegionsForPlayer(player: Player | null, unitVisibilityRange = 1): Region[] {
        if (!this.fogOfWar || !player) {
            return [];
        }

        if (this.isEndedOrCancelled) {
            return this.world.regions.values;
        }

        const controlledHouses: (House | null)[] = [player.house, ...this.getVassalsControlledByPlayer(player)];
        const allRegionsWithControllers = this.world.getAllRegionsWithControllers();

        // We begin with all controlled areas of own and vassal units. We definitely always see them
        const result: Region[] = allRegionsWithControllers.filter(([_r, h]) => controlledHouses.includes(h)).map(([r, _h]) => r);
        let regionsWithUnits = result.filter(r => r.units.size > 0);
        const checkedRegions: Region[] = [];

        // Additionally we see regions adjacents to our regions with units
        for(let i=0; i<unitVisibilityRange; i++) {
            const additionalRegionsToCheck: Region[] = [];
            for (let j=0; j<regionsWithUnits.length; j++) {
                const region = regionsWithUnits[j];
                let adjacent: Region[] = [];
                if (!checkedRegions.includes(region)) {
                    adjacent = this.world.getNeighbouringRegions(region);
                    result.push(...adjacent);
                    additionalRegionsToCheck.push(...adjacent)
                    checkedRegions.push(region);
                }
            }

            if (unitVisibilityRange > 1) {
                regionsWithUnits.push(...additionalRegionsToCheck);
                regionsWithUnits = _.uniq(regionsWithUnits);
            }
        }

        result.push(...this.calculateRequiredVisibleRegionsForPlayer(player));
        result.push(...this.publicVisibleRegions)

        return _.uniq(result);
    }

    calculateRequiredVisibleRegionsForPlayer(player: Player): Region[] {
        const result: Region[] = [];
        let state: AnyGameState = this.entireGame;

        while (state != null) {
            result.push(...state.getRequiredVisibleRegionsForPlayer(player));
            state = state.childGameState;
        }
        return _.uniq(result);
    }

    addPublicVisibleRegions(regions: Region[]): void {
        if (this.fogOfWar) {
            const addedRegions = regions.filter(r => !this.publicVisibleRegions.includes(r));
            this.publicVisibleRegions.push(...addedRegions);

            this.entireGame.users.values.filter(u => u.connected).forEach(u => {
                this.entireGame.sendMessageToClients([u], {
                    type: "update-public-visible-regions",
                    regionsToMakeVisible: addedRegions.map(r => r.serializeToClient(true, null)),
                    ordersToMakeVisible: addedRegions.filter(r => this.ordersOnBoard.has(r)).map(r => [r.id, this.ordersOnBoard.get(r).id]),
                    applyChangesNow: !this.players.has(u)
                });
            });
        }
    }

    forceRerender(): void {
        if (this.rerender > 0) {
            this.rerender--;
        } else {
            this.rerender++;
        }
    }

    launchCancelGameVote(): void {
        if (window.confirm('Do you want to launch a vote to cancel the game?')) {
            this.entireGame.sendMessageToServer({
                type: "launch-cancel-game-vote"
            });
        }
    }

    launchEndGameVote(): void {
        if (window.confirm('Do you want to launch a vote to end the game after the current round?')) {
            this.entireGame.sendMessageToServer({
                type: "launch-end-game-vote"
            });
        }
    }

    launchPauseGameVote(): void {
        if (window.confirm('Do you want to launch a vote to pause the game?')) {
            this.entireGame.sendMessageToServer({
                type: "launch-pause-game-vote"
            });
        }
    }

    launchResumeGameVote(): void {
        if (window.confirm('Do you want to launch a vote to resume the game?')) {
            this.entireGame.sendMessageToServer({
                type: "launch-resume-game-vote"
            });
        }
    }

    launchExtendPlayerClocksVote(): void {
        if (window.confirm('Do you want to launch a vote to extend all player clocks by 15 minutes?')) {
            this.entireGame.sendMessageToServer({
                type: "launch-extend-player-clocks-vote"
            });
        }
    }

    canLaunchCancelGameVote(player: Player | null): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof CancelGame);

        if (existingVotes.length > 0) {
            return {result: false, reason: "already-existing"};
        }

        if (player == null || !this.players.values.includes(player)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "already-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "already-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchEndGameVote(player: Player | null): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        if (this.paused) {
            return {result: false, reason: "game-paused"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof EndGame);

        if (existingVotes.length > 0) {
            return {result: false, reason: "already-existing"};
        }

        if (player == null || !this.players.values.includes(player)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "already-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "already-ended"};
        }

        if (this.game.turn == this.game.maxTurns) {
            return {result: false, reason: "already-last-turn"};
        }

        return {result: true, reason: ""};
    }

    canLaunchPauseGameVote(player: Player | null): {result: boolean; reason: string} {
        if (!this.entireGame.gameSettings.onlyLive) {
            return {result: false, reason: "no-live-clock-game"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof PauseGame);

        if (existingVotes.length > 0) {
            return {result: false, reason: "already-existing"};
        }

        if (this.paused) {
            return {result: false, reason: "already-paused"};
        }

        if (player == null || !this.players.values.includes(player)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "already-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "already-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchResumeGameVote(player: Player | null): {result: boolean; reason: string} {
        if (!this.entireGame.gameSettings.onlyLive) {
            return {result: false, reason: "no-live-clock-game"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof ResumeGame);

        if (existingVotes.length > 0) {
            return {result: false, reason: "already-existing"};
        }

        if (!this.paused) {
            return {result: false, reason: "not-paused"};
        }

        if (player == null || !this.players.values.includes(player)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "already-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "already-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchExtendPlayerClocksVote(player: Player | null): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        if (this.entireGame.gameSettings.fixedClock) {
            return {result: false, reason: "forbidden-by-host"};
        }

        if (this.paused) {
            return {result: false, reason: "game-paused"};
        }

        if (!this.entireGame.gameSettings.onlyLive) {
            return {result: false, reason: "no-live-clock-game"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof ExtendPlayerClocks);

        if (existingVotes.length > 0) {
            return {result: false, reason: "already-existing"};
        }

        const acceptedVotes = this.votes.values.filter(v => v.state == VoteState.ACCEPTED && v.type instanceof ExtendPlayerClocks);

        const allowedVotesCount = this.game.turn == this.game.maxTurns ? 2 : 1;
        if (acceptedVotes.length >= allowedVotesCount) {
            return {result: false, reason: "already-extended"};
        }

        const refusedVotes = this.votes.values.filter(v => v.state == VoteState.REFUSED && v.type instanceof ExtendPlayerClocks);
        if (this.game.turn != this.game.maxTurns && refusedVotes.length > 2) {
            return {result: false, reason: "max-vote-count-reached"};
        }

        if (player == null || !this.players.values.includes(player)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "already-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "already-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchReplacePlayerVote(fromUser: User | null, replaceWithVassal = false, forHouse: House | null = null): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode && !replaceWithVassal) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        if (this.paused) {
            return {result: false, reason: "game-paused"};
        }

        if (!fromUser) {
            return {result: false, reason: "only-authenticated-users-can-vote"};
        }

        if (!replaceWithVassal && this.players.keys.includes(fromUser)) {
            return {result: false, reason: "already-playing"};
        }

        if (replaceWithVassal) {
            if (!this.players.keys.includes(fromUser)) {
                return {result: false, reason: "only-players-can-vote"};
            }

            if (this.players.get(fromUser).house == forHouse) {
                return {result: false, reason: "vassalizing-yourself-is-forbidden"};
            }

            if (!this.entireGame.gameSettings.onlyLive && this.players.size == this.entireGame.minPlayerCount) {
                return {result: false, reason: "min-player-count-reached"};
            }

            if (this.childGameState instanceof DraftHouseCardsGameState) {
                return {result: false, reason: "ongoing-house-card-drafting"}
            }

            if (this.childGameState instanceof ThematicDraftHouseCardsGameState) {
                return {result: false, reason: "ongoing-house-card-drafting"}
            }
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && ((!replaceWithVassal && v.type instanceof ReplacePlayer) || v.type instanceof ReplacePlayerByVassal));
        if (existingVotes.length > 0) {
            return {result: false, reason: "ongoing-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "game-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "game-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchSwapHousesVote(initiator: User | null, swappingPlayer: Player): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        if (!initiator || !this.players.keys.includes(initiator)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        if (initiator == swappingPlayer.user) {
            return {result: false, reason: "cannot-swap-with-yourself"};
        }

        const player = this.players.get(initiator);

        if (this.entireGame.isFeastForCrows) {
            if (this.game.turn != 0) {
                return {result: false, reason: "secret-objectives-chosen"};
            }

            if (this.hasChildGameState(ChooseInitialObjectivesGameState)) {
                const chooseInitialObjectives = this.getChildGameState(ChooseInitialObjectivesGameState) as ChooseInitialObjectivesGameState;
                if (chooseInitialObjectives.childGameState.readyHouses.keys.some(h => player.house == h || swappingPlayer.house == h)) {
                    return {result: false, reason: "secret-objectives-chosen"};
                }
            }
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof SwapHouses);

        if (existingVotes.length > 0) {
            return {result: false, reason: "ongoing-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "game-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "game-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchDeclareWinnerVote(initiator: User | null): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        if (!initiator || !this.players.keys.includes(initiator)) {
            return {result: false, reason: "only-players-can-vote"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof DeclareWinner);

        if (existingVotes.length > 0) {
            return {result: false, reason: "ongoing-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "game-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "game-ended"};
        }

        return {result: true, reason: ""};
    }

    canLaunchReplaceVassalVote(fromUser: User | null, forHouse: House): {result: boolean; reason: string} {
        if (this.entireGame.gameSettings.tournamentMode) {
            return {result: false, reason: "forbidden-in-tournament-mode"};
        }

        if (this.entireGame.gameSettings.onlyLive && this.housesTimedOut.includes(forHouse)) {
            return {result: false, reason: "house-timed-out"};
        }

        if (this.paused) {
            return {result: false, reason: "game-paused"};
        }

        if (!fromUser) {
            return {result: false, reason: "only-authenticated-users-can-vote"};
        }

        if (this.players.keys.includes(fromUser)) {
            return {result: false, reason: "already-playing"};
        }

        if (this.players.values.some(p => p.house == forHouse)) {
            return {result: false, reason: "not-a-vassal"};
        }

        if (!forHouse.hasBeenReplacedByVassal) {
            return {result: false, reason: "not-a-replaced-vassal"};
        }

        const existingVotes = this.votes.values.filter(v => v.state == VoteState.ONGOING && v.type instanceof ReplaceVassalByPlayer);
        if (existingVotes.length > 0) {
            return {result: false, reason: "ongoing-vote"};
        }

        if (this.isCancelled) {
            return {result: false, reason: "game-cancelled"};
        }

        if (this.isEnded) {
            return {result: false, reason: "game-ended"};
        }

        return {result: true, reason: ""};
    }

    isHouseDefeated(house: House | null): boolean {
        if (!house) {
            return true;
        }

        // A house is considered defeated when it has no castle areas and no land units anymore
        return this.world.regions.values.filter(r => r.castleLevel > 0 && r.getController() == house).length == 0 &&
            this.world.getUnitsOfHouse(house).filter(u => u.type.id != "ship").length == 0;
    }

    launchReplacePlayerVote(player: Player): void {
        this.entireGame.sendMessageToServer({
            type: "launch-replace-player-vote",
            player: player.user.id
        });
    }

    launchReplacePlayerByVassalVote(player: Player): void {
        this.entireGame.sendMessageToServer({
            type: "launch-replace-player-by-vassal-vote",
            player: player.user.id
        });
    }

    launchReplaceVassalByPlayerVote(house: House): void {
        this.entireGame.sendMessageToServer({
            type: "launch-replace-vassal-by-player-vote",
            house: house.id
        });
    }

    launchSwapHousesVote(player: Player): void {
        this.entireGame.sendMessageToServer({
            type: "launch-swap-houses-vote",
            swappingUser: player.user.id
        });
    }

    launchDeclareWinnerVote(winner: House): void {
        this.entireGame.sendMessageToServer({
            type: "launch-declare-winner-vote",
            winner: winner.id
        });
    }

    getVassalHouses(): House[] {
        return this.game.houses.values.filter(h => this.isVassalHouse(h));
    }

    isVassalControlledByPlayer(vassal: House, player: Player): boolean {
        if (!this.isVassalHouse(vassal)) {
            throw new SnrError(this.entireGame);
        }

        return this.game.vassalRelations.tryGet(vassal, null) == player.house;
    }

    getVassalsControlledByPlayer(player: Player): House[] {
        return this.getVassalHouses().filter(h => this.isVassalControlledByPlayer(h, player));
    }

    getControlledHouses(player: Player): House[] {
        const houses  = this.getVassalsControlledByPlayer(player);
        houses.unshift(player.house);
        return houses;
    }

    getNonClaimedVassalHouses(): House[] {
        return this.getVassalHouses().filter(v => !this.game.vassalRelations.has(v));
    }

    isVassalHouse(house: House): boolean {
        return !this.players.values.map(p => p.house).includes(house);
    }

    // Returns (House | null) to support .includes(region.getController())
    // but can safely be casted to House[]
    getOtherVassalFamilyHouses(house: House): (House | null)[] {
        const result: House[] = [];
        if (this.game.vassalRelations.has(house)) {
            // If house is a vassal add its commander ...
            const vassalCommader = this.game.vassalRelations.get(house);
            result.push(vassalCommader);

            // ... and all other vassals except myself
            this.game.vassalRelations.entries.forEach(([vassal, commander]) => {
                if (commander == vassalCommader && vassal != house) {
                    result.push(vassal);
                }
            });
        } else {
            // If house is no vassal add potentially controlled vassals
            this.game.vassalRelations.entries.forEach(([vassal, commander]) => {
                if (commander == house) {
                    result.push(vassal);
                }
            });
        }

        return result;
    }

    getTurnOrderWithoutVassals(): House[] {
        return this.game.getTurnOrder().filter(h => !this.isVassalHouse(h));
    }

    broadcastObjectives(): void {
        this.entireGame.broadcastToClients({
            type: "update-completed-objectives",
            objectives: this.game.houses.values.map(h => [h.id, h.completedObjectives.map(oc => oc.id)] as [string, string[]]),
            victoryPointCount: this.game.houses.values.map(h => [h.id, h.victoryPoints])
        });

        this.players.values.forEach(p => {
            p.user.send({
                type: "update-secret-objectives",
                house: p.house.id,
                objectives: p.house.secretObjectives.map(oc => oc.id)
            });
        });
    }

    broadcastVassalRelations(): void {
        this.entireGame.broadcastToClients({
            type: "vassal-relations",
            vassalRelations: this.game.vassalRelations.entries.map(([vassal, commander]) => [vassal.id, commander.id])
        });
    }

    broadcastWesterosDecks(): void {
        this.entireGame.broadcastToClients({
            type: "update-westeros-decks",
            westerosDecks: this.game.westerosDecks.map(wd => wd.slice(0, this.game.revealedWesterosCards)
                .concat(shuffleInPlace(wd.slice(this.game.revealedWesterosCards))).map(wc => wc.serializeToClient())),
            winterIsComingHappened: this.game.winterIsComingHappened
        });
    }

    canGiftPowerTokens(house: House): boolean {
        if (!this.entireGame.gameSettings.allowGiftingPowerTokens) {
            // Targaryen always must be able to gift their tokens, so they can leave the game when defeated
            if (house != this.game.targaryen) {
                return false;
            }
        }

        if (this.entireGame.hasChildGameState(CombatGameState) &&
            !(this.entireGame.leafState instanceof DeclareSupportGameState)) {
            return false;
        }

        return !this.isVassalHouse(house);
    }

    getWorldSnapshotWithOrdersOnBoard(planningRestrictions: PlanningRestriction[] = []): RegionSnapshot[] {
        const worldSnapshot = _.orderBy(this.world.getSnapshot(), [r => r.controller, r => r.id]);
        worldSnapshot.forEach(r => {
            const region =  this.world.regions.get(r.id);
            if (region && this.ordersOnBoard.has(region)) {
                const order = this.ordersOnBoard.get(region);
                r.order = { type: order.type.id };
                if (this.game.isOrderRestricted(region, order, planningRestrictions)) {
                    r.order.restricted = true;
                }
            }
        });
        return worldSnapshot;
    }

    serializeToClient(admin: boolean, user: User | null): SerializedIngameGameState {
        // If user == null, then the game state needs to be serialized
        // in an "admin" version (i.e. containing all data).
        // Otherwise, provide a serialized version that hides data
        // based on which user is requesting the data.
        const player: Player | null = user
            ? (this.players.has(user)
                ? this.players.get(user)
                : null)
            : null;

        let ordersOnBoard = this.ordersOnBoard.mapOver(r => r.id, o => o.id);
        if (!admin && this.fogOfWar && player != null) {
            const visibleRegionIds = this.getVisibleRegionsForPlayer(player).map(r => r.id);
            ordersOnBoard = ordersOnBoard.filter(([rid, _oid]) => visibleRegionIds.includes(rid));
        }

        return {
            type: "ingame",
            players: this.players.values.map(p => p.serializeToClient()),
            visibleRegionsPerPlayer: admin
                ? this.visibleRegionsPerPlayer.entries.map(([p, regions]) => [p.user.id, regions.map(r => r.id)])
                : this.visibleRegionsPerPlayer.entries.filter(([p, _regions]) => p.user == user).map(([p, regions]) => [p.user.id, regions.map(r => r.id)]),
            publicVisibleRegions: this.publicVisibleRegions.map(r => r.id),
            oldPlayerIds: this.oldPlayerIds,
            replacerIds: this.replacerIds,
            timeoutPlayerIds: this.timeoutPlayerIds,
            housesTimedOut: this.housesTimedOut.map(h => h.id),
            game: this.game.serializeToClient(admin, player),
            gameLogManager: this.gameLogManager.serializeToClient(admin, user),
            ordersOnBoard: ordersOnBoard,
            votes: this.votes.values.map(v => v.serializeToClient(admin, player)),
            paused: this.paused ? this.paused.getTime() : null,
            willBeAutoResumedAt: this.willBeAutoResumedAt ? this.willBeAutoResumedAt.getTime() : null,
            bannedUsers: Array.from(this.bannedUsers.values()),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedIngameGameState): IngameGameState {
        const ingameGameState = new IngameGameState(entireGame);

        ingameGameState.game = Game.deserializeFromServer(ingameGameState, data.game);
        ingameGameState.players = new BetterMap(
            data.players.map(p => [entireGame.users.get(p.userId), Player.deserializeFromServer(ingameGameState, p)])
        );
        ingameGameState.visibleRegionsPerPlayer = new BetterMap(
            data.visibleRegionsPerPlayer.map(([uid, rids]) => [ingameGameState.players.get(entireGame.users.get(uid)), rids.map(rid => ingameGameState.world.regions.get(rid))])
        );
        ingameGameState.publicVisibleRegions = data.publicVisibleRegions.map(rid => ingameGameState.world.regions.get(rid));
        ingameGameState.oldPlayerIds = data.oldPlayerIds;
        ingameGameState.replacerIds = data.replacerIds;
        ingameGameState.timeoutPlayerIds = data.timeoutPlayerIds;
        ingameGameState.housesTimedOut = data.housesTimedOut.map(hid => ingameGameState.game.houses.get(hid));
        ingameGameState.votes = new BetterMap(data.votes.map(sv => [sv.id, Vote.deserializeFromServer(ingameGameState, sv)]));
        ingameGameState.ordersOnBoard = new BetterMap(
            data.ordersOnBoard.map(([regionId, orderId]) => (
                [ingameGameState.world.regions.get(regionId), orders.get(orderId)]
            ))
        );
        ingameGameState.gameLogManager = GameLogManager.deserializeFromServer(ingameGameState, data.gameLogManager);
        ingameGameState.paused = data.paused ? new Date(data.paused) : null;
        ingameGameState.willBeAutoResumedAt = data.willBeAutoResumedAt ? new Date(data.willBeAutoResumedAt) : null;
        ingameGameState.bannedUsers = new Set(data.bannedUsers);
        ingameGameState.childGameState = ingameGameState.deserializeChildGameState(data.childGameState);

        return ingameGameState;
    }

    deserializeChildGameState(data: SerializedIngameGameState["childGameState"]): IngameGameState["childGameState"] {
        switch (data.type) {
            case "westeros":
                return WesterosGameState.deserializeFromServer(this, data);
            case "planning":
                return PlanningGameState.deserializeFromServer(this, data);
            case "action":
                return ActionGameState.deserializeFromServer(this, data);
            case "game-ended":
                return GameEndedGameState.deserializeFromServer(this, data);
            case "cancelled":
                return CancelledGameState.deserializeFromServer(this, data);
            case "draft-house-cards":
                return DraftHouseCardsGameState.deserializeFromServer(this, data);
            case "thematic-draft-house-cards":
                return ThematicDraftHouseCardsGameState.deserializeFromServer(this, data);
            case "pay-debts":
                return PayDebtsGameState.deserializeFromServer(this, data);
            case "choose-initial-objectives":
                return ChooseInitialObjectivesGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedIngameGameState {
    type: "ingame";
    players: SerializedPlayer[];
    visibleRegionsPerPlayer: [string, string[]][];
    publicVisibleRegions: string[];
    oldPlayerIds: string[];
    replacerIds: string[];
    timeoutPlayerIds: string[];
    housesTimedOut: string[];
    game: SerializedGame;
    votes: SerializedVote[];
    gameLogManager: SerializedGameLogManager;
    ordersOnBoard: [string, number][];
    paused: number | null;
    willBeAutoResumedAt: number | null;
    bannedUsers: string[];
    childGameState: SerializedPlanningGameState | SerializedActionGameState | SerializedWesterosGameState
        | SerializedGameEndedGameState | SerializedCancelledGameState | SerializedDraftHouseCardsGameState
        | SerializedThematicDraftHouseCardsGameState | SerializedPayDebtsGameState
        | SerializedChooseInitialObjectivesGameState;
}
