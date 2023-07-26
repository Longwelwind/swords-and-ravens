import GameState from "../../../../../GameState";
import House from "../../../../game-data-structure/House";
import Game from "../../../../game-data-structure/Game";
import ExecuteLoanGameState from "../ExecuteLoanGameState";
import IngameGameState from "../../../../IngameGameState";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../../simple-choice-game-state/SimpleChoiceGameState";
import { ServerMessage } from "../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import BetterMap from "../../../../../../utils/BetterMap";
import ResolveSpymasterGameState, { SerializedResolveSpymasterGameState } from "./resolve-spymaster-game-state/ResolveSpymasterGameState";
import WesterosCard from "../../../../../ingame-game-state/game-data-structure/westeros-card/WesterosCard";
import _ from "lodash";
import SnrError from "../../../../../../utils/snrError";

export default class SpymasterGameState extends GameState<ExecuteLoanGameState,
    SimpleChoiceGameState | ResolveSpymasterGameState<SpymasterGameState>> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get executeLoanGameState(): ExecuteLoanGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get choices(): BetterMap<string, number> {
        const choices = new BetterMap<string, number>();
        const deckNames = [ "First", "Second", "Third", "Fourth" ];
        for (let i = 0; i < this.game.westerosDecks.length; i++) {
            const deck = this.game.westerosDecks[i];
            if (deck.filter(wc => !wc.discarded).length > 0) {
                choices.set(deckNames[i], i);
            }
        }
        return choices;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, "Select a Westeros deck", this.choices.keys);
    }

    getTopTwoCardsOfDeck(deckId: number): WesterosCard[] {
        return _.take(this.game.westerosDecks[deckId].filter(wc => !wc.discarded), 2);
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        this.setChildGameState(new ResolveSpymasterGameState(this)).firstStart(house, this.choices.values[choice], this.getTopTwoCardsOfDeck(this.choices.values[choice]));
    }

    onResolveSpymasterFinish(house: House, westerosDeckId: number, westerosCardsForTopOfDeck: WesterosCard[], westerosCardsForBottomOfDeck: WesterosCard[]): void {
        const westerosDeck = this.game.westerosDecks[westerosDeckId];
        const topTwoCardsOfDeck = this.getTopTwoCardsOfDeck(westerosDeckId);

        const concatenatedForCheck = westerosCardsForTopOfDeck.concat(westerosCardsForBottomOfDeck);

        if(_.intersection(topTwoCardsOfDeck, concatenatedForCheck).length != topTwoCardsOfDeck.length) {
            throw new SnrError(this.entireGame, `Spymaster crashed due to an inconsistent deck ${westerosDeckId}!`);
        }

        const discardedCards = westerosDeck.filter(wc => wc.discarded);

        const availableCards = _.without(westerosDeck, ...discardedCards.concat(topTwoCardsOfDeck));

        const newWesterosDeck = _.concat(westerosCardsForTopOfDeck, availableCards, westerosCardsForBottomOfDeck, discardedCards);
        if (westerosDeck.length != newWesterosDeck.length) {
            throw new SnrError(this.entireGame, `Spymaster corrupted deck ${westerosDeckId}`);
        }
        this.game.westerosDecks[westerosDeckId] = newWesterosDeck;
        // Broadcast manipulated deck for "CoK Westeros Phase Variant"
        this.ingame.broadcastWesterosDecks();
        this.ingame.log({
            type: "spymaster-executed",
            house: house.id,
            westerosDeckI: westerosDeckId,
            westerosCardsCountForTopOfDeck: westerosCardsForTopOfDeck.length,
            westerosCardsCountForBottomOfDeck: westerosCardsForBottomOfDeck.length
        }, westerosCardsForTopOfDeck.length == 1);

        this.executeLoanGameState.onExecuteLoanFinish(house);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSpymasterGameState {
        return {
            type: "spymaster",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedSpymasterGameState): SpymasterGameState {
        const gameState = new SpymasterGameState(parent);

        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedSpymasterGameState["childGameState"]): SpymasterGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "resolve-spymaster":
                return ResolveSpymasterGameState.deserializeFromServer(this, data);
            default:
                throw new Error("Invalid child game state for Spymaster");
        }
    }
}

export interface SerializedSpymasterGameState {
    type: "spymaster";
    childGameState: SerializedSimpleChoiceGameState | SerializedResolveSpymasterGameState;
}
