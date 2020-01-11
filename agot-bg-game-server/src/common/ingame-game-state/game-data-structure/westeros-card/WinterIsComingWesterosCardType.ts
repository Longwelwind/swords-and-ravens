import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import * as _ from "lodash";

export default class WinterIsComingWesterosCardType extends WesterosCardType {
    execute(westerosGameState: WesterosGameState): void {
        // Shuffle the deck
        const i = westerosGameState.currentCardI;
        const deck = _.shuffle(westerosGameState.game.westerosDecks[i]);
        westerosGameState.game.westerosDecks[i] = deck;

        // Draw a new card from this deck
        const drawnCard = deck[0];
        // Note: There is a contradiction between what is printed in the rules and the answer of FFG as pasted
        // here (https://boardgamegeek.com/thread/1001179/westeros-phase-winter-coming-and-wilding-marker).
        // The wildling icons on the newly drawn cards are _not_ added to the wildling threat. They can
        // then be safely ignored.

        westerosGameState.ingame.log({
            type: "winter-is-coming",
            drawnCardType: drawnCard.type.id
        });

        westerosGameState.revealedCards[i] = drawnCard;
        westerosGameState.executeCard(drawnCard);
    }
}
