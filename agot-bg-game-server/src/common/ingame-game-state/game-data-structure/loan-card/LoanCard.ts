import Game from "../Game";
import House from "../House";
import LoanCardType from "./LoanCardType";
import loanCardTypes from "./loanCardTypes";

export default class LoanCard {
    id: number;
    type: LoanCardType;
    purchasedBy: House | null;

    constructor(id: number, type: LoanCardType, purchasedBy: House | null = null) {
        this.id = id;
        this.type = type;
        this.purchasedBy = purchasedBy;
    }

    serializeToClient(): SerializedLoanCard {
        return {
            id: this.id,
            type: this.type.id,
            purchasedBy: this.purchasedBy?.id ?? null
        }
    }

    static deserializeFromServer(game: Game, data: SerializedLoanCard): LoanCard {
        return new LoanCard(data.id, loanCardTypes.get(data.type), data.purchasedBy ? game.houses.get(data.purchasedBy) : null);
    }
}

export interface SerializedLoanCard {
    id: number;
    type: string;
    purchasedBy: string | null;
}
