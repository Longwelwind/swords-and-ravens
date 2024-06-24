import GameState from "../../../GameState";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import House from "../../game-data-structure/House";
import { observable } from "mobx";
import DraftGameState from "../DraftGameState";
import DraftMapGameState from "../draft-map-game-state/DraftMapGameState";
import User from "../../../../server/User";
import IngameGameState from "../../IngameGameState";
import _ from "lodash";

export default class AgreeOnGameStartGameState extends GameState<DraftGameState> {
    @observable readyHouses: House[];

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    constructor(draftMap: DraftGameState) {
        super(draftMap);
    }

    firstStart(): void {
        this.readyHouses = [];
    }

    getNotReadyPlayers(): Player[] {
        return _.without(this.parentGameState.participatingHouses, ...this.readyHouses).map(h => this.ingame.getControllerOfHouse(h));
    }

    getWaitedUsers(): User[] {
        return this.getNotReadyPlayers().map(p => p.user);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "ready") {
            if (!this.readyHouses.includes(player.house)) {
                this.readyHouses.push(player.house);
            }

            this.entireGame.broadcastToClients({
                type: "player-ready",
                userId: player.user.id
            });

            if (this.getNotReadyPlayers().length == 0) {
                this.parentGameState.onDraftMapGameStateEnd();
            }
        } else if (message.type == "unready") {
            this.parentGameState.setChildGameState(new DraftMapGameState(this.parentGameState)).firstStart();
        }
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "player-ready") {
            const player = this.ingame.players.get(this.entireGame.users.get(message.userId));
            if (!this.readyHouses.includes(player.house)) {
                this.readyHouses.push(player.house);
            }
        }
    }

    agree(): void {
        this.entireGame.sendMessageToServer({
            type: "ready"
        });
    }

    disagree(): void {
        this.entireGame.sendMessageToServer({
            type: "unready"
        });
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedAgreeOnGameStartGameState {
        return {
            type: "agree-on-game-start",
            readyHouses: this.readyHouses.map(h => h.id)
        };
    }

    static deserializeFromServer(draft: DraftGameState, data: SerializedAgreeOnGameStartGameState): AgreeOnGameStartGameState {
        const agreeOnGameStart = new AgreeOnGameStartGameState(draft);
        agreeOnGameStart.readyHouses = data.readyHouses.map(hid => draft.ingame.game.houses.get(hid));
        return agreeOnGameStart;
    }
}

export interface SerializedAgreeOnGameStartGameState {
    type: "agree-on-game-start";
    readyHouses: string[];
}
