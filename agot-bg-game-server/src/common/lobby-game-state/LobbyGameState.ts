import EntireGame, { GameSettings, NotificationType } from "../EntireGame";
import GameState from "../GameState";
import User from "../../server/User";
import {ClientMessage} from "../../messages/ClientMessage";
import {ServerMessage} from "../../messages/ServerMessage";
import {observable} from "mobx";
import BetterMap from "../../utils/BetterMap";
import baseGameData from "../../../data/baseGameData.json";
import CancelledGameState from "../cancelled-game-state/CancelledGameState";
import shuffle from "../../utils/shuffle";
import _ from "lodash";
import { MIN_PLAYER_COUNT_WITH_VASSALS } from "../ingame-game-state/game-data-structure/Game";
import { v4 } from "uuid";

export default class LobbyGameState extends GameState<EntireGame> {
    lobbyHouses: BetterMap<string, LobbyHouse>;
    @observable players = new BetterMap<LobbyHouse, User>();
    @observable password = "";

    get entireGame(): EntireGame {
        return this.parentGameState;
    }

    firstStart(): void {
        // Load the available houses for this game
        this.lobbyHouses = this.getLobbyHouses();
    }

    getLobbyHouses(): BetterMap<string, LobbyHouse> {
        return new BetterMap(
            Object.entries(baseGameData.houses)
                .map(([hid, h]) => [hid, {id: hid, name: h.name, color: h.color}])
        );
    }

    getAvailableHouses(): LobbyHouse[] {
        return this.lobbyHouses.values.filter(h => this.entireGame.selectedGameSetup.houses.includes(h.id));
    }

    onGameSettingsChange(): void {
        // Remove all chosen houses that are not available with the new settings
        const availableHouses = this.getAvailableHouses();
        const usersForReassignment: User[] = [];

        let dirty = false;
        this.players.keys.forEach(house => {
            if (!availableHouses.includes(house)) {
                dirty = true;
                usersForReassignment.push(this.players.get(house));
                this.players.delete(house);
            }
        });

        if (usersForReassignment.length > 0 && this.players.size < this.entireGame.selectedGameSetup.playerCount) {
            const freeHouses = _.difference(availableHouses, this.players.keys);

            while (freeHouses.length > 0 && usersForReassignment.length > 0) {
                this.players.set(freeHouses.shift() as LobbyHouse, usersForReassignment.shift() as User);
            }
        }

        if (dirty) {
            this.entireGame.broadcastToClients({
                type: "house-chosen",
                players: this.players.entries.map(([house, user]) => [house.id, user.id])
            });
        }
    }

