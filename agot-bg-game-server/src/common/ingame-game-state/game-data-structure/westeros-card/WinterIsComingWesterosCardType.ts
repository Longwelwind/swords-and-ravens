import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import WesterosCard from "./WesterosCard";
import shuffle from "../../../../utils/shuffle";
import { winterIsComing } from "./westerosCardTypes";

export default class WinterIsComingWesterosCardType extends WesterosCardType {
    executeImmediately(westerosGameState: WesterosGameState, currentDeckI: number): void {
        westerosGameState.ingame.log({
            type: "westeros-card-executed",
            westerosCardType: winterIsComing.id,
            westerosDeckI: currentDeckI
        });

        const deck = westerosGameState.game.westerosDecks[currentDeckI];

        // Reset discarded state
        deck.forEach(card => { card.discarded = false; });

        // Shuffle the deck
        shuffle(deck);

        // Draw a new card from this deck ...
        const newDrawnCard = deck.shift() as WesterosCard;

        // ... and burry it at the bottom of the deck
        deck.push(newDrawnCard);

        // Log the new drawn card
        westerosGameState.ingame.log({
            type: "winter-is-coming",
            drawnCardType: newDrawnCard.type.id,
            deckIndex: currentDeckI
        });

        // Discard the newDrawn card ...
        newDrawnCard.discarded = true;

        // Set new shuffled deck
        westerosGameState.game.westerosDecks[currentDeckI] = deck;

        // Set new revealed card
        westerosGameState.revealedCards[currentDeckI] = newDrawnCard;

        // Execute immediately effects
        newDrawnCard.type.executeImmediately(westerosGameState, currentDeckI);
    }

    execute(_: WesterosGameState): void {
        throw new Error("Winter is coming must only be executed immediately");
    }
}
