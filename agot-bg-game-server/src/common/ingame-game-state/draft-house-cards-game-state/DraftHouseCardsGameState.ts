import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import EntireGame from "../../EntireGame";
//import {observable} from "mobx";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import BetterMap from "../../../utils/BetterMap";
import Game from "../game-data-structure/Game";
import SelectHouseCardGameState, { SerializedSelectHouseCardGameState } from "../select-house-card-game-state/SelectHouseCardGameState";
import HouseCard from "../game-data-structure/house-card/HouseCard";
import _ from "lodash";

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

export default class DraftHouseCardsGameState extends GameState<IngameGameState, SelectHouseCardGameState<DraftHouseCardsGameState>> {
    houses: House[];
    draftOrder: number[][];
    currentRowIndex: number;
    currentColumnIndex: number;

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
        this.proceedNextHouse();
    }

    proceedNextHouse(): void {
        const houseToResolve = this.getNextHouseToSelectHouseCard();

        if (houseToResolve == null) {
            this.game.houseCardsForDrafting = new BetterMap();
            this.ingame.onDraftHouseCardsGameStateFinish();
            return;
        }

        this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(houseToResolve, this.getFilteredHouseCardsForHouse(houseToResolve));
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

    getNextHouseToSelectHouseCard(): House | null {
        // If all houses have 7 house cards, return null
        if (this.houses.every(h => h.houseCards.size == 7)) {
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

        return this.houses[this.draftOrder[this.currentRowIndex][this.currentColumnIndex]];
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        house.houseCards.set(houseCard.id, houseCard);
        this.game.houseCardsForDrafting.delete(houseCard.id);

        this.entireGame.broadcastToClients({
            type: "update-house-cards",
            house: house.id,
            houseCards: house.houseCards.keys
        });

        this.entireGame.broadcastToClients({
            type: "update-house-cards-for-drafting",
            houseCards: this.game.houseCardsForDrafting.values.map(hc => hc.id)
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

    onServerMessage(_message: ServerMessage): void {
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDraftHouseCardsGameState {
        return {
            type: "draft-house-cards",
            houses: this.houses.map(h => h.id),
            draftOrder: this.draftOrder,
            currentRowIndex: this.currentRowIndex,
            currentColumnIndex: this.currentColumnIndex,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedDraftHouseCardsGameState): DraftHouseCardsGameState {
        const draftHouseCardsGameState = new DraftHouseCardsGameState(ingameGameState);

        draftHouseCardsGameState.houses = data.houses.map(hid => ingameGameState.game.houses.get(hid));
        draftHouseCardsGameState.draftOrder = data.draftOrder;
        draftHouseCardsGameState.currentRowIndex = data.currentRowIndex;
        draftHouseCardsGameState.currentColumnIndex = data.currentColumnIndex;
        draftHouseCardsGameState.childGameState = draftHouseCardsGameState.deserializeChildGameState(data.childGameState);

        return draftHouseCardsGameState;
    }

    deserializeChildGameState(data: SerializedDraftHouseCardsGameState["childGameState"]): SelectHouseCardGameState<DraftHouseCardsGameState> {
        if (data.type == "select-house-card") {
            return SelectHouseCardGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedDraftHouseCardsGameState {
    type: "draft-house-cards";
    houses: string[];
    draftOrder: number[][];
    currentRowIndex: number;
    currentColumnIndex: number;
    childGameState: SerializedSelectHouseCardGameState;
}
