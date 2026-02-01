import EntireGame, { NotificationType } from "../EntireGame";
import { GameSettings, HouseCardDecks } from "../GameSettings";
import GameState from "../GameState";
import User from "../../server/User";
import { ClientMessage } from "../../messages/ClientMessage";
import { ServerMessage } from "../../messages/ServerMessage";
import { observable } from "mobx";
import BetterMap from "../../utils/BetterMap";
import baseGameData from "../../../data/baseGameData.json";
import CancelledGameState from "../cancelled-game-state/CancelledGameState";
import shuffle from "../../utils/shuffle";
import shuffleInPlace from "../../utils/shuffleInPlace";
import _ from "lodash";
import { v4 } from "uuid";

export default class LobbyGameState extends GameState<EntireGame> {
  lobbyHouses: BetterMap<string, LobbyHouse>;
  @observable players = new BetterMap<LobbyHouse, User>();
  @observable password = "";
  @observable readyUsers: User[] | null = null;
  @observable readyCheckWillTimeoutAt: Date | null = null;
  readyCheckTimeout: NodeJS.Timeout | null;

  get entireGame(): EntireGame {
    return this.parentGameState;
  }

  get settings(): GameSettings {
    return this.entireGame.gameSettings;
  }

  firstStart(): void {
    // Load the available houses for this game
    this.lobbyHouses = this.getLobbyHouses();
  }

  getLobbyHouses(): BetterMap<string, LobbyHouse> {
    return new BetterMap(
      Object.entries(baseGameData.houses).map(([hid, h]) => [
        hid,
        { id: hid, name: h.name, color: h.color },
      ]),
    );
  }

  getAvailableHouses(): LobbyHouse[] {
    return this.lobbyHouses.values.filter((h) =>
      this.entireGame.selectedGameSetup.houses.includes(h.id),
    );
  }

  onGameSettingsChange(): void {
    // Remove all chosen houses that are not available with the new settings
    const availableHouses = this.getAvailableHouses();
    const usersForReassignment: User[] = [];

    let dirty = false;
    this.players.keys.forEach((house) => {
      if (!availableHouses.includes(house)) {
        dirty = true;
        usersForReassignment.push(this.players.get(house));
        this.players.delete(house);
      }
    });

    if (
      usersForReassignment.length > 0 &&
      this.players.size < this.entireGame.selectedGameSetup.playerCount
    ) {
      const freeHouses = _.difference(availableHouses, this.players.keys);

      while (freeHouses.length > 0 && usersForReassignment.length > 0) {
        this.players.set(
          freeHouses.shift() as LobbyHouse,
          usersForReassignment.shift() as User,
        );
      }
    }

    if (dirty) {
      this.entireGame.broadcastToClients({
        type: "house-chosen",
        players: this.players.entries.map(([house, user]) => [
          house.id,
          user.id,
        ]),
      });
    }
  }

