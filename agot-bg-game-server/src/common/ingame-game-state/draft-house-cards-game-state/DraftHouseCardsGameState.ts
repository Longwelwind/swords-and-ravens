import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import EntireGame from "../../EntireGame";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import BetterMap from "../../../utils/BetterMap";
import Game from "../game-data-structure/Game";
import SelectHouseCardGameState, { SerializedSelectHouseCardGameState } from "../select-house-card-game-state/SelectHouseCardGameState";
import HouseCard from "../game-data-structure/house-card/HouseCard";
import _ from "lodash";
import { observable } from "mobx";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../simple-choice-game-state/SimpleChoiceGameState";

export const draftOrders: number[][][] = [
        [
            [ 0 ]
        ],
        [
            [0, 1],
            [1, 0]
        ],
        [
            [0, 1, 2],
            [1, 2, 0],
            [2, 0, 1]
        ],
        [
            [0, 1, 2, 3],
            [2, 3, 1, 0],
            [1, 0, 3, 2],
            [3, 2, 0, 1]
        ],
        [
            [0, 1, 2, 3, 4],
            [2, 4, 3, 1, 0],
            [1, 0, 4, 2, 3],
            [4, 3, 1, 0, 2],
            [3, 2, 0, 4, 1]
        ],
        [
            [0, 1, 2, 3, 4, 5],
            [3, 5, 4, 2, 1, 0],
            [2, 0, 1, 4, 5, 3],
            [4, 3, 5, 1, 0, 2],
            [1, 2, 0, 5, 3, 4],
            [5, 4, 3, 0, 2, 1]
        ],
        [
            [0, 1, 2, 3, 4, 5, 6],
            [3, 6, 5, 4, 1, 2, 0],
            [2, 0, 6, 1, 5, 3, 4],
            [1, 4, 3, 0, 2, 6, 5],
            [6, 5, 4, 2, 0, 1, 3],
            [4, 3, 1, 5, 6, 0, 2],
            [5, 2, 0, 6, 3, 4, 1]
        ]
    ];

export const houseCardCombatStrengthAllocations = new BetterMap<number, number>(
    [
        [0, 1],
        [1, 2],
        [2, 2],
        [3, 1],
        [4, 1]
    ]);

export enum DraftStep {
    DECIDE,
    HOUSE_CARD,
    INFLUENCE_TRACK
}

export default class DraftHouseCardsGameState extends GameState<IngameGameState, SelectHouseCardGameState<DraftHouseCardsGameState> | SimpleChoiceGameState> {
    houses: House[];
    draftOrder: number[][];
    @observable draftStep: DraftStep;
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

    firstStart(): void {
        this.ingame.log({
            type: "draft-house-cards-began"
        });

        this.houses = _.shuffle(this.ingame.players.values.map(p => p.house));
        this.draftOrder = draftOrders[this.houses.length - 1];
        this.currentRowIndex = 0;
        this.currentColumnIndex = -1;
        this.vassalsOnInfluenceTracks = this.game.influenceTracks.map(track => [...track]);

        // Clear the influence tracks:
        for(let i=0; i<this.game.influenceTracks.length; i++) {
            this.game.influenceTracks[i].length = 0;
        }

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

        const houseHasFullHand = houseToResolve.houseCards.size == 7;
        const houseHasPositionOnAllInfluenceTracks = this.game.influenceTracks.every(track => track.includes(houseToResolve));

        if (houseHasFullHand && houseHasPositionOnAllInfluenceTracks) {
            // This should never happen, but for safety we handle it
            this.proceedNextHouse();
            return;
        }

        if (houseHasFullHand) {
            this.proceedChooseInfluencePosition(houseToResolve);
            return;
        }

        if (houseHasPositionOnAllInfluenceTracks) {
            this.proceedSelectHouseCard(houseToResolve);
            return;
        }

        this.draftStep = DraftStep.DECIDE;
        this.updateDraftState();
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(houseToResolve,
            "Decide whether to choose an Influence track position or to select a House card.",
            ["House card", "Influence track"]);
    }

