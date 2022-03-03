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
import { observable } from "mobx";

export default class ThematicDraftHouseCardsGameState extends GameState<IngameGameState> {
    @observable readyHouses: House[];
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
        return this.game.nonVassalHouses;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(): void {
        this.ingame.log({
            type: "draft-house-cards-began"
        });

        this.readyHouses = [];

        // Don't draft influence positions anymore but keep "vassalsOnInfluenceTracks" and
        // DraftInfluencePositionsGameState as possible Ingame child to not crash running drafts.
        // Todo: Remove this in 3 months
        this.vassalsOnInfluenceTracks = [];
    }

    getFilteredHouseCardsForHouse(house: House): HouseCard[] {
        if (!this.participatingHouses.includes(house)) {
            throw new Error("getFilteredHouseCardsForHouse() called for a vassal house!");
        }

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
        return _.without(this.participatingHouses, ...this.readyHouses).map(h => this.ingame.getControllerOfHouse(h));
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

            player.user.send({
                type: "update-house-cards",
                house: house.id,
                houseCards: house.houseCards.values.map(hc => hc.serializeToClient())
            });

            player.user.send({
                type: "update-house-cards-for-drafting",
                houseCards: this.game.houseCardsForDrafting.values.filter(hc => hc.houseId == house.id).map(hc => hc.serializeToClient())
            });

            if (house.houseCards.size == 7) {
                this.readyHouses.push(house);
                this.entireGame.broadcastToClients({
                    type: "player-ready",
                    userId: player.user.id
                });

                this.ingame.log({
                    type: "house-cards-chosen",
                    house: house.id
                });
            }

            if (this.participatingHouses.every(h => h.houseCards.size == 7)) {
                this.participatingHouses.forEach(h => {
                    this.entireGame.broadcastToClients({
                        type: "update-house-cards",
                        house: h.id,
                        houseCards: h.houseCards.values.map(hc => hc.serializeToClient())
                    });
                });
                this.ingame.onDraftingFinish();
            }
        }
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "player-ready") {
            const player = this.ingame.players.get(this.entireGame.users.get(message.userId));
            this.readyHouses.push(player.house);
        }
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedThematicDraftHouseCardsGameState {
        return {
            type: "thematic-draft-house-cards",
            readyHouses: this.readyHouses.map(h => h.id),
            vassalsOnInfluenceTracks: this.vassalsOnInfluenceTracks.map(track => track.map(h => h.id))
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedThematicDraftHouseCardsGameState): ThematicDraftHouseCardsGameState {
        const thematicDraftHouseCardsGameState = new ThematicDraftHouseCardsGameState(ingame);
        thematicDraftHouseCardsGameState.readyHouses = data.readyHouses.map(hid => ingame.game.houses.get(hid));
        thematicDraftHouseCardsGameState.vassalsOnInfluenceTracks = data.vassalsOnInfluenceTracks.map(track => track.map(hid => ingame.game.houses.get(hid)))
        return thematicDraftHouseCardsGameState;
    }
}

export interface SerializedThematicDraftHouseCardsGameState {
    type: "thematic-draft-house-cards";
    readyHouses: string[];
    vassalsOnInfluenceTracks: string[][];
}
