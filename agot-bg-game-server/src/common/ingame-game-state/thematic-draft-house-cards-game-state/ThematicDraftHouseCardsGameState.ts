import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import EntireGame from "../../EntireGame";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import Game from "../game-data-structure/Game";
import HouseCard from "../game-data-structure/house-card/HouseCard";
import _ from "lodash";
import User from "../../../server/User";
import { houseCardCombatStrengthAllocations } from "../draft-house-cards-game-state/DraftHouseCardsGameState";

export default class ThematicDraftHouseCardsGameState extends GameState<IngameGameState> {
    vassalsOnInfluenceTracks: House[][];

    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    get participatingHouses(): House[] {
        return this.game.houses.values.filter(h => !this.ingame.isVassalHouse(h));
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(): void {
        this.ingame.log({
            type: "draft-house-cards-began"
        });

        this.vassalsOnInfluenceTracks = this.game.influenceTracks.map(track => [...track]);

        // Clear the influence tracks:
        for(let i=0; i<this.game.influenceTracks.length; i++) {
            this.game.influenceTracks[i].length = 0;
        }
    }

    getFilteredHouseCardsForHouse(house: House): HouseCard[] {
        let availableCards = _.sortBy(this.game.houseCardsForDrafting.values.filter(hc => hc.houseId == house.id), hc => -hc.combatStrength);
        house.houseCards.forEach(card => {
            const countOfCardsWithThisCombatStrength = house.houseCards.values.filter(hc => hc.combatStrength == card.combatStrength).length;
            if (houseCardCombatStrengthAllocations.get(card.combatStrength) == countOfCardsWithThisCombatStrength) {
                availableCards = availableCards.filter(hc => hc.combatStrength != card.combatStrength);
            }
        });

        return availableCards;
    }

    getNotReadyPlayers(): Player[] {
        return this.participatingHouses.filter(h => h.houseCards.size < 7).map(h => this.ingame.getControllerOfHouse(h));
    }

    getWaitedUsers(): User[] {
        return this.getNotReadyPlayers().map(p => p.user);
    }

    select(houseCard: HouseCard): void {
        this.entireGame.sendMessageToServer({
            type: "select-house-card",
            houseCard: houseCard.id
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-house-card") {
            const house = player.house;
            if (!this.participatingHouses.includes(house) || house.houseCards.size == 7) {
                return;
            }

            const houseCard = this.parentGameState.game.getHouseCardById(message.houseCard);

            if (!this.getFilteredHouseCardsForHouse(house).includes(houseCard)) {
                return;
            }

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

            if (this.participatingHouses.every(h => h.houseCards.size == 7)) {
                this.ingame.proceedDraftingInfluencePositions(this.vassalsOnInfluenceTracks);
            }
        }
    }

    onServerMessage(_message: ServerMessage): void {
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedThematicDraftHouseCardsGameState {
        return {
            type: "thematic-draft-house-cards",
            vassalsOnInfluenceTracks: this.vassalsOnInfluenceTracks.map(track => track.map(h => h.id))
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedThematicDraftHouseCardsGameState): ThematicDraftHouseCardsGameState {
        const thematicDraftHouseCardsGameState = new ThematicDraftHouseCardsGameState(ingameGameState);
        thematicDraftHouseCardsGameState.vassalsOnInfluenceTracks = data.vassalsOnInfluenceTracks.map(track => track.map(hid => ingameGameState.game.houses.get(hid)))
        return thematicDraftHouseCardsGameState;
    }
}

export interface SerializedThematicDraftHouseCardsGameState {
    type: "thematic-draft-house-cards";
    vassalsOnInfluenceTracks: string[][];
}