    proceedSelectHouseCard(house: House): void {
        this.draftStep = DraftStep.HOUSE_CARD;
        this.updateDraftState();
        this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, this.getFilteredHouseCardsForHouse(house));
    }

    proceedChooseInfluencePosition(house: House): void {
        this.draftStep = DraftStep.INFLUENCE_TRACK;
        this.updateDraftState();
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

    getAllHouseCards(): HouseCard[] {
        return _.sortBy(_.concat(
                this.game.houseCardsForDrafting.values,
                _.flatMap(this.game.houses.values.map(h => h.houseCards.values))), hc => -hc.combatStrength);
    }

    getFilteredHouseCardsForHouse(house: House): HouseCard[] {
        let availableCards = _.sortBy(this.game.houseCardsForDrafting.values, hc => -hc.combatStrength);
        house.houseCards.forEach(card => {
            const countOfCardsWithThisCombatStrength = house.houseCards.values.filter(hc => hc.combatStrength == card.combatStrength).length;
            if (houseCardCombatStrengthAllocations.get(card.combatStrength) == countOfCardsWithThisCombatStrength) {
                availableCards = availableCards.filter(hc => hc.combatStrength != card.combatStrength);
            }
        });

        return availableCards;
    }

    getNextHouse(): House | null {
        // If all houses have 7 house cards and all houses have positions in all 3 influence tracks return null
        if (this.houses.every(h => h.houseCards.size == 7) &&
            this.game.influenceTracks.every(track => _.intersection(track, this.houses).length == this.houses.length)) {
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

        this.updateDraftState();

        return this.houses[this.draftOrder[this.currentRowIndex][this.currentColumnIndex]];
    }

    private updateDraftState(): void {
        this.ingame.entireGame.broadcastToClients({
            type: "update-draft-state",
            rowIndex: this.currentRowIndex,
            columnIndex: this.currentColumnIndex,
            draftStep: this.draftStep
        });
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (this.draftStep == DraftStep.DECIDE) {
            if (choice == 0) {
                this.proceedSelectHouseCard(house);
                return;
            } else {
                this.proceedChooseInfluencePosition(house);
                return;
            }
        } else if (this.draftStep == DraftStep.INFLUENCE_TRACK) {
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
        } else {
            throw new Error("Invalid DraftStep received");
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        house.houseCards.set(houseCard.id, houseCard);
        this.game.houseCardsForDrafting.delete(houseCard.id);

        this.entireGame.broadcastToClients({
            type: "update-house-cards",
            house: house.id,
            houseCards: house.houseCards.values.map(hc => hc.serializeToClient())
        });

        this.entireGame.broadcastToClients({
            type: "update-house-cards-for-drafting",
            houseCards: this.game.houseCardsForDrafting.values.map(hc => hc.serializeToClient())
        });

        this.ingame.log({
            type: "house-card-picked",
            house: house.id,
            houseCard: houseCard.id
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
            this.draftStep = message.draftStep;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDraftHouseCardsGameState {
        return {
            type: "draft-house-cards",
            houses: this.houses.map(h => h.id),
            draftOrder: this.draftOrder,
            draftStep: this.draftStep,
            vassalsOnInfluenceTracks: this.vassalsOnInfluenceTracks.map(track => track.map(h => h.id)),
            currentRowIndex: this.currentRowIndex,
            currentColumnIndex: this.currentColumnIndex,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedDraftHouseCardsGameState): DraftHouseCardsGameState {
        const draftHouseCardsGameState = new DraftHouseCardsGameState(ingameGameState);

        draftHouseCardsGameState.houses = data.houses.map(hid => ingameGameState.game.houses.get(hid));
        draftHouseCardsGameState.draftOrder = data.draftOrder;
        draftHouseCardsGameState.draftStep = data.draftStep;
        draftHouseCardsGameState.vassalsOnInfluenceTracks = data.vassalsOnInfluenceTracks.map(track => track.map(hid => ingameGameState.game.houses.get(hid)));
        draftHouseCardsGameState.currentRowIndex = data.currentRowIndex;
        draftHouseCardsGameState.currentColumnIndex = data.currentColumnIndex;
        draftHouseCardsGameState.childGameState = draftHouseCardsGameState.deserializeChildGameState(data.childGameState);

        return draftHouseCardsGameState;
    }

    deserializeChildGameState(data: SerializedDraftHouseCardsGameState["childGameState"]): DraftHouseCardsGameState["childGameState"] {
        if (data.type == "select-house-card") {
            return SelectHouseCardGameState.deserializeFromServer(this, data);
        } else if (data.type == "simple-choice") {
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

export interface SerializedDraftHouseCardsGameState {
    type: "draft-house-cards";
    houses: string[];
    draftOrder: number[][];
    draftStep: DraftStep;
    vassalsOnInfluenceTracks: string[][];
    currentRowIndex: number;
    currentColumnIndex: number;
    childGameState: SerializedSelectHouseCardGameState | SerializedSimpleChoiceGameState;
}
