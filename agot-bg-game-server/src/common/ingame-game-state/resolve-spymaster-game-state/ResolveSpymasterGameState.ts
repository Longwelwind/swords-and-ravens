import GameState from "../../GameState";
import Game from "../game-data-structure/Game";
import House from "../game-data-structure/House";
import {ServerMessage} from "../../../messages/ServerMessage";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";
import WesterosCard from "../game-data-structure/westeros-card/WesterosCard";

interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;

    onResolveSpymasterFinish(house: House, westerosDeckId: number, westerosCardsForTopOfDeck: WesterosCard[], westerosCardsForBottomOfDeck: WesterosCard[]): void;
}

export default class ResolveSpymasterGameState<P extends ParentGameState> extends GameState<P> {
    house: House;
    deckId: number;
    westerosCards: WesterosCard[];

    firstStart(house: House, deckId: number, westerosCards: WesterosCard[]): void {
        this.house = house;
        this.deckId = deckId;
        this.westerosCards = westerosCards;

        if (this.westerosCards.length == 0 || this.westerosCards.length > 2 || this.westerosCards.some(wc => wc.discarded)) {
            throw new Error("ResolveSpymasterGameState expects a minimum of 1 and a maximum of 2 available Westeros cards!");
        }

        if (this.westerosCards.length == 1) {
            this.parentGameState.onResolveSpymasterFinish(this.house, this.deckId, this.westerosCards, []);
        }
    }

    sendResolve(westerosCardsForTopOfDeck: WesterosCard[], westerosCardsForBottomOfDeck: WesterosCard[]): void {
        this.parentGameState.entireGame.sendMessageToServer({
            type: "resolve-spymaster",
            westerosCardIdsForTopOfDeck: westerosCardsForTopOfDeck.map(wc => wc.id),
            westerosCardIdsForBottomOfDeck: westerosCardsForBottomOfDeck.map(wc => wc.id)
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "resolve-spymaster") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const westerosCardsForTopOfDeck = message.westerosCardIdsForTopOfDeck.map(wcid => this.parentGameState.game.getWesterosCardById(wcid, this.deckId));
            const westerosCardsForBottomOfDeck = message.westerosCardIdsForBottomOfDeck.map(wcid => this.parentGameState.game.getWesterosCardById(wcid, this.deckId));

            const concatenated = westerosCardsForTopOfDeck.concat(westerosCardsForBottomOfDeck);

            if (concatenated.length != 2 || concatenated.some(wc => wc.discarded || !this.westerosCards.includes(wc))) {
                return;
            }

            this.parentGameState.onResolveSpymasterFinish(this.house, this.deckId, westerosCardsForTopOfDeck, westerosCardsForBottomOfDeck);
        }
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedResolveSpymasterGameState {
        return {
            type: "resolve-spymaster",
            deckId: this.deckId,
            house: this.house.id,
            westerosCards: this.westerosCards.map(wc => wc.id)
        };
    }

    static deserializeFromServer<P extends ParentGameState>(parent: P, data: SerializedResolveSpymasterGameState): ResolveSpymasterGameState<P> {
        const gameState = new ResolveSpymasterGameState(parent);

        gameState.house = parent.game.houses.get(data.house);
        gameState.deckId = data.deckId;
        gameState.westerosCards = data.westerosCards.map(wcid => parent.game.getWesterosCardById(wcid, data.deckId));

        return gameState;
    }
}

export interface SerializedResolveSpymasterGameState {
    type: "resolve-spymaster";
    house: string;
    deckId: number;
    westerosCards: number[];
}