  onClientMessage(user: User, message: ClientMessage): boolean {
    if (this.readyUsers != null) {
      // Only allow "ready"
      if (message.type == "ready" && !this.readyUsers.includes(user)) {
        this.readyUsers.push(user);
        this.broadcastReadyCheckUpdate();
      }

      if (this.players.values.every((u) => this.readyUsers?.includes(u))) {
        if (this.readyCheckTimeout) {
          clearTimeout(this.readyCheckTimeout);
          this.readyCheckTimeout = null;
        }
        this.players.values.forEach((u) => (u.onConnectionStateChanged = null));
        this.launchGame();
        return true;
      }
      return false;
    }

    let updateLastActive = false;

    if (message.type == "launch-game") {
      if (!this.canStartGame(user).success) {
        return false;
      }

      if (this.settings.pbem) {
        // Start game immeadiately
        this.launchGame();
        updateLastActive = true;
      } else {
        // Launch the Ready check and start the game if everyone goes ready in time
        this.launchReadyCheck();
      }
    } else if (message.type == "kick-player") {
      const kickedUser = this.entireGame.users.get(message.user);

      if (!this.entireGame.isRealOwner(user) || kickedUser == user) {
        return false;
      }

      this.setUserForLobbyHouse(null, kickedUser);
      updateLastActive = true;
    } else if (message.type == "cancel-game") {
      if (!this.entireGame.isRealOwner(user)) {
        return false;
      }

      this.entireGame
        .setChildGameState(new CancelledGameState(this.entireGame))
        .firstStart();
      updateLastActive = true;
    } else if (message.type == "choose-house") {
      const house = message.house ? this.lobbyHouses.get(message.house) : null;

      // Check if the house is available
      if (
        house &&
        (this.players.has(house) || !this.getAvailableHouses().includes(house))
      ) {
        return false;
      }

      // Check password if a password is set and player has chosen a house (i.e. house != null to always allow leaving)
      if (
        this.password != "" &&
        house &&
        this.password != message.password &&
        !this.entireGame.isRealOwner(user)
      ) {
        return false;
      }

      this.setUserForLobbyHouse(house, user);
      updateLastActive = true;
    } else if (message.type == "set-password") {
      let answer = v4();
      if (this.entireGame.isRealOwner(user)) {
        this.password = message.password;
        // If owner has reset the password, send "" to the clients
        // Otherwise send a GUID so their password validation check fails
        this.entireGame.sendMessageToClients(
          _.without(this.entireGame.users.values, user),
          {
            type: "password-response",
            password: message.password == "" ? "" : answer,
          },
        );
        // Always send back the chosen password to the owner
        answer = message.password;

        if (answer != "") {
          this.entireGame.gameSettings.private = true;
          this.entireGame.broadcastToClients({
            type: "game-settings-changed",
            settings: this.entireGame.gameSettings.serializeToClient(),
          });
        }
      } else {
        // If user sent the correct password, or no password is set
        // send back the correct password
        if (this.password == "" || this.password == message.password) {
          answer = this.password;
        }
      }

      user.send({
        type: "password-response",
        password: answer,
      });
    } else if (message.type == "change-game-settings") {
      const settings = GameSettings.deserializeFromServer(message.settings);

      if (!this.isValidDraftDeckChoice(this.entireGame.gameSettings)) {
        this.entireGame.gameSettings.selectedDraftDecks = HouseCardDecks.All;
      }

      if (!this.isValidDraftDeckChoice(settings)) {
        settings.thematicDraft = this.entireGame.gameSettings.thematicDraft;
        settings.perpetuumRandom = this.entireGame.gameSettings.perpetuumRandom;
        settings.selectedDraftDecks =
          this.entireGame.gameSettings.selectedDraftDecks;
      }

      // Allow change of game settings only if the selected variant has enough seats
      // for all already connected players
      if (
        this.players.size > settings.playerCount ||
        settings.playerCount < 2 ||
        settings.playerCount > 8
      ) {
        return updateLastActive;
      }

      if (this.settings.playerCount != settings.playerCount) {
        settings.victoryPointsCountNeededToWin = 7;
        settings.loyaltyTokenCountNeededToWin = 7;
      }

      if (settings.initialLiveClock < 30) {
        settings.initialLiveClock = 30;
      }

      if (settings.initialLiveClock > 120) {
        settings.initialLiveClock = 120;
      }

      if (
        settings.victoryPointsCountNeededToWin < 6 ||
        settings.victoryPointsCountNeededToWin > 50
      ) {
        settings.victoryPointsCountNeededToWin = 7;
      }

      if (
        settings.loyaltyTokenCountNeededToWin < 6 ||
        settings.loyaltyTokenCountNeededToWin > 50
      ) {
        settings.loyaltyTokenCountNeededToWin = 7;
      }

      if (
        settings.houseCardsEvolutionRound < 2 ||
        settings.houseCardsEvolutionRound > 10
      ) {
        settings.houseCardsEvolutionRound = 5;
      }

      if (settings.houseCardsEvolution) {
        settings.adwdHouseCards = false;
        settings.asosHouseCards = false;
        settings.draftHouseCards = false;
        settings.thematicDraft = false;
        settings.limitedDraft = false;
        settings.blindDraft = false;
        settings.randomDraft = false;
        settings.perpetuumRandom = false;
      }

      if (settings.setupId == "a-feast-for-crows") {
        settings.allowGiftingPowerTokens = false;
        settings.useVassalPositions = false;
        settings.mixedWesterosDeck1 = false;
        settings.endless = false;
        settings.houseCardsEvolution = false;
      }

      if (settings.setupId != "a-feast-for-crows") {
        settings.addPortToTheEyrie = false;
      }

      if (settings.asosHouseCards) {
        settings.adwdHouseCards = false;
      }

      if (settings.adwdHouseCards) {
        settings.asosHouseCards = false;
      }

      if (settings.thematicDraft) {
        settings.draftHouseCards = true;
        settings.limitedDraft = false;
        settings.blindDraft = false;
        settings.randomDraft = false;
        settings.perpetuumRandom = false;
      }

      if (settings.limitedDraft) {
        settings.draftHouseCards = true;
        settings.thematicDraft = false;
      }

      if (settings.draftHouseCards) {
        settings.adwdHouseCards = false;
        settings.asosHouseCards = false;
      }

      // Allow disabling MoD options but enable them when switching to this setup
      if (
        !this.entireGame.isMotherOfDragons &&
        settings.setupId == "mother-of-dragons"
      ) {
        settings.vassals = true;
        settings.seaOrderTokens = true;
        settings.allowGiftingPowerTokens = true;
      }

      // Disable Iron Bank when switching to 7P MoD
      if (
        this.settings.playerCount != 7 &&
        settings.setupId == "mother-of-dragons" &&
        settings.playerCount == 7
      ) {
        settings.ironBank = false;
      }

      // Lock MoD settings for 8p
      if (
        (settings.setupId == "mother-of-dragons" ||
          settings.setupId == "a-dance-with-mother-of-dragons") &&
        settings.playerCount >= 8
      ) {
        settings.vassals = true;
        settings.ironBank = true;
        settings.seaOrderTokens = true;
        settings.allowGiftingPowerTokens = true;
      }

      // Reset the MoD settings
      if (
        (this.entireGame.isMotherOfDragons ||
          this.entireGame.isDanceWithMotherOfDragons) &&
        settings.setupId != "mother-of-dragons" &&
        settings.setupId != "a-dance-with-mother-of-dragons"
      ) {
        settings.vassals = false;
        settings.seaOrderTokens = false;
        settings.allowGiftingPowerTokens = false;
        settings.ironBank = false;
      }

      if (!this.entireGame.isCustomBalancingOptionAvailable(settings)) {
        settings.customBalancing = false;
      }

      if (settings.customBalancing) {
        settings.useVassalPositions = false;
      }

      // Allow disabling DwD cards but enable them when switching to this setup
      if (
        !this.entireGame.isDanceWithDragons &&
        !this.entireGame.isDanceWithMotherOfDragons &&
        (settings.setupId == "a-dance-with-dragons" ||
          settings.setupId == "a-dance-with-mother-of-dragons")
      ) {
        settings.adwdHouseCards = true;
        settings.asosHouseCards = false;
      }

      if (
        settings.blindDraft ||
        settings.randomDraft ||
        settings.perpetuumRandom
      ) {
        settings.draftHouseCards = true;
        settings.randomDraft = true;
        settings.thematicDraft = false;
        settings.adwdHouseCards = false;
        settings.asosHouseCards = false;
      }

      if (
        settings.removeTob3 ||
        settings.removeTobSkulls ||
        settings.limitTob2
      ) {
        settings.tidesOfBattle = true;
      }

      // Faceless requires Random
      if (
        settings.faceless &&
        !settings.randomHouses &&
        !settings.randomChosenHouses
      ) {
        settings.randomHouses = true;
      }

      if (!settings.vassals) {
        settings.randomVassalAssignment = false;
      }

      if (settings.dragonWar && !this.settings.dragonWar) {
        settings.dragonRevenge = true;
      }

      const hideOrRevealUserNames = settings.faceless != this.settings.faceless;

      this.entireGame.gameSettings = settings;

      if (hideOrRevealUserNames) {
        this.entireGame.hideOrRevealUserNames(false);
      }

      this.onGameSettingsChange();
    }

    return updateLastActive;
  }

