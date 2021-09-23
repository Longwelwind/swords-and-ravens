import shuffle from "../../../utils/shuffle";
import Game from "./Game";
import LoanCard, { SerializedLoanCard } from "./loan-card/LoanCard";

export default class IronBank {
    game: Game;
    loanCardDeck: LoanCard[];

    constructor(game: Game) {
        this.game = game;
    }

    serializeToClient(admin: boolean): SerializedIronBank {
        return {
            loanCardDeck: admin
                ? this.loanCardDeck.map(c => c.serializeToClient())
                : shuffle(this.loanCardDeck).map(c => c.serializeToClient())
        };
    }

    static deserializeFromServer(game: Game, data: SerializedIronBank): IronBank {
        const ironBank = new IronBank(game);

        ironBank.loanCardDeck = data.loanCardDeck.map(c => LoanCard.deserializeFromServer(game, c));

        return ironBank;
    }
}

export interface SerializedIronBank {
    loanCardDeck: SerializedLoanCard[];
}