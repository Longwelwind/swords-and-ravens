import _ from "lodash";
import { observable } from "mobx";
import shuffleInPlace from "../../../utils/shuffleInPlace";
import Game from "./Game";
import House from "./House";
import LoanCard, { SerializedLoanCard } from "./loan-card/LoanCard";
import LoanCardType from "./loan-card/LoanCardType";

export default class IronBank {
    game: Game;
    @observable loanCardDeck: LoanCard[];
    @observable purchasedLoans: LoanCard[] = [];
    @observable loanSlots: (LoanCard | null)[] = [null, null, null];

    loanCosts = [7, 4, 1];

    get controllerOfBraavos(): House | null {
        const pentos = this.game.world.regions.tryGet("braavos", null);
        return pentos?.getController() ?? null;
    }

    constructor(game: Game) {
        this.game = game;
    }

    getLoanCostsForHouse(house: House): number[] {
        return house == this.controllerOfBraavos ? this.loanCosts.map(cost => cost - 1) : this.loanCosts;
    }

    drawNewLoanCard(): void {
        const drawnCard = this.loanCardDeck.shift();
        this.loanSlots.unshift(drawnCard ?? null);
        const removedFromSlots = this.loanSlots.pop();
        if (removedFromSlots) {
            removedFromSlots.discarded = true;
            this.loanCardDeck.push(removedFromSlots);
        }

        if (this.loanSlots.length != 3) {
            throw new Error();
        }

        if (_.concat(this.loanCardDeck, this.purchasedLoans, this.loanSlots.filter(lc => lc != null)).length != 12) {
            throw new Error();
        }

        this.sendUpdateLoanCards();
    }

    purchaseLoan(house: House, loanIndex: number, regionOfOrderId: string): LoanCardType | null{
        if (loanIndex >= this.loanSlots.length) {
            return null;
        }

        const loan = this.loanSlots[loanIndex];
        const costs = this.getLoanCostsForHouse(house)[loanIndex];
        if (!loan || house.powerTokens < costs) {
            return null;
        }

        this.game.ingame.changePowerTokens(house, -costs);

        loan.purchasedBy = house;
        this.purchasedLoans.push(loan);
        this.loanSlots[loanIndex] = null;

        this.game.ingame.log({
            type: "loan-purchased",
            house: house.id,
            loanType: loan.type.id,
            payed: costs,
            region: regionOfOrderId
        });

        this.sendUpdateLoanCards();

        return loan.type;
    }

    sendUpdateLoanCards(): void {
        this.game.ingame.entireGame.broadcastToClients({
            type: "update-loan-cards",
            loanCardDeck: shuffleInPlace(this.loanCardDeck.map(lc => (lc.serializeToClient()))),
            purchasedLoans: this.purchasedLoans.map(lc => lc.serializeToClient()),
            loanSlots: this.loanSlots.map(lc => lc?.serializeToClient() ?? null)
        });
    }

    serializeToClient(admin: boolean): SerializedIronBank {
        return {
            loanCardDeck: admin
                ? this.loanCardDeck.map(c => c.serializeToClient())
                : shuffleInPlace(this.loanCardDeck.map(c => c.serializeToClient())),
            loanSlots: this.loanSlots.map(c => c?.serializeToClient() ?? null),
            purchasedLoans: this.purchasedLoans.map(c => c.serializeToClient())
        };
    }

    static deserializeFromServer(game: Game, data: SerializedIronBank): IronBank {
        const ironBank = new IronBank(game);

        ironBank.loanCardDeck = data.loanCardDeck.map(c => LoanCard.deserializeFromServer(game, c));
        ironBank.purchasedLoans = data.purchasedLoans.map(c => LoanCard.deserializeFromServer(game, c));
        ironBank.loanSlots = data.loanSlots.map(c => c ? LoanCard.deserializeFromServer(game, c) : null);

        return ironBank;
    }
}

export interface SerializedIronBank {
    loanCardDeck: SerializedLoanCard[];
    purchasedLoans: SerializedLoanCard[];
    loanSlots: (SerializedLoanCard | null)[];
}