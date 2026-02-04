import { ServerMessage } from "../messages/ServerMessage";
import * as WebSocket from "ws";
import EntireGame from "../common/EntireGame";
import { UserSettings } from "../messages/ClientMessage";
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
  @observable facelessName: string;
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
        settings: this.settings,
      });
    },
    500,
    { trailing: true },
  );

  constructor(
    id: string,
    name: string,
    facelessName: string,
    game: EntireGame,
    settings: UserSettings,
    connected = false,
    otherUsersFromSameNetwork: string[] = [],
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

  syncSettings(): void {
    this.debouncedSyncSettings();
  }

  updateConnectionStatus(): void {
    const newConnected = this.connectedClients.length > 0;

    if (newConnected != this.connected) {
      this.connected = newConnected;

      this.entireGame.broadcastToClients({
        type: "update-connection-status",
        user: this.id,
        status: this.connected,
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
      name: admin ? this.name : hideUserName ? this.facelessName : this.name,
      facelessName: this.facelessName,
      settings: admin || user == this ? this.settings : undefined,
      connected: this.connected,
      otherUsersFromSameNetwork: Array.from(this.otherUsersFromSameNetwork),
      note: admin || user == this ? this.note : "",
    };
  }

  static deserializeFromServer(game: EntireGame, data: SerializedUser): User {
    const emptySettings: UserSettings = {
      chatHouseNames: false,
      // Todo: Get rid of this as well and define two layouts for mobile and desktop
      mapScrollbar: false,
      muted: false,
      gameStateColumnRight: false,
      musicVolume: 0,
      notificationsVolume: 0,
      sfxVolume: 0,
    };
    const user = new User(
      data.id,
      data.name,
      data.facelessName,
      game,
      data.settings ?? emptySettings,
      data.connected,
      data.otherUsersFromSameNetwork,
    );
    user.note = data.note;
    return user;
  }
}

export interface SerializedUser {
  id: string;
  name: string;
  facelessName: string;
  settings?: UserSettings;
  connected: boolean;
  otherUsersFromSameNetwork: string[];
  note: string;
}
