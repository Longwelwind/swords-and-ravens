import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import * as _ from "lodash";
import WesterosCard from "./WesterosCard";

export default class WinterIsComingWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        // Shuffle the deck
        const i = westerosGameState.currentCardI;
        const deck = _.shuffle(westerosGameState.game.westerosDecks[i]);

        // Reset discarded state
        deck.forEach(card => {card.discarded = false;});

        westerosGameState.game.westerosDecks[i] = deck;

        // Draw a new card from this deck
        const drawnCard = deck.shift() as WesterosCard;

        drawnCard.discarded = true;

        // Burry the card at the bottom of the deck
        deck.push(drawnCard);

        westerosGameState.ingame.log({
            type: "winter-is-coming",
            drawnCardType: drawnCard.type.id,
            deckIndex: i
        });

        westerosGameState.revealedCards[i] = drawnCard;
    }
}
