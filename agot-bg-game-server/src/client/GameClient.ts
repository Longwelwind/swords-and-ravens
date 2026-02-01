import { ServerMessage } from "../messages/ServerMessage";
import { ClientMessage } from "../messages/ClientMessage";
import EntireGame from "../common/EntireGame";
import { observable } from "mobx";
import User from "../server/User";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import Player from "../common/ingame-game-state/Player";
import House from "../common/ingame-game-state/game-data-structure/House";
import ChatClient from "./chat-client/ChatClient";
import BetterMap from "../utils/BetterMap";
import { compress, decompress } from "./utils/compression";
import SfxManager from "./utils/SfxManager";
import { isMobile } from "react-device-detect";

export interface AuthData {
  userId: string;
  requestUserId: string;
  gameId: string;
  authToken: string;
}

export enum ConnectionState {
  INITIALIZING,
  CONNECTING,
  AUTHENTICATING,
  SYNCED,
  CLOSED,
}

export default class GameClient {
  socket: WebSocket | null = null;
  authData: AuthData;
  pingInterval = -1;

  @observable connectionState: ConnectionState = ConnectionState.INITIALIZING;
  @observable entireGame: EntireGame | null = null;

  @observable authenticated = false;
  @observable authenticatedUser: User | null = null;

  @observable isReconnecting = false;
  @observable showMapWhileDrafting = false;
  @observable logChatFullScreen = false;

  chatClient: ChatClient = new ChatClient(this);
  sfxManager: SfxManager = new SfxManager(this);

