import { ServerMessage } from "../messages/ServerMessage";
import SerializedUserSettings from "../messages/SerializedUserSettings";
import * as WebSocket from "ws";
import EntireGame from "../common/EntireGame";
import { observable } from "mobx";
import _ from "lodash";

export default class User {
  _id: string;
  get id(): string {
    if (this.entireGame.userIdToFakeIdMap.has(this._id))
      return this.entireGame.userIdToFakeIdMap.get(this._id);
    return this._id;
  }
  set id(value: string) {
    this._id = value;
  }
  @observable name: string;
  facelessName?: string;
  @observable settings: UserSettings;
  entireGame: EntireGame;
  connectedClients: WebSocket[] = [];
  @observable otherUsersFromSameNetwork: Set<string> = new Set<string>();
  @observable connected: boolean;
  @observable note = "";
  onConnectionStateChanged: ((user: User) => void) | null = null;

  debouncedSyncSettings = _.debounce(
    () => {
      this.entireGame.sendMessageToServer({
        type: "change-settings",
        settings: this.settings.serializeToClient()
      });
    },
    500,
    { trailing: true }
  );

  constructor(
    id: string,
    name: string,
    facelessName: string,
    game: EntireGame,
    settings: UserSettings,
    connected = false,
    otherUsersFromSameNetwork: string[] = []
  ) {
    this.id = id;
    this.name = name;
    this.facelessName = facelessName;
    this.settings = settings;
    this.entireGame = game;
    this.connected = connected;
    this.otherUsersFromSameNetwork = new Set(otherUsersFromSameNetwork);
  }

  send(message: ServerMessage): void {
    this.entireGame.sendMessageToClients([this], message);
  }

  syncSettings(flush = false): void {
    this.debouncedSyncSettings();

    // Bypasses the debounce delay so the change reaches the server before e.g. the tab closes
    if (flush) {
      this.debouncedSyncSettings.flush();
    }
  }

  updateConnectionStatus(): void {
    const newConnected = this.connectedClients.length > 0;

    if (newConnected != this.connected) {
      this.connected = newConnected;

      this.entireGame.broadcastToClients({
        type: "update-connection-status",
        user: this.id,
        status: this.connected
      });

      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(this);
      }
    }
  }

  serializeToClient(admin: boolean, user: User | null): SerializedUser {
    const hideUserName = this.entireGame.gameSettings.faceless;
    return {
      id: admin ? this._id : this.id,
      name: admin
        ? this.name
        : hideUserName
          ? (this.facelessName ?? this.name)
          : this.name,
      facelessName: admin ? this.facelessName : undefined,
      settings:
        admin || user == this ? this.settings.serializeToClient() : undefined,
      connected: this.connected ? true : undefined,
      otherUsersFromSameNetwork:
        this.otherUsersFromSameNetwork.size > 0
          ? Array.from(this.otherUsersFromSameNetwork)
          : undefined,
      note:
        admin || user == this
          ? this.note != ""
            ? this.note
            : undefined
          : undefined
    };
  }

  static deserializeFromServer(game: EntireGame, data: SerializedUser): User {
    const user = new User(
      data.id,
      data.name,
      data.facelessName ?? data.name,
      game,
      data.settings
        ? UserSettings.deserializeFromServer(data.settings)
        : new UserSettings(),
      data.connected,
      data.otherUsersFromSameNetwork
    );
    user.note = data.note ?? "";
    return user;
  }
}

export class UserSettings implements SerializedUserSettings {
  mapScrollbar: boolean;
  chatHouseNames: boolean;
  lastOpenedTab?: string;
  closedChats: string[];
  gameStateColumnRight: boolean;
  muted: boolean;
  notificationsVolume: number;
  musicVolume: number;
  sfxVolume: number;

  constructor() {
    this.closedChats = [];
    this.chatHouseNames = false;
    this.mapScrollbar = false;
    this.muted = false;
    this.gameStateColumnRight = false;
    this.musicVolume = 1;
    this.notificationsVolume = 1;
    this.sfxVolume = 1;
  }

  serializeToClient(): SerializedUserSettings {
    return {
      mapScrollbar: this.mapScrollbar ? true : undefined,
      chatHouseNames: this.chatHouseNames ? true : undefined,
      lastOpenedTab: this.lastOpenedTab,
      closedChats: this.closedChats.length > 0 ? this.closedChats : undefined,
      gameStateColumnRight: this.gameStateColumnRight ? true : undefined,
      muted: this.muted ? true : undefined,
      notificationsVolume:
        this.notificationsVolume > 0 ? this.notificationsVolume : undefined,
      musicVolume: this.musicVolume != 0 ? this.musicVolume : undefined,
      sfxVolume: this.sfxVolume != 0 ? this.sfxVolume : undefined
    };
  }

  static deserializeFromServer(data: SerializedUserSettings): UserSettings {
    const settings = new UserSettings();
    settings.mapScrollbar = data.mapScrollbar ?? false;
    settings.chatHouseNames = data.chatHouseNames ?? false;
    settings.lastOpenedTab = data.lastOpenedTab;
    settings.closedChats = data.closedChats ?? [];
    settings.gameStateColumnRight = data.gameStateColumnRight ?? false;
    settings.muted = data.muted ?? false;
    settings.notificationsVolume = data.notificationsVolume ?? 0;
    settings.musicVolume = data.musicVolume ?? 0;
    settings.sfxVolume = data.sfxVolume ?? 0;
    return settings;
  }
}

export interface SerializedUser {
  id: string;
  name: string;
  facelessName?: string;
  settings?: SerializedUserSettings;
  connected?: boolean;
  otherUsersFromSameNetwork?: string[];
  note?: string;
}