  isValidDraftDeckChoice(settings: GameSettings): boolean {
    if (settings.thematicDraft || settings.perpetuumRandom) {
      return this.hasAtLeastTwoBitsSet(settings.selectedDraftDecks);
    }

    return settings.selectedDraftDecks >= 1;
  }

  hasAtLeastTwoBitsSet(num: number): boolean {
    let count = 0;
    while (num > 0) {
      if ((num & 1) === 1) {
        count++;
      }
      num >>= 1;
      if (count >= 2) {
        return true;
      }
    }
    return false;
  }

  launchGame(): void {
    if (this.settings.randomHouses) {
      // Assign a random house to the players
      // We could shuffle in place as getAvailableHouses will return a new array.
      // But it is best practice to only shuffle in place when we create the shuffled array by mapping, filtering, slicing, etc. ourselves
      const availableHouses = this.getAvailableHouses();
      do {
        const allShuffledHouses = shuffle(availableHouses);
        const connectedUsers = this.players.values;
        this.players = new BetterMap();
        for (const user of connectedUsers) {
          this.players.set(allShuffledHouses.splice(0, 1)[0], user);
        }
      } while (
        availableHouses.map((lh) => lh.id).includes("targaryen") &&
        !this.players.keys.map((lh) => lh.id).includes("targaryen")
      );
    } else if (this.settings.randomChosenHouses) {
      const shuffled = shuffleInPlace(this.players.entries); // The BetterMap methods always use Array.from and this will never change. So it is ok to shuffleInPlace here.

      const lobbyHouses = this.players.keys;
      for (let i = 0; i < shuffled.length; i++) {
        this.players.set(lobbyHouses[i], shuffled[i][1]);
      }
    }

    let housesToCreate = this.getAvailableHouses().map((h) => h.id);
    if (this.settings.setupId == "learn-the-game" && !this.settings.vassals) {
      const lobbyHouses = this.players.keys.map((lh) => lh.id);
      housesToCreate = housesToCreate.filter((h) => lobbyHouses.includes(h));
    }

    this.entireGame.proceedToIngameGameState(
      housesToCreate,
      new BetterMap(this.players.map((h, u) => [h.id, u])),
    );
  }

