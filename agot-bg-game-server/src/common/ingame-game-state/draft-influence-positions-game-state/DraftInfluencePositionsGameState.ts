import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import EntireGame from "../../EntireGame";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import BetterMap from "../../../utils/BetterMap";
import Game from "../game-data-structure/Game";
import _ from "lodash";
import { observable } from "mobx";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../simple-choice-game-state/SimpleChoiceGameState";
import { draftOrders, DraftStep } from "../draft-house-cards-game-state/DraftHouseCardsGameState";

export default class DraftInfluencePositionsGameState extends GameState<IngameGameState, SimpleChoiceGameState> {
    houses: House[];
    draftOrder: number[][];
    vassalsOnInfluenceTracks: House[][];
    @observable currentRowIndex: number;
    @observable currentColumnIndex: number;

    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(vassalsOnInfluenceTracks: House[][]): void {
        this.houses = _.shuffle(this.ingame.players.values.map(p => p.house));
        this.draftOrder = draftOrders[this.houses.length - 1];
        this.currentRowIndex = 0;
        this.currentColumnIndex = -1;
        this.vassalsOnInfluenceTracks = vassalsOnInfluenceTracks;

        this.proceedNextHouse();
    }

    proceedNextHouse(): void {
        const houseToResolve = this.getNextHouse();

        if (houseToResolve == null) {
            this.game.houseCardsForDrafting = new BetterMap();
            // Append vassals back to the tracks:
            for(let i=0; i<this.vassalsOnInfluenceTracks.length; i++) {
                this.game.influenceTracks[i].push(...this.vassalsOnInfluenceTracks[i]);
                this.entireGame.broadcastToClients({
                    type: "change-tracker",
                    tracker: this.game.influenceTracks[i].map(h => h.id),
                    trackerI: i
                });
            }

            this.ingame.beginNewTurn();
            return;
        }

        const houseHasPositionOnAllInfluenceTracks = this.game.influenceTracks.every(track => track.includes(houseToResolve));

        if (houseHasPositionOnAllInfluenceTracks) {
            // This should never happen, but for safety we handle it
            this.proceedNextHouse();
            return;
        }

        this.proceedChooseInfluencePosition(houseToResolve);
    }

    proceedChooseInfluencePosition(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, "Choose an influence track.", this.getInfluenceChoicesForHouse(house).values);
    }

    getInfluenceChoicesForHouse(house: House): BetterMap<number, string> {
        const result = new BetterMap<number, string>();
        if (!this.game.ironThroneTrack.includes(house)) {
            result.set(0, "Iron Throne");
        }
        if (!this.game.fiefdomsTrack.includes(house)) {
            result.set(1, "Fiefdoms");
        }
        if (!this.game.kingsCourtTrack.includes(house)) {
            result.set(2, "King's Court");
        }
        return result;
    }

    getNextHouse(): House | null {
        // If all houses have positions in all 3 influence tracks return null
        if (this.game.influenceTracks.every(track => _.intersection(track, this.houses).length == this.houses.length)) {
            return null;
        }

        this.currentColumnIndex++;

        if (this.currentColumnIndex == this.houses.length) {
            this.currentColumnIndex = 0;
            this.currentRowIndex++;
            if (this.currentRowIndex == this.houses.length) {
                this.currentRowIndex = 0;
            }
        }

        this.ingame.entireGame.broadcastToClients({
            type: "update-draft-state",
            rowIndex: this.currentRowIndex,
            columnIndex: this.currentColumnIndex,
            draftStep: DraftStep.INFLUENCE_TRACK
        });

        return this.houses[this.draftOrder[this.currentRowIndex][this.currentColumnIndex]];
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        const trackIndex = this.getInfluenceChoicesForHouse(house).keys[choice];
            const track = this.game.influenceTracks[trackIndex];
            track.push(house);
            this.entireGame.broadcastToClients({
                type: "change-tracker",
                tracker: track.map(h => h.id),
                trackerI: trackIndex
            });

            this.ingame.log({
                type: "influence-track-position-chosen",
                house: house.id,
                trackerI: trackIndex,
                position: track.length
            });

            this.proceedNextHouse();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "update-draft-state") {
            this.currentRowIndex = message.rowIndex;
            this.currentColumnIndex = message.columnIndex;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDraftInfluencePositionsGameState {
        return {
            type: "draft-influence-positions",
            houses: this.houses.map(h => h.id),
            draftOrder: this.draftOrder,
            vassalsOnInfluenceTracks: this.vassalsOnInfluenceTracks.map(track => track.map(h => h.id)),
            currentRowIndex: this.currentRowIndex,
            currentColumnIndex: this.currentColumnIndex,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedDraftInfluencePositionsGameState): DraftInfluencePositionsGameState {
        const draftInfluencePositions = new DraftInfluencePositionsGameState(ingameGameState);

        draftInfluencePositions.houses = data.houses.map(hid => ingameGameState.game.houses.get(hid));
        draftInfluencePositions.draftOrder = data.draftOrder;
        draftInfluencePositions.vassalsOnInfluenceTracks = data.vassalsOnInfluenceTracks.map(track => track.map(hid => ingameGameState.game.houses.get(hid)));
        draftInfluencePositions.currentRowIndex = data.currentRowIndex;
        draftInfluencePositions.currentColumnIndex = data.currentColumnIndex;
        draftInfluencePositions.childGameState = draftInfluencePositions.deserializeChildGameState(data.childGameState);

        return draftInfluencePositions;
    }

    deserializeChildGameState(data: SerializedDraftInfluencePositionsGameState["childGameState"]): DraftInfluencePositionsGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        }
        else {
            throw new Error();
        }
    }

    /* Client-side only */
    getNextHouses(): House[] {
        let currentCol = this.currentColumnIndex;
        let currentRow = this.currentRowIndex;

        const houses: House[] = [];
        for(let i=0; i<this.houses.length; i++) {
            const nextIndices = this.getNextIndices(currentCol, currentRow);
            houses.push(this.houses[this.draftOrder[nextIndices.row][nextIndices.col]]);
            currentCol = nextIndices.col;
            currentRow = nextIndices.row;
        }
        return houses;
    }

    getNextIndices(colIndex: number, rowIndex: number): {row: number; col: number} {
        colIndex++;

        if (colIndex == this.houses.length) {
            colIndex = 0;
            rowIndex++;
            if (rowIndex == this.houses.length) {
                rowIndex = 0;
            }
        }

        return {row: rowIndex, col: colIndex};
    }
}

export interface SerializedDraftInfluencePositionsGameState {
    type: "draft-influence-positions";
    houses: string[];
    draftOrder: number[][];
    vassalsOnInfluenceTracks: string[][];
    currentRowIndex: number;
    currentColumnIndex: number;
    childGameState: SerializedSimpleChoiceGameState;
}
