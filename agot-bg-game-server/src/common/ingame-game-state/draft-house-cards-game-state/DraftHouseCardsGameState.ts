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

export enum DraftDirection {
    FORWARD,
    BACKWARD
}

export default class DraftHouseCardsGameState extends GameState<IngameGameState, SelectHouseCardGameState<DraftHouseCardsGameState>> {
    draftOrder: House[];
    draftDirection: DraftDirection;
    currentHouseIndex: number;

    houseCardCombatStrengthAllocations = new BetterMap<number, number>(
    [
        [0, 1],
        [1, 2],
        [2, 2],
        [3, 1],
        [4, 1]
    ]);

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
        this.draftOrder = _.shuffle(this.ingame.players.values.map(p => p.house));
        this.currentHouseIndex = -1;

        this.proceedNextHouse();
    }

    proceedNextHouse(): void {
        const houseToResolve = this.getNextHouseToSelectHouseCard();

        if (houseToResolve == null) {
            this.ingame.onDraftHouseCardsGameStateFinish();
            return;
        }

        let availableCards = _.sortBy(this.game.houseCardsForDrafting.values, hc => -hc.combatStrength);
        houseToResolve.houseCards.forEach(card => {
            const countOfCardsWithThisCombatStrength = houseToResolve.houseCards.values.filter(hc => hc.combatStrength == card.combatStrength).length;
            if (this.houseCardCombatStrengthAllocations.get(card.combatStrength) == countOfCardsWithThisCombatStrength) {
                availableCards = availableCards.filter(hc => hc.combatStrength != card.combatStrength);
            }
        });
        this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(houseToResolve, availableCards);
    }

    getNextHouseToSelectHouseCard(): House | null {
        // If all houses have 7 house cards, return null
        if (this.draftOrder.every(h => h.houseCards.size == 7)) {
            return null;
        }

        if (this.draftDirection == DraftDirection.FORWARD) {
            this.currentHouseIndex ++;
        } else if (this.draftDirection == DraftDirection.BACKWARD) {
            this.currentHouseIndex --;
        }

        if (this.currentHouseIndex == -1) {
            // If we reach -1, the edge house 0 was the last active house.
            // So it's their turn again but we switch the direction
            this.currentHouseIndex = 0;
            this.draftDirection = DraftDirection.FORWARD;
        } else if (this.currentHouseIndex == this.draftOrder.length) {
            // Same here but the other way around
            this.currentHouseIndex = this.draftOrder.length - 1;
            this.draftDirection = DraftDirection.BACKWARD;
        }

        return this.draftOrder[this.currentHouseIndex];
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        house.houseCards.set(houseCard.id, houseCard);
        this.game.houseCardsForDrafting.delete(houseCard.id);

        this.entireGame.broadcastToClients({
            type: "update-house-cards",
            house: house.id,
            houseCards: house.houseCards.values.map(hc => hc.id)
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
            draftOrder: this.draftOrder.map(h => h.id),
            draftDirection: this.draftDirection,
            currentHouseIndex: this.currentHouseIndex,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedDraftHouseCardsGameState): DraftHouseCardsGameState {
        const draftHouseCardsGameState = new DraftHouseCardsGameState(ingameGameState);

        draftHouseCardsGameState.draftOrder = data.draftOrder.map(hid => ingameGameState.game.houses.get(hid));
        draftHouseCardsGameState.draftDirection = data.draftDirection;
        draftHouseCardsGameState.currentHouseIndex = data.currentHouseIndex;
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
    draftOrder: string[];
    draftDirection: DraftDirection;
    currentHouseIndex: number;
    childGameState: SerializedSelectHouseCardGameState;
}