  launchReadyCheck(): void {
    this.readyUsers = [];
    this.readyCheckWillTimeoutAt = new Date(new Date().getTime() + 30 * 1000);
    this.readyCheckTimeout = setTimeout(() => {
      this.readyUsers = null;
      this.readyCheckTimeout = null;
      this.players.values.forEach((u) => (u.onConnectionStateChanged = null));
      this.readyCheckWillTimeoutAt = null;
      this.broadcastReadyCheckUpdate();
    }, 30 * 1000);
    this.players.values.forEach(
      (u) =>
        (u.onConnectionStateChanged = (user) =>
          this.connectionStateChangedWhileReadyCheck(user)),
    );
    this.broadcastReadyCheckUpdate();
  }

  connectionStateChangedWhileReadyCheck(user: User): void {
    if (this.readyUsers && !user.connected) {
      _.pull(this.readyUsers, user);
      this.broadcastReadyCheckUpdate();
    }
  }

  broadcastReadyCheckUpdate(): void {
    this.entireGame.broadcastToClients({
      type: "ready-check",
      readyUsers: this.readyUsers ? this.readyUsers.map((u) => u.id) : null,
      readyCheckWillTimeoutAt: this.readyCheckWillTimeoutAt
        ? this.readyCheckWillTimeoutAt.getTime()
        : null,
    });
  }

  setUserForLobbyHouse(house: LobbyHouse | null, user: User): void {
    this.players.forEach((houseUser, house) => {
      if (user == houseUser) {
        this.players.delete(house);
      }
    });

    if (house) {
      this.players.set(house, user);
    }

    this.entireGame.broadcastToClients({
      type: "house-chosen",
      players: this.players.entries.map(([house, user]) => [house.id, user.id]),
    });

    if (
      this.settings.startWhenFull &&
      this.settings.pbem &&
      this.players.size == this.entireGame.selectedGameSetup.playerCount
    ) {
      this.launchGame();
      return;
    }

    this.notifyOwnerWhenGameCanBeStarted();
  }

  notifyOwnerWhenGameCanBeStarted(): void {
    if (!this.entireGame.users.has(this.entireGame.ownerUserId)) {
      return;
    }

    const owner = this.entireGame.users.get(this.entireGame.ownerUserId);

    if (this.canStartGame(owner).success) {
      // Only notify when min count is reached and when game is full to avoid many messages in between
      const minCountReached =
        this.settings.vassals &&
        this.players.size == this.entireGame.minPlayerCount;
      const maxCountReached =
        this.players.size == this.entireGame.gameSettings.playerCount;

      if (minCountReached || maxCountReached) {
        this.entireGame.notifyUsers([owner], NotificationType.READY_TO_START);
      }
    }
  }

  canStartGame(user: User): { success: boolean; reason: string } {
    if (!this.entireGame.canActAsOwner(user)) {
      return { success: false, reason: "not-owner" };
    }

    if (this.players.size == this.entireGame.selectedGameSetup.playerCount) {
      return { success: true, reason: "ok" };
    }

    // If Vassals are toggled we need at least min_player_count_with_vassals
    if (this.settings.vassals) {
      if (this.players.size < this.entireGame.minPlayerCount) {
        return { success: false, reason: "not-enough-players" };
      }
    } else if (
      this.players.size < this.entireGame.selectedGameSetup.playerCount
    ) {
      return { success: false, reason: "not-enough-players" };
    }

    if (this.settings.playerCount >= 8 && !this.settings.randomHouses) {
      if (!this.players.keys.map((lh) => lh.id).includes("targaryen")) {
        return {
          success: false,
          reason: "targaryen-must-be-a-player-controlled-house",
        };
      }
    }

    return { success: true, reason: "ok" };
  }

