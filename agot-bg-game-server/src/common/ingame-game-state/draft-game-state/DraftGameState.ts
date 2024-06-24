import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import Player from "../Player";
import DraftHouseCardsGameState, { SerializedDraftHouseCardsGameState } from "./draft-house-cards-game-state/DraftHouseCardsGameState";
import ThematicDraftHouseCardsGameState, { SerializedThematicDraftHouseCardsGameState } from "./thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";
import AgreeOnGameStartGameState, { SerializedAgreeOnGameStartGameState } from "./agree-on-game-start-game-state/AgreeOnGameStartGameState";
import DraftMapGameState, { SerializedDraftMapGameState } from "./draft-map-game-state/DraftMapGameState";
import { ServerMessage } from "../../../messages/ServerMessage";
import { ClientMessage } from "../../../messages/ClientMessage";
import Game from "../game-data-structure/Game";
import World from "../game-data-structure/World";
import EntireGame from "../../../common/EntireGame";
import House from "../game-data-structure/House";
import BetterMap from "../../../utils/BetterMap";
import popRandom from "../../../utils/popRandom";
import shuffleInPlace from "../../../utils/shuffleInPlace";
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
    ],
    [
        [0, 1, 2, 3, 4, 5, 6],
        [3, 6, 5, 4, 1, 2, 0],
        [2, 0, 6, 1, 5, 3, 4],
        [1, 4, 3, 0, 2, 6, 5],
        [6, 5, 4, 2, 0, 1, 3],
        [4, 3, 1, 5, 6, 0, 2],
        [5, 2, 0, 6, 3, 4, 1]
    ],
    [
        [0, 1, 2, 3, 4, 5, 6, 7],
        [4, 7, 6, 5, 3, 2, 1, 0],
        [3, 0, 1, 2, 5, 6, 7, 4],
        [2, 4, 5, 7, 6, 1, 0, 3],
        [6, 3, 7, 0, 1, 4, 5, 2],
        [5, 2, 4, 1, 7, 0, 3, 6],
        [1, 6, 3, 4, 0, 7, 2, 5],
        [7, 5, 0, 6, 2, 3, 4, 1]
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

export default class DraftGameState extends GameState<IngameGameState, DraftHouseCardsGameState
| ThematicDraftHouseCardsGameState | DraftMapGameState | AgreeOnGameStartGameState>
{
    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get participatingHouses(): House[] {
        return this.game.nonVassalHouses;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(): void {
        // In case of blind or random draft we want to assign the random house cards before drafting the map
        // to transmit the house cards with the game state change to IngameGameState
        if (this.isBlindOrRandom()) {
            this.assignRandomHouseCards();
        } else {
            this.proceedDraft();
        }
    }

    private isBlindOrRandom(): boolean {
        return this.entireGame.gameSettings.blindDraft || this.entireGame.gameSettings.randomDraft;
    }

    private proceedDraft(): void {
        if (this.entireGame.gameSettings.draftMap) {
            this.beginDraftMap();
        } else {
            this.beginDraftHouseCards();
        }
    }

    private beginDraftMap(): void {
        this.setChildGameState(new DraftMapGameState(this)).firstStart();
    }

    private beginDraftHouseCards(): void {
        if (this.isBlindOrRandom()) {
            this.onDraftHouseCardsGameStateEnd();
            return;
        }

        if (this.entireGame.gameSettings.thematicDraft) {
            this.setChildGameState(new ThematicDraftHouseCardsGameState(this)).firstStart();
        } else if (this.entireGame.gameSettings.draftHouseCards) {
            this.setChildGameState(new DraftHouseCardsGameState(this)).firstStart();
        }
    }

    private assignRandomHouseCards(): void {
        houseCardCombatStrengthAllocations.entries.forEach(([hcStrength, count]) => {
            for(let i=0; i<count; i++) {
                this.ingame.players.values.forEach(p => {
                    const house = p.house;
                    const availableCards = this.game.draftableHouseCards.values.filter(hc => hc.combatStrength == hcStrength);
                    const houseCard = popRandom(availableCards) as HouseCard;
                    house.houseCards.set(houseCard.id, houseCard);
                    this.game.draftableHouseCards.delete(houseCard.id);
                });
            }
        });

        this.game.draftableHouseCards.clear();

        do {
            this.ingame.setInfluenceTrack(0, this.getRandomInitialInfluenceTrack());
            this.ingame.setInfluenceTrack(1, this.getRandomInitialInfluenceTrack());
            // Move blade holder to bottom of kings court
            this.ingame.setInfluenceTrack(2, this.getRandomInitialInfluenceTrack(this.game.valyrianSteelBladeHolder));
        } while (this.hasAnyHouseTooMuchDominanceTokens());

        this.proceedDraft();
    }

    private hasAnyHouseTooMuchDominanceTokens(): boolean {
        const uniqDominanceHolders = _.uniq(this.game.influenceTracks.map(track => this.game.getTokenHolder(track)));

        switch (this.ingame.players.size) {
            case 0:
                throw new Error("Games with 0 players cannot start");
            case 1:
                // Ensure a single player can hold all 3 dominance tokens in a debug game:
                return false;
            case 2:
                // Ensure a player does not get all dominance tokens in 2p games
                // With Targaryen the other player can hold all 3 tokens.
                return this.game.targaryen ? uniqDominanceHolders.length != 1 : uniqDominanceHolders.length != 2;
            case 3:
                // Ensure every dominance token is held by another house
                // With Targaryen the other player can hold all 3 tokens.
                return this.game.targaryen ? uniqDominanceHolders.length != 2 : uniqDominanceHolders.length != 3;
            default:
                // Ensure every dominance token is held by another house
                return uniqDominanceHolders.length != 3;
        }
    }

    private getRandomInitialInfluenceTrack(moveToBottom: House | null = null): House[] {
        let track = shuffleInPlace(this.game.houses.values);

        if (moveToBottom) {
            track = _.without(track, moveToBottom);
            track.push(moveToBottom);
        }

        const playerHouses = this.ingame.players.values.map(p => p.house);
        const areVassalsInTopThreeSpaces = _.take(track, 3).some(h => !playerHouses.includes(h));

        if (areVassalsInTopThreeSpaces) {
            const vassals = track.filter(h => !playerHouses.includes(h));
            const newTrack = _.difference(track, vassals);
            newTrack.push(...vassals);
            return newTrack;
        }

        return track;
    }

    onDraftHouseCardsGameStateEnd(): void {
        this.ingame.onDraftGameStateEnd();
    }

    onDraftMapGameStateEnd(): void {
        this.game.draftMapRegionsPerHouse.clear();
        if (this.entireGame.gameSettings.draftHouseCards) {
            this.beginDraftHouseCards();
        } else {
            this.ingame.onDraftGameStateEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedDraftGameState {
        return {
            type: "draft",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    deserializeChildGameState(data: SerializedDraftGameState["childGameState"]): DraftGameState["childGameState"] {
        switch(data.type) {
            case "draft-house-cards":
                return DraftHouseCardsGameState.deserializeFromServer(this, data);
            case "thematic-draft-house-cards":
                return ThematicDraftHouseCardsGameState.deserializeFromServer(this, data);
            case "draft-map":
                return DraftMapGameState.deserializeFromServer(this, data);
            case "agree-on-game-start":
                return AgreeOnGameStartGameState.deserializeFromServer(this, data);
            default:
                throw new Error();
        }
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedDraftGameState): DraftGameState {
        const draft = new DraftGameState(ingame);
        draft.childGameState = draft.deserializeChildGameState(data.childGameState);
        return draft;
    }
}

export interface SerializedDraftGameState {
    type: "draft";
    childGameState: SerializedDraftHouseCardsGameState | SerializedThematicDraftHouseCardsGameState
        | SerializedDraftMapGameState | SerializedAgreeOnGameStartGameState
}
