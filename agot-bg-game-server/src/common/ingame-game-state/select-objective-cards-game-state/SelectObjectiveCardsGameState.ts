import GameState from "../../GameState";
import Game from "../game-data-structure/Game";
import House from "../game-data-structure/House";
import {ServerMessage} from "../../../messages/ServerMessage";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";
import { ObjectiveCard } from "../game-data-structure/static-data-structure/ObjectiveCard";
import { objectiveCards } from "../game-data-structure/static-data-structure/objectiveCards";
import BetterMap from "../../../utils/BetterMap";
import { observable } from "mobx";

interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;

    onObjectiveCardsSelected(house: House, selectedObjectiveCards: ObjectiveCard[], resolvedAutomatically: boolean): void;
    onSelectObjectiveCardsFinish(): void;
}

export default class SelectObjectiveCardsGameState<P extends ParentGameState> extends GameState<P> {
    @observable selectableCardsPerHouse: BetterMap<House, ObjectiveCard[]>;
    count: number;
    canBeSkipped: boolean;
    @observable readyHouses: BetterMap<House, ObjectiveCard[]>;

    get participatingHouses(): House[] {
        return this.selectableCardsPerHouse.keys;
    }

    get notReadyHouses(): House[] {
        return this.participatingHouses.filter(h => !this.readyHouses.has(h));
    }

    firstStart(selectableCardsPerHouse: [House, ObjectiveCard[]][], count: number, canBeSkipped: boolean): void {
        this.selectableCardsPerHouse = new BetterMap(selectableCardsPerHouse);
        this.count = count;
        this.canBeSkipped = canBeSkipped;
        this.readyHouses = new BetterMap();

        if (this.selectableCardsPerHouse.values.some(ocs => ocs.length == 0) && !canBeSkipped) {
            throw new Error("SelectObjectiveCardsGameState called with objectiveCards.length == 0!");
        }

        if (!this.canBeSkipped) {
            this.selectableCardsPerHouse.keys.forEach(h => {
                if (this.selectableCardsPerHouse.get(h).length == count) {
                    this.parentGameState.onObjectiveCardsSelected(h, this.selectableCardsPerHouse.get(h), true);
                    this.readyHouses.set(h, this.selectableCardsPerHouse.get(h));
                }
            });

            this.checkAndProceedEndOfSelectObjectives();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-objectives") {
            const house = player.house;
            if (!this.participatingHouses.includes(house) || this.readyHouses.has(house)) {
                return;
            }

            if (!this.canBeSkipped && message.objectives.length != this.count) {
                return;
            }

            if (message.objectives.length > this.count) {
                return;
            }

            if (message.objectives.some(ocid => !objectiveCards.has(ocid))) {
                return;
            }

            const selectableObjectives = this.selectableCardsPerHouse.get(house);
            const selectedObjectives = message.objectives.map(ocid => objectiveCards.get(ocid));

            if (selectedObjectives.some(oc => !selectableObjectives.includes(oc))) {
                return;
            }

            this.parentGameState.onObjectiveCardsSelected(house, selectedObjectives, false);

            this.readyHouses.set(house, selectedObjectives);
            this.entireGame.broadcastToClients({
                type: "player-ready",
                userId: player.user.id
            });

            this.checkAndProceedEndOfSelectObjectives();
        }
    }

    checkAndProceedEndOfSelectObjectives(): void {
        if (this.notReadyHouses.length == 0) {
            this.parentGameState.onSelectObjectiveCardsFinish();
        }
    }

    getWaitedUsers(): User[] {
        return this.notReadyHouses.map(h => this.parentGameState.ingame.getControllerOfHouse(h).user);
    }

    select(objectives: ObjectiveCard[]): void {
        this.parentGameState.entireGame.sendMessageToServer({
            type: "select-objectives",
            objectives: objectives.map(oc => oc.id)
        });
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "player-ready") {
            if (message.userId != "") {
                const player = this.parentGameState.ingame.players.get(this.entireGame.users.get(message.userId));
                // On client-side only set an empty array for the selected objectives to not reveal the choice to other houses
                this.readyHouses.set(player.house, []);
            } else {
                this.parentGameState.ingame.getVassalHouses().forEach(h => this.readyHouses.set(h, []));
            }
        } else if (message.type == "update-selectable-objectives") {
            const house = this.parentGameState.game.houses.get(message.house);
            const objectives = message.selectableObjectives.map(ocid => objectiveCards.get(ocid));
            this.selectableCardsPerHouse.set(house, objectives);
        }
    }

    actionAfterVassalReplacement(newVassal: House): void {
        this.readyHouses.set(newVassal, []);
        this.entireGame.broadcastToClients({
            type: "player-ready",
            userId: ""
        });

        this.checkAndProceedEndOfSelectObjectives();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSelectObjectiveCardsGameState {
        return {
            type: "select-objectives",
            selectableCardsPerHouse: this.selectableCardsPerHouse.entries.map(([h, ocs]) => [h.id, admin || player?.house == h ? ocs.map(oc => oc.id) : []]),
            count: this.count,
            canBeSkipped: this.canBeSkipped,
            readyHouses: this.readyHouses.entries.map(([h, ocs]) => [h.id, admin || player?.house == h ? ocs.map(oc => oc.id) : []])
        };
    }

    static deserializeFromServer<P extends ParentGameState>(parent: P, data: SerializedSelectObjectiveCardsGameState): SelectObjectiveCardsGameState<P> {
        const selectObjectiveCardsGameState = new SelectObjectiveCardsGameState(parent);

        selectObjectiveCardsGameState.selectableCardsPerHouse = new BetterMap(data.selectableCardsPerHouse.map(([hid, ocids]) => [parent.game.houses.get(hid), ocids.map(ocid => objectiveCards.get(ocid))]));
        selectObjectiveCardsGameState.count = data.count;
        selectObjectiveCardsGameState.canBeSkipped = data.canBeSkipped;
        selectObjectiveCardsGameState.readyHouses = new BetterMap(data.readyHouses.map(([hid, ocids]) => [parent.game.houses.get(hid), ocids.map(ocid => objectiveCards.get(ocid))]));

        return selectObjectiveCardsGameState;
    }
}

export interface SerializedSelectObjectiveCardsGameState {
    type: "select-objectives";
    selectableCardsPerHouse: [string, string[]][];
    count: number;
    canBeSkipped: boolean;
    readyHouses: [string, string[]][];
}