  get currentVolumeSettings(): {
    notifications: number;
    music: number;
    sfx: number;
  } {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }
    return {
      notifications: this.authenticatedUser.settings.notificationsVolume,
      music: this.authenticatedUser.settings.musicVolume,
      sfx: this.authenticatedUser.settings.sfxVolume,
    };
  }

  private set currentVolumeSettings(value: {
    notifications: number;
    music: number;
    sfx: number;
  }) {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }
    this.authenticatedUser.settings.notificationsVolume =
      value.notifications ?? 1;
    this.authenticatedUser.settings.musicVolume = value.music ?? 1;
    this.authenticatedUser.settings.sfxVolume = value.sfx ?? 1;
  }

  get muted(): boolean {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    return this.authenticatedUser.settings.muted;
  }

  set muted(value: boolean) {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    this.authenticatedUser.settings.muted = value;
    if (value == true) {
      sessionStorage.setItem(
        "oldVolumes",
        JSON.stringify(this.currentVolumeSettings),
      );

      this.currentVolumeSettings = { notifications: 0, music: 0, sfx: 0 };

      this.sfxManager.muteAll();
    } else {
      const oldVolumesFromStorage = JSON.parse(
        sessionStorage.getItem("oldVolumes") || "{}",
      );
      this.currentVolumeSettings = oldVolumesFromStorage;

      localStorage.removeItem("oldVolumes"); // Todo: Remove this some day
      sessionStorage.removeItem("oldVolumes");

      this.sfxManager.unmuteAll();
    }

    localStorage.setItem(
      "volumeSettings",
      JSON.stringify(this.currentVolumeSettings),
    );
    this.authenticatedUser.syncSettings();
  }

  get notificationsVolume(): number {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    return this.authenticatedUser.settings.notificationsVolume;
  }

  set notificationsVolume(value: number) {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    this.authenticatedUser.settings.notificationsVolume = value;
    this.setCurrentMutedStateAndSaveVolumeSettingsToLocalStorage();

    this.authenticatedUser.syncSettings();
  }

  get musicVolume(): number {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    return this.authenticatedUser.settings.musicVolume;
  }

  set musicVolume(value: number) {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    this.authenticatedUser.settings.musicVolume = value;
    this.setCurrentMutedStateAndSaveVolumeSettingsToLocalStorage();

    this.authenticatedUser.syncSettings();
  }

  get sfxVolume(): number {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    return this.authenticatedUser.settings.sfxVolume;
  }

  set sfxVolume(value: number) {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    this.authenticatedUser.settings.sfxVolume = value;
    this.setCurrentMutedStateAndSaveVolumeSettingsToLocalStorage();

    this.authenticatedUser.syncSettings();
  }

  get authenticatedPlayer(): Player | null {
    if (!this.authenticatedUser) {
      throw new Error("Authenticated user required");
    }

    if (
      !this.entireGame ||
      !(this.entireGame.childGameState instanceof IngameGameState)
    ) {
      return null;
    }

    if (this.entireGame.childGameState.players.has(this.authenticatedUser)) {
      return this.entireGame.childGameState.players.get(this.authenticatedUser);
    } else {
      return null;
    }
  }

  get isMapScrollbarSet(): boolean {
    return !isMobile && (this.authenticatedUser?.settings.mapScrollbar ?? true);
  }

  private setCurrentMutedStateAndSaveVolumeSettingsToLocalStorage(): void {
    if (!this.authenticatedUser) {
      return;
    }

    if (
      this.musicVolume == 0 &&
      this.notificationsVolume == 0 &&
      this.sfxVolume == 0
    ) {
      this.authenticatedUser.settings.muted = true;
    } else {
      this.authenticatedUser.settings.muted = false;
    }

    localStorage.setItem(
      "volumeSettings",
      JSON.stringify(this.currentVolumeSettings),
    );
  }

  constructor(authData: AuthData) {
    this.authData = authData;
  }

  start(): void {
    const websocketHost =
      location.hostname == "localhost"
        ? "ws://localhost:5000"
        : "wss://play." + location.hostname;

    console.log(`Connecting to ${websocketHost}`);

    this.socket = new WebSocket(websocketHost);
    this.connectionState = ConnectionState.CONNECTING;

    this.socket.onopen = () => {
      // Heroku timeouts a WebSocket connection after 55 seconds of inactivity.
      // To prevent this, the client sends a ping regurarly
      this.pingInterval = window.setInterval(
        () => this.send({ type: "ping" }),
        30 * 1000,
      );
      this.onOpen();
    };
    this.socket.onerror = () => {
      this.clearPingInterval();
      this.onError();
      this.isReconnecting = false;
    };
    this.socket.onmessage = (data: MessageEvent) => {
      this.onMessage(data.data as string);
    };
    this.socket.onclose = () => {
      this.clearPingInterval();
      this.onClose();
      this.isReconnecting = false;
    };
  }

  reconnect(): void {
    if (this.connectionState == ConnectionState.CLOSED) {
      this.isReconnecting = true;
      this.start();
    }
  }

  clearPingInterval(): void {
    if (this.pingInterval > -1) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = -1;
    }
  }

  /**
   * Returns whether the given house is controlled by the authenticated player,
   * either because it is the directy controled house, or because it's one of its vassals.
   * @param house
   */
  doesControlHouse(house: House | null): boolean {
    if (
      this.entireGame == null ||
      !(this.entireGame.childGameState instanceof IngameGameState)
    ) {
      throw new Error("EntireGame with IngameGameState is required");
    }

    const ingame = this.entireGame.childGameState;

    if (house == null) {
      return false;
    }

    const player = this.authenticatedPlayer;

    if (player) {
      // Houses may be uncontrolled during Claim Vassals state and getControllerOfHouse will throw an error.
      // We have to catch it here
      try {
        return ingame.getControllerOfHouse(house) == player;
      } catch {
        return false;
      }
    } else {
      return false;
    }
  }

  canActAsOwner(): boolean {
    if (!this.entireGame || !this.authenticatedUser) {
      console.error("EntireGame and authenticated user are required");
      return false;
    }

    return this.entireGame.canActAsOwner(this.authenticatedUser);
  }

  isRealOwner(): boolean {
    if (!this.entireGame || !this.authenticatedUser) {
      console.error("EntireGame and authenticated user are required");
      return false;
    }

    return this.entireGame.isRealOwner(this.authenticatedUser);
  }

  onOpen(): void {
    // Authenticate
    this.send({
      type: "authenticate",
      authData: this.authData,
    });

    this.connectionState = ConnectionState.AUTHENTICATING;
  }

  onMessage(data: string): void {
    let message: ServerMessage | null = null;

    try {
      message = JSON.parse(decompress(data)) as ServerMessage;
    } catch (e) {
      console.error("Error occured while parsing server message");
      console.error(e);
      return;
    }

    //console.debug(`Received ${message.type}`);
    //console.debug(message);

    if (message.type == "authenticate-response") {
      const previousVersion = this.entireGame?.stateVersion ?? -1;
      this.entireGame = EntireGame.deserializeFromServer(message.game);
      // Increment version to force components to re-render with new user references
      this.entireGame.stateVersion = previousVersion + 1;

      this.entireGame.onSendClientMessage = (message: ClientMessage) => {
        this.send(message);
      };

      this.authenticated = true;
      this.authenticatedUser = this.entireGame.users.get(message.userId);

      // Connect the public chat room
      this.chatClient.addChannel(this.entireGame.publicChatRoomId);

      // Connect to the private chat rooms
      this.entireGame
        .getPrivateChatRoomsOf(this.authenticatedUser)
        .forEach(({ roomId }) => this.chatClient.addChannel(roomId));

      this.connectionState = ConnectionState.SYNCED;
      this.isReconnecting = false;
      this.loadVolumeSettingsFromLocalStorage();
    } else if (message.type == "new-private-chat-room") {
      if (this.entireGame == null) {
        return;
      }

      // Launch a WebSocket connection to this chat room
      this.chatClient.addChannel(message.roomId);

      // @ts-expect-error this.entireGame is always non-null here!
      const users = message.users.map((uid) => this.entireGame.users.get(uid));
      const initiator = this.entireGame.users.get(message.initiator);

      if (!this.entireGame.privateChatRoomsIds.has(users[0])) {
        this.entireGame.privateChatRoomsIds.set(users[0], new BetterMap());
      }

      this.entireGame.privateChatRoomsIds
        .get(users[0])
        .set(users[1], message.roomId);
      if (
        this.entireGame.onNewPrivateChatRoomCreated &&
        this.isAuthenticatedUser(initiator)
      ) {
        this.entireGame.onNewPrivateChatRoomCreated(message.roomId);
      }
    } else if (message.type == "clear-chat-room") {
      const channel = this.chatClient.channels.tryGet(message.roomId, null);
      if (channel) {
        channel.messages = [];
      }
    } else {
      if (!this.entireGame) {
        console.error(
          'Message other than "authenticate-response" received but entireGame == null',
        );
        return;
      }

      this.entireGame.onServerMessage(message);
    }
  }

  isOwnTurn(): boolean {
    if (!this.entireGame || !this.authenticatedUser) {
      throw new Error("isOwnTurn() requires entireGame and authenticatedUser");
    }

    return this.entireGame.getWaitedUsers().includes(this.authenticatedUser);
  }

  onError(): void {
    this.setDisconnectedState();
  }

  onClose(): void {
    this.setDisconnectedState();
  }

  send(message: ClientMessage): void {
    //console.debug("Sending:");
    //console.debug(message);
    const compressedData = compress(JSON.stringify(message));

    this.socket?.send(compressedData);
  }

  isAuthenticatedUser(user: User): boolean {
    return this.authenticatedUser == user;
  }

  setDisconnectedState(): void {
    this.connectionState = ConnectionState.CLOSED;
    this.entireGame = null;
    this.authenticated = false;
    this.authenticatedUser = null;
    this.isReconnecting = false;
  }

  private loadVolumeSettingsFromLocalStorage(): void {
    const item = localStorage.getItem("volumeSettings");
    if (!item) {
      return;
    }

    const volumeSettings = JSON.parse(item);
    this.currentVolumeSettings = volumeSettings;
    this.setCurrentMutedStateAndSaveVolumeSettingsToLocalStorage();
  }
}