  canCancel(user: User): { success: boolean; reason: string } {
    if (!this.entireGame.isRealOwner(user)) {
      return { success: false, reason: "not-owner" };
    }

    return { success: true, reason: "ok" };
  }

  onServerMessage(message: ServerMessage): void {
    if (message.type == "house-chosen") {
      this.players = new BetterMap(
        message.players.map(([hid, uid]) => [
          this.lobbyHouses.get(hid),
          this.entireGame.users.get(uid),
        ]),
      );

      if (this.entireGame.onClientGameStateChange) {
        // Fake a game state change to play a sound also in case lobby is full
        this.entireGame.onClientGameStateChange();
      }
    } else if (message.type == "password-response") {
      this.password = message.password;
    } else if (message.type == "ready-check") {
      let notifyPlayers = false;
      if (!this.readyUsers && message.readyUsers) {
        // Set a flag to notify players
        notifyPlayers = true;
      }

      this.readyUsers = message.readyUsers
        ? message.readyUsers.map((uid) => this.entireGame.users.get(uid))
        : null;
      this.readyCheckWillTimeoutAt = message.readyCheckWillTimeoutAt
        ? new Date(message.readyCheckWillTimeoutAt)
        : null;

      if (notifyPlayers && this.entireGame.onClientGameStateChange) {
        // Now fake a game state change to play a sound for the ready check
        // as getWaitedUsers now is aware about the running ready check (now: this.readyUsers != null)
        this.entireGame.onClientGameStateChange();
      }
    }
  }

  chooseHouse(house: LobbyHouse | null, password: string): void {
    this.entireGame.sendMessageToServer({
      type: "choose-house",
      house: house ? house.id : null,
      password: password,
    });
  }

  start(): void {
    this.entireGame.sendMessageToServer({
      type: "launch-game",
    });
  }

  cancel(): void {
    this.entireGame.sendMessageToServer({
      type: "cancel-game",
    });
  }

  kick(user: User): void {
    this.entireGame.sendMessageToServer({
      type: "kick-player",
      user: user.id,
    });
  }

  ready(): void {
    this.entireGame.sendMessageToServer({
      type: "ready",
    });
  }

  sendPassword(password: string): void {
    this.entireGame.sendMessageToServer({
      type: "set-password",
      password: password,
    });
  }

  getWaitedUsers(): User[] {
    if (this.readyUsers) {
      return _.difference(this.players.values, this.readyUsers);
    }

    if (!this.entireGame.users.has(this.entireGame.ownerUserId)) {
      return [];
    }

    const owner = this.entireGame.users.get(this.entireGame.ownerUserId);

    return this.canStartGame(owner).success ? [owner] : [];
  }

  serializeToClient(
    admin: boolean,
    user: User | null,
  ): SerializedLobbyGameState {
    return {
      type: "lobby",
      lobbyHouses: this.lobbyHouses.values,
      players: this.players.entries.map(([h, u]) => [h.id, u.id]),
      password:
        this.password == "" ||
        admin ||
        (user && this.entireGame.isRealOwner(user))
          ? this.password
          : v4(),
      readyUsers: this.readyUsers ? this.readyUsers.map((u) => u.id) : null,
      readyCheckWillTimeoutAt: this.readyCheckWillTimeoutAt
        ? this.readyCheckWillTimeoutAt.getTime()
        : null,
    };
  }

  static deserializeFromServer(
    entireGame: EntireGame,
    data: SerializedLobbyGameState,
  ): LobbyGameState {
    const lobbyGameState = new LobbyGameState(entireGame);

    lobbyGameState.lobbyHouses = new BetterMap(
      data.lobbyHouses.map((h) => [h.id, h]),
    );
    lobbyGameState.players = new BetterMap(
      data["players"].map(([hid, uid]) => [
        lobbyGameState.lobbyHouses.get(hid),
        entireGame.users.get(uid),
      ]),
    );
    lobbyGameState.password = data.password;
    lobbyGameState.readyUsers = data.readyUsers
      ? data.readyUsers.map((uid) => entireGame.users.get(uid))
      : null;
    lobbyGameState.readyCheckWillTimeoutAt = data.readyCheckWillTimeoutAt
      ? new Date(data.readyCheckWillTimeoutAt)
      : null;

    return lobbyGameState;
  }
}

export interface SerializedLobbyGameState {
  type: "lobby";
  players: [string, string][];
  lobbyHouses: LobbyHouse[];
  password: string;
  readyUsers: string[] | null;
  readyCheckWillTimeoutAt: number | null;
}

export interface LobbyHouse {
  id: string;
  name: string;
  color: string;
}