    onClientMessage(user: User, message: ClientMessage): void {
        if (message.type == "launch-game") {
            if (!this.canStartGame(user).success) {
                return;
            }

            if (this.entireGame.gameSettings.randomHouses) {
                // Assign a random house to the players
                const allShuffledHouses = _.shuffle(this.getAvailableHouses());
                const connectedUsers = this.players.values;
                this.players = new BetterMap();
                for(const user of connectedUsers) {
                    this.players.set(allShuffledHouses.splice(0, 1)[0], user);
                }
            } else if (this.entireGame.gameSettings.randomChosenHouses) {
                const shuffled = shuffle(this.players.entries);

                    const lobbyHouses = this.players.keys;
                    for (let i = 0; i < shuffled.length; i++) {
                        this.players.set(lobbyHouses[i], shuffled[i][1]);
                    }
            }

            let housesToCreate = this.getAvailableHouses().map(h => h.id);
            if (this.entireGame.gameSettings.setupId == "learn-the-game" && !this.entireGame.gameSettings.vassals) {
                const lobbyHouses = this.players.keys.map(lh => lh.id);
                housesToCreate = housesToCreate.filter(h => lobbyHouses.includes(h));
            }

            this.entireGame.proceedToIngameGameState(
                housesToCreate,
                new BetterMap(this.players.map((h, u) => ([h.id, u])))
            );
        } else if (message.type == "kick-player") {
            const kickedUser = this.entireGame.users.get(message.user);

            if (!this.entireGame.isOwner(user) || kickedUser == user) {
                return;
            }

            this.setUserForLobbyHouse(null, kickedUser);
        } else if (message.type == "cancel-game") {
            if (!this.entireGame.isOwner(user)) {
                return;
            }

            this.entireGame.setChildGameState(new CancelledGameState(this.entireGame)).firstStart();
        } else if (message.type == "choose-house") {
            const house = message.house ? this.lobbyHouses.get(message.house) : null;

            // Check if the house is available
            if (house && (this.players.has(house) || !this.getAvailableHouses().includes(house))) {
                return;
            }

            // Check password if a password is set and player has chosen a house (i.e. house != null to always allow leaving)
            if (this.password != "" &&
                house &&
                this.password != message.password &&
                !this.entireGame.isRealOwner(user)) {
                return;
            }

            this.setUserForLobbyHouse(house, user);
        } else if (message.type == "set-password") {
            let answer = v4();
            if (this.entireGame.isRealOwner(user)) {
                this.password = message.password;
                // If owner has reset the password, send "" to the clients
                // Otherwise send a GUID so their password validation check fails
                this.entireGame.sendMessageToClients(_.without(this.entireGame.users.values, user), {
                    type: "password-response",
                    password: message.password == "" ? "" : answer
                });
                // Always send back the chosen password to the owner
                answer = message.password;
            } else {
                // If user sent the correct password, or no password is set
                // send password back the correct password
                if (this.password == "" || this.password == message.password) {
                    answer = this.password;
                }
            }

            this.entireGame.sendMessageToClients([user], {
                type: "password-response",
                password: answer
            });
        } else if (message.type == "change-game-settings") {
            let settings =  message.settings as GameSettings;
            if (this.players.size > settings.playerCount) {
                // A variant which contains less players than connected is not allowed
                settings = this.entireGame.gameSettings;
            }

            if (settings.setupId == "a-dance-with-dragons") {
                settings.adwdHouseCards = true;
            }

            if (settings.thematicDraft) {
                settings.draftHouseCards = true;
                settings.limitedDraft = false;
            }

            if (settings.draftHouseCards && !settings.limitedDraft) {
                settings.adwdHouseCards = false;
            }

            if (settings.limitedDraft) {
                settings.draftHouseCards = true;
                settings.thematicDraft = false;
            }

            // Allow disabling MoD options but enable them when switching to this setup
            if (this.entireGame.gameSettings.setupId != "mother-of-dragons" && settings.setupId == "mother-of-dragons") {
                settings.vassals = true;
                settings.seaOrderTokens = true;
                settings.allowGiftingPowerTokens = true;
                settings.startWithSevenPowerTokens = true;
            }

            // Reset the MoD settings
            if (this.entireGame.gameSettings.setupId == "mother-of-dragons" && settings.setupId != "mother-of-dragons") {
                settings.vassals = false;
                settings.seaOrderTokens = false;
                settings.allowGiftingPowerTokens = false;
                settings.startWithSevenPowerTokens = false;
            }

            this.entireGame.gameSettings = settings;

            this.onGameSettingsChange();

            this.entireGame.broadcastToClients({
                type: "game-settings-changed",
                settings: settings
            });
        }
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
            players: this.players.entries.map(([house, user]) => [house.id, user.id])
        });

        this.notifyOwnerWhenGameCanBestarted();
    }

    notifyOwnerWhenGameCanBestarted(): void {
        if (!this.entireGame.users.has(this.entireGame.ownerUserId)) {
            return;
        }

        const owner = this.entireGame.users.get(this.entireGame.ownerUserId);

        if (this.canStartGame(owner).success) {
            this.entireGame.notifyUsers([owner], NotificationType.READY_TO_START);
        }
    }

    canStartGame(user: User): {success: boolean; reason: string} {
        if (!this.entireGame.isOwner(user)) {
            return {success: false, reason: "not-owner"};
        }

        // If Vassals are toggled we need at least min_player_count_with_vassals
        if (this.entireGame.gameSettings.vassals) {
            if (this.players.size < MIN_PLAYER_COUNT_WITH_VASSALS && this.players.size != this.entireGame.selectedGameSetup.playerCount) {
                return {success: false, reason: "not-enough-players"};
            }
        } else if (this.players.size < this.entireGame.selectedGameSetup.playerCount) {
            return {success: false, reason: "not-enough-players"};
        }

        return {success: true, reason: "ok"};
    }

    canCancel(user: User):  {success: boolean; reason: string} {
        if (!this.entireGame.isRealOwner(user)) {
            return {success: false, reason: "not-owner"};
        }

        return {success: true, reason: "ok"};
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "house-chosen") {
            this.players = new BetterMap(message.players.map(([hid, uid]) => [
                this.lobbyHouses.get(hid),
                this.entireGame.users.get(uid)
            ]));

            if (this.entireGame.onClientGameStateChange) {
                // Fake a game state change to play a sound also in case lobby is full
                this.entireGame.onClientGameStateChange();
            }
        } else if (message.type == "password-response") {
            this.password = message.password;
        }
    }

    chooseHouse(house: LobbyHouse | null, password: string): void {
        this.entireGame.sendMessageToServer({
            type: "choose-house",
            house: house ? house.id : null,
            password: password
        });
    }

    start(): void {
        this.entireGame.sendMessageToServer({
            type: "launch-game"
        });
    }

    cancel(): void {
        this.entireGame.sendMessageToServer({
            type: "cancel-game"
        });
    }

    kick(user: User): void {
        this.entireGame.sendMessageToServer({
            type: "kick-player",
            user: user.id
        });
    }

    sendPassword(password: string): void {
        this.entireGame.sendMessageToServer({
            type: "set-password",
            password: password
        });
    }

    getWaitedUsers(): User[] {
        if (!this.entireGame.users.has(this.entireGame.ownerUserId)) {
            return [];
        }

        const owner = this.entireGame.users.get(this.entireGame.ownerUserId);

        return this.canStartGame(owner).success ? [owner] : [];
    }

    serializeToClient(admin: boolean, user: User | null): SerializedLobbyGameState {
        return {
            type: "lobby",
            lobbyHouses: this.lobbyHouses.values,
            players: this.players.entries.map(([h, u]) => [h.id, u.id]),
            password: this.password == "" ||
                admin || (user && this.entireGame.isRealOwner(user))
                ? this.password
                : v4()
        };
    }

    static deserializeFromServer(entireGame: EntireGame, data: SerializedLobbyGameState): LobbyGameState {
        const lobbyGameState = new LobbyGameState(entireGame);

        lobbyGameState.lobbyHouses = new BetterMap(data.lobbyHouses.map(h => [h.id, h]));
        lobbyGameState.players = new BetterMap(data["players"].map(([hid, uid]) => [lobbyGameState.lobbyHouses.get(hid), entireGame.users.get(uid)]));
        lobbyGameState.password = data.password;

        return lobbyGameState;
    }
}

export interface SerializedLobbyGameState {
    type: "lobby";
    players: [string, string][];
    lobbyHouses: LobbyHouse[];
    password: string;
}

export interface LobbyHouse {
    id: string;
    name: string;
    color: string;
}
