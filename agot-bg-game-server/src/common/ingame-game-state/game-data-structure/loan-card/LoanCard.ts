import Game from "../Game";
import House from "../House";
import LoanCardType from "./LoanCardType";
import loanCardTypes from "./loanCardTypes";

export default class LoanCard {
    id: number;
    type: LoanCardType;
    purchasedBy: House | null;
    discarded: boolean;

    constructor(id: number, type: LoanCardType, purchasedBy: House | null = null, discarded = false) {
        this.id = id;
        this.type = type;
        this.purchasedBy = purchasedBy;
        this.discarded = discarded;
    }

    serializeToClient(): SerializedLoanCard {
        return {
            id: this.id,
            type: this.type.id,
            purchasedBy: this.purchasedBy?.id ?? null,
            discarded: this.discarded
        }
    }

    static deserializeFromServer(game: Game, data: SerializedLoanCard): LoanCard {
        return new LoanCard(data.id, loanCardTypes.get(data.type), data.purchasedBy ? game.houses.get(data.purchasedBy) : null, data.discarded);
    }
}

export interface SerializedLoanCard {
    id: number;
    type: string;
    purchasedBy: string | null;
    discarded: boolean;
}
